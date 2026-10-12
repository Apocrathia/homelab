# jellyfin's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# ADOPTION CONSUMER (the komga gate recipe, applied to the file pair): the
# live objects — blueprint-created — are NOT in any tofu state, and the
# import blocks below adopt them IN PLACE at gate time: no companion
# deletes, no deletion window, uuids intact, nobody re-logs in. The
# application imports by slug (a name — safe in git, static-ungated);
# every generated id rides the gated adoption variables (default off),
# injected into the rendered Workspace before first apply (gate recipe §8:
# the object is born with the varmap) — NEVER in
# git. Steady state post-gate: varmap absent -> adoption vars default off
# -> gated imports inert -> plan No changes forever (komga-proven
# mechanism). If the state Secret is ever lost, re-adopt via the same
# gated imports (ids from the live DB).
#
# Shape: oidc, shared — admins + users bindings (verified live
# 2026-10-12). Tile deep-links to the SSO start URL.


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
  # duplicate create set — the steady bar dies right there.
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

# --- adoption gate (gate-time varmap ONLY — ids NEVER in git) -----------
#
# The flip adopts the live blueprint-created objects in place via the
# import blocks at the bottom of this file. The application imports BY
# SLUG (static, ungated — a name, not a generated id); every generated
# id rides these variables, injected into the RENDERED Workspace before
# first apply (.scratch/oidc-adopt-gate-recipe.md §8 step 3, Flux
# suspended — the object is born with the varmap). The defaults keep the gated imports inert: steady
# state (post-gate, varmap absent) reads No changes forever —
# komga-proven. Empty id with adoption=true fails plan-time validation
# loudly instead of silently skipping into a duplicate create; ids
# without adoption fail too (module-contract parity:
# terraform/modules/authentik-app/variables.tf).

variable "adoption" {
  type        = bool
  description = "Adopt the live blueprint-era objects in place via the gated import blocks instead of creating fresh ones. Gate-time varmap injection only - never git. Default false keeps every gated import inert (plan: No changes)."
  default     = false
  validation {
    condition = !var.adoption || (
      var.import_provider_pk != "" &&
      var.import_binding_admins_pk != "" &&
      var.import_binding_users_pk != ""
    )
    error_message = "adoption=true requires every live import id for jellyfin's shape (the provider pk, the admins binding pk, the users binding pk). Empty id = tofu silently skips the import and plans a duplicate create."
  }
  validation {
    condition = var.adoption || (
      var.import_provider_pk == "" &&
      var.import_binding_admins_pk == "" &&
      var.import_binding_users_pk == ""
    )
    error_message = "import ids set but adoption=false - either set adoption: true (adopt) or clear the ids (blip)."
  }
}

variable "import_provider_pk" {
  type        = string
  description = "Live pk of the OAuth2 provider to adopt (gate-time varmap only - never git)."
  default     = ""
}

variable "import_binding_admins_pk" {
  type        = string
  description = "Live pk of the admins policy binding to adopt (gate-time varmap only - never git)."
  default     = ""
}

