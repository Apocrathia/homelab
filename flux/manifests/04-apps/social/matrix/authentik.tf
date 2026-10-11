# matrix's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# FRESH CREATE — matrix has NO live tfstate Secret: nothing in authentik
# has been applied for this app yet. No import blocks, no adoption, no
# address-parity constraints (the headlamp/chaos-mesh parity comments are
# for migrated apps; this file is the blip side of that coin). The
# resources below are UNGATED — no count-conditional module gating; this
# file IS matrix's stack, and the first sync creates everything.
#
# OIDC mode: oauth2 provider + application + admins binding. NOT shared:
# admins-only binding (no users binding resource — and no users data
# source: the module declares it ungated for migrated-state parity, which
# fresh matrix has no use for) — the Matrix access gate; friends arrive
# via federation later, not tailnet SSO.

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
# three flows with every install, so they pre-exist any apply.
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

# JWT signing key lookup — the house self-signed certificate (oidc mode).
data "authentik_certificate_key_pair" "signing" {
  name = "authentik Self-signed Certificate"
}

# Standard scope mappings, looked up by scope_name (oidc mode). The
# module uses a for_each over var.scopes; inline, the three lookups are
# explicit — MAS consumes authentik's stock claim set (preferred_username /
# name / email), no custom mappings.
data "authentik_property_mapping_provider_scope" "openid" {
  scope_name = "openid"
}

data "authentik_property_mapping_provider_scope" "email" {
  scope_name = "email"
}

data "authentik_property_mapping_provider_scope" "profile" {
  scope_name = "profile"
}

# OIDC provider — the module's oidc-mode shape, ungated (fresh create:
# no state addresses to preserve, so no count). MAS is the OAuth2 client
# of this provider.
resource "authentik_provider_oauth2" "app" {
  name = "matrix-oidc-provider"

  # No authentication_flow — module oidc-mode parity (the chart blueprint
  # omits it too): authentik falls back to the default authentication flow.
  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  # client_id is required by the TF resource (the blueprint
  # auto-generated it when unset); fresh create uses the deterministic
  # house convention (the app name). client_secret is never set here
  # (Sensitive) — authentik generates it server-side; the operator copies
  # it from the Authentik UI into the matrix-secrets 1Password item after
  # the first sync.
  client_id = "matrix"

  client_type                = "confidential"
  sub_mode                   = "user_username"
  include_claims_in_id_token = true
  issuer_mode                = "per_provider"
  signing_key                = data.authentik_certificate_key_pair.signing.id

  # Standard scopes (scope_name lookups), concatenated in the
  # var.scopes order (openid, email, profile).
  property_mappings = [
    data.authentik_property_mapping_provider_scope.openid.id,
    data.authentik_property_mapping_provider_scope.email.id,
    data.authentik_property_mapping_provider_scope.profile.id,
  ]

  # TF field name is allowed_redirect_uris (the blueprint-era
  # redirect_uris). The ULID in the callback path is MAS's provider id —
  # config/mas-config.yaml upstream_oauth2 pins the same value; keep the
  # two in lockstep.
  allowed_redirect_uris = [
    {
      url           = "https://matrix.gateway.services.apocrathia.com/upstream/callback/01M4M3KRKC5A5BWMTGAXXRGYEP"
      matching_mode = "strict"
    }
  ]

  access_code_validity   = "minutes=1"
  access_token_validity  = "minutes=5"
  refresh_token_validity = "days=30"

  # grant_types is TF-Computed — never sent by tofu; the API default on
  # POST covers the authentik 2026.5+ empty-grant-types trap.
}

# Application — the module's application shape. protocol_provider
# replaces the blueprint's provider FK.
resource "authentik_application" "app" {
  name            = "Matrix"
  slug            = "matrix"
  group           = "Social"
  meta_launch_url = "https://matrix.gateway.services.apocrathia.com/"
  open_in_new_tab = true

  # Optional metadata: null = attribute omitted — the config must not
  # invent values.
  meta_icon        = "https://gitlab.com/Apocrathia/homelab/-/raw/main/flux/manifests/04-apps/social/matrix/icon.svg"
  meta_description = "Matrix homeserver (Synapse) with SSO via Matrix Authentication Service"
  meta_publisher   = "Matrix"

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
