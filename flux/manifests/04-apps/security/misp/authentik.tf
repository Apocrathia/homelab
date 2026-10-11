# MISP's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# FRESH CREATE (nothing live): the MR is unmerged — the first apply
# creates every Authentik object fresh, so there are no import blocks and
# no adoption ids. The first plan after merge MUST read as a clean
# create-set. If the tfstate Secret is ever lost after that, re-adopt via
# manual tofu import (ids from the live DB) — never a blip.
#
# OIDC mode: oauth2 provider + custom scope mapping + application + admins
# binding. NOT shared: no users binding resource (the module's users data
# source stays declared — module-shape parity).

terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.0"
    }
  }

  # PARTIAL backend (the module's versions.tf shape): the per-app args
  # (secret_suffix/namespace/in_cluster_config) come from the ProviderConfig
  # spec.backendFile — the provider writes them to crossplane.remote.tfbackend
  # and passes them via -backend-config at tofu init. The empty block MUST
  # stay: -backend-config without a backend block falls back to the LOCAL
  # backend (warning only), which reads an EMPTY state and plans a full
  # duplicate create set.
  backend "kubernetes" {}
}

provider "authentik" {
  # House convention for in-cluster Authentik consumers (kagent, the
  # tak LDAP outpost, the kube-apiserver OIDC issuer): the public
  # gateway hostname. The provider appends /api/v3 itself.
  url = "https://auth.gateway.services.apocrathia.com"

  # Token file written by the ProviderConfig credentials array.
  token = file("authentik-token")
}

# Blueprint !Find lookups become data sources. authentik ships these
# three flows with every install, so they pre-exist any apply. The
# authentication flow is unused in oidc mode (the module declares it
# ungated — module-shape parity); unreferenced data sources are fine —
# tofu still reads and stores them.
data "authentik_flow" "provider-authorization" {
  slug = "default-provider-authorization-implicit-consent"
}

data "authentik_flow" "invalidation" {
  slug = "default-invalidation-flow"
}

data "authentik_flow" "authentication" {
  slug = "default-authentication-flow"
}

# Admins-group binding source, order-10 parity with the chart blueprint.
# include_users=false keeps the group's member list out of the state
# Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

# Users-group binding source — module-shape parity: the module declares
# this data source ungated. MISP is NOT shared (no users binding
# resource); unreferenced data sources are fine — tofu still reads and
# stores them.
data "authentik_group" "users" {
  name          = "users"
  include_users = false
}

# JWT signing key lookup (oidc mode).
data "authentik_certificate_key_pair" "signing" {
  name = "authentik Self-signed Certificate"
}

# Standard scope mappings, looked up by scope_name (oidc mode) — the
# module's for_each form unrolled over MISP's fixed scope list. Custom
# mappings below shadow same-scope_name lookups; roles is not a standard
# scope, so nothing collides here.
data "authentik_property_mapping_provider_scope" "openid" {
  scope_name = "openid"
}

data "authentik_property_mapping_provider_scope" "email" {
  scope_name = "email"
}

data "authentik_property_mapping_provider_scope" "profile" {
  scope_name = "profile"
}

# The MISP `roles` claim — hand-written resource (the module's for_each
# form unrolled for MISP's single mapping), ported VERBATIM from the
# chart-blueprint era varmap it replaces: the authentik `admins` group
# emits misp-admin, and the HelmRelease oidcRolesMapping maps it to MISP
# role id 1 (site admin); oidcScopes requests the custom `roles` scope
# (research §1.6 step 2, house pattern: the kube-auth `groups` scope
# mapping).
resource "authentik_property_mapping_provider_scope" "misp-roles" {
  name        = "MISP Roles"
  scope_name  = "roles"
  description = "MISP role claim: authentik admins group -> misp-admin"
  expression = <<EOF
roles = []
for group in user.ak_groups.all():
    if group.name == "admins":
        roles.append("misp-admin")
return {"roles": roles}
EOF
}

# The OIDC provider — MISP's native OidcAuth core plugin client (the
# module's count=1 form unrolled: nothing is live, no module-era state
# address to preserve).
resource "authentik_provider_oauth2" "app" {
  name = "misp-oidc-provider"

  # No authentication_flow — the chart blueprint omits it too (Optional,
  # no TF default: null is never sent).
  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  # Short public identifier, pinned inline (the module's variable form
  # flattened): the HelmRelease names it statically (OIDC_CLIENT_ID=misp),
  # so the first-boot handshake needs it deterministic. client_secret is
  # never set here (Sensitive, generated) — authentik mints it
  # server-side and the operator copies it into the vault post-merge.
  client_id = "misp"

  client_type                = "confidential"
  sub_mode                   = "user_email"
  include_claims_in_id_token = true
  issuer_mode                = "per_provider"
  signing_key                = data.authentik_certificate_key_pair.signing.id

  # Standard scopes (openid/email/profile lookups) + the custom roles
  # mapping, the module's concat order (chart blueprint parity).
  property_mappings = concat(
    [
      data.authentik_property_mapping_provider_scope.openid.id,
      data.authentik_property_mapping_provider_scope.email.id,
      data.authentik_property_mapping_provider_scope.profile.id,
    ],
    [authentik_property_mapping_provider_scope.misp-roles.id]
  )

  # OidcAuth setRedirectURL(MISP.baseurl + '/users/login') — the plugin
  # hardcodes the callback on the login route (plugin source, research
  # §1.6).
  allowed_redirect_uris = [
    {
      url           = "https://misp.gateway.services.apocrathia.com/users/login"
      matching_mode = "strict"
    }
  ]

  access_code_validity   = "minutes=1"
  access_token_validity  = "minutes=5"
  refresh_token_validity = "days=30"

  # grant_types is TF-Computed — never sent by tofu; the API default on
  # POST/PATCH covers the authentik 2026.5+ empty-grant-types trap.
  # token_validity (blueprint days=30) is NOT expressible in provider
  # 2026.8.0 — unmanaged; the fresh create takes the authentik API
  # default.
}

# Application tile — chart-blueprint parity. protocol_provider replaces
# the blueprint's provider FK.
resource "authentik_application" "app" {
  name            = "MISP"
  slug            = "misp"
  group           = "Security"
  meta_launch_url = "https://misp.gateway.services.apocrathia.com"
  open_in_new_tab = true

  # Dashboard metadata — the blueprint-era values.
  meta_icon        = "https://gitlab.com/Apocrathia/homelab/-/raw/main/flux/manifests/04-apps/security/misp/icon.svg"
  meta_description = "MISP threat intelligence sharing platform - IOCs, feeds, and event data"
  meta_publisher   = "CIRCL"

  protocol_provider = authentik_provider_oauth2.app.id
}

# IMMEDIATELY after the application: an application without policies is
# open to ALL authenticated users until this binding lands. Order-10
# parity with the chart blueprint. No count: the binding always exists,
# so its state address carries no [0] index.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}