variable "import_binding_users_pk" {
  type        = string
  description = "Live pk of the users policy binding to adopt (gate-time varmap only - never git)."
  default     = ""
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

# Users-group binding source — the shared tier (order 20 in the chart
# blueprint; friends reach the app over the tailnet door).
# Same include_users=false state-hygiene rationale as admins.
data "authentik_group" "users" {
  name          = "users"
  include_users = false
}

# JWT signing key lookup — the blueprint-era default key ("authentik
# Self-signed Certificate", verified in the authentik DB 2026-10-12).
data "authentik_certificate_key_pair" "signing" {
  name = "authentik Self-signed Certificate"
}

# Standard scope mappings, looked up by scope_name.
data "authentik_property_mapping_provider_scope" "standard" {
  for_each   = toset(["openid", "email", "profile"])
  scope_name = each.value
}

# OAuth2 provider — chart-blueprint parity on every attribute (verified
# live in the authentik DB 2026-10-12). No authentication_flow: the
# chart blueprint omitted it too (Optional, no TF default — null is
# never sent, the live value is preserved).
resource "authentik_provider_oauth2" "app" {
  name               = "jellyfin-oidc-provider"
  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  # The TF resource requires client_id (the blueprint auto-generated it
  # when unset). Read in-workdir: the ProviderConfig's second credentials
  # entry materializes the jellyfin-secrets key oidc-client-id as this file —
  # the chart lane's valuesFrom carrier retired with the flip. Adopt: the
  # import preserves the LIVE client_id, so this file must carry the same
  # value the app already uses. client_secret is never set here
  # (Sensitive, generated) — imports preserve live secrets.
  client_id = trimspace(file("oidc-client-id"))

  client_type                = "confidential"
  sub_mode                   = "user_username"
  include_claims_in_id_token = true
  issuer_mode                = "per_provider"
  signing_key                = data.authentik_certificate_key_pair.signing.id

  # Standard scope lookups; custom scope_names shadow
  # the same-scope_name standard lookups (chart blueprint parity).
  property_mappings = [for s in data.authentik_property_mapping_provider_scope.standard : s.id]

  # TF field name is allowed_redirect_uris (the blueprint's redirect_uris).
  allowed_redirect_uris = [
    { url = "https://jellyfin.gateway.services.apocrathia.com/sso/OID/redirect/Authentik", matching_mode = "strict" },
    { url = "https://jellyfin.gateway.services.apocrathia.com/sso/OID/r/Authentik", matching_mode = "strict" }
  ]

  # ALWAYS sent explicitly: the TF resource default (minutes=10) would PATCH
  # live rows on the first apply. These are the chart/blueprint values the
  # live rows live at (DB-verified 2026-10-12).
  access_code_validity   = "minutes=1"
  access_token_validity  = "minutes=5"
  refresh_token_validity = "days=30"

  # grant_types is TF-Computed — never sent by tofu; the API default on
  # POST/PATCH covers the authentik 2026.5+ empty-grant-types trap.
}

# Application — chart-blueprint parity (attrs verified live in the
# authentik DB 2026-10-12). protocol_provider replaces the blueprint's
# provider FK.
resource "authentik_application" "app" {
  name            = "Jellyfin"
  slug            = "jellyfin"
  group           = "Media"
  meta_launch_url = "https://jellyfin.gateway.services.apocrathia.com/sso/OID/start/Authentik"
  open_in_new_tab = true

  # Optional metadata: null = attribute omitted — live DB rows are NULL
  # for many apps; the config must not invent values.
  meta_icon = "https://gitlab.com/Apocrathia/homelab/-/raw/main/flux/manifests/04-apps/media/servers/jellyfin/icon.svg"
}

# IMMEDIATELY after the application: an app without policies is open to
# ALL authenticated users until this binding lands. The window is
# intra-apply (seconds, single apply) — chaos-mesh/demo-app precedent.
# Order-10 parity with the chart blueprint.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# Order-20 parity: the users binding IS the shared tag — friends reach the
# app through the tailnet door. Live DB carries both bindings.
resource "authentik_policy_binding" "users" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.users.id
  order  = 20
}

# --- adoption imports --------------------------------------------------------
#
# Import blocks are legal only in the root module, which this file is.
# The application import is static-ungated: applications import BY SLUG
# and the slug is a name, not a generated id — safe in git (module
# precedent: terraform/modules/authentik-app/imports.tf:22-25). Every
# generated id (provider pk, binding pks) rides the gated adoption vars
# above — never git. After the gate apply the imports go INERT (tofu
# treats the objects as plain managed state) and stay forever.

import {
  to = authentik_application.app
  id = "jellyfin"
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_provider_oauth2.app
  id       = var.import_provider_pk
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_policy_binding.admins
  id       = var.import_binding_admins_pk
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_policy_binding.users
  id       = var.import_binding_users_pk
}
