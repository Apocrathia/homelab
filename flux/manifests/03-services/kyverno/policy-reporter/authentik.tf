# Policy Reporter's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# ADOPTION (blueprint-created objects, live and NOT in tofu state): the
# provider + application + admins binding are LIVE, minted by the retired
# authentik-blueprint-* ConfigMap — never in tofu state. This workspace
# ADOPTS them, no cleanup companion (every object adopts; the blueprint
# CM prunes away and the live objects survive for tofu to take over):
#   - the application import is UNGATED — authentik_application imports
#     by slug (a static literal, verified against provider 2026.8.0
#     source: CoreApplicationsRetrieve + d.SetId(res.Slug));
#   - every GENERATED id rides GATED import blocks on adoption variables,
#     default off: var.adoption (bool) + var.import_provider_pk (number)
#     + var.import_binding_admins_pk (string).
# Two-way plan-time gate: adoption=true with any id empty FAILS loudly;
# ids set with adoption=false FAILS loudly; defaults validate clean.
# Steady state (varmap absent): imports inert (resources already in
# state — tofu skips import blocks for in-state resources), plan reads No
# changes forever. The merge gate (MR body, recipe §8) injects the
# witness varmap once at merge, confirms "3 to import, 0 to add", then
# clears it. Witness ids are GATE-TIME ONLY — NEVER in git; if the state
# Secret is ever lost, re-run the gate with fresh ids from the live DB.
#
# OIDC mode: oauth2 provider + application + admins binding. NOT shared:
# no users binding resource (the users data source stays declared —
# module-shape parity). Standard openid/email/profile scopes only — no
# custom mappings. NO outpost (oidc apps run none).

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

# Admins-group binding source, order-10 parity with the retired blueprint.
# include_users=false keeps the group's member list out of the state
# Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

# Users-group binding source — module-shape parity: the module declares
# this data source ungated. policy-reporter is NOT shared (no users binding
# resource); unreferenced data sources are fine — tofu still reads and
# stores them.
data "authentik_group" "users" {
  name          = "users"
  include_users = false
}

# JWT signing key lookup (oidc mode) — the house self-signed certificate.
data "authentik_certificate_key_pair" "signing" {
  name = "authentik Self-signed Certificate"
}

# Standard scope mappings, looked up by scope_name (oidc mode) — the
# module's for_each form unrolled over this app's fixed scope list. No
# custom mappings.
data "authentik_property_mapping_provider_scope" "openid" {
  scope_name = "openid"
}

data "authentik_property_mapping_provider_scope" "email" {
  scope_name = "email"
}

data "authentik_property_mapping_provider_scope" "profile" {
  scope_name = "profile"
}

# ---------------------------------------------------------------------------
# ADOPTION VARIABLES — the generated-id import gate. Defaults (adoption
# false, ids empty) validate clean and leave the import blocks below
# inert. The ONLY setter is the merge-gate varmap (MR body, recipe §8):
# injected into the Workspace once, cleared after the adoption apply.
# The ids themselves NEVER appear in git.
# ---------------------------------------------------------------------------
variable "adoption" {
  description = "Merge-gate switch: adopt the live blueprint-created provider + binding into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  validation {
    condition     = !var.adoption || (var.import_provider_pk > 0 && var.import_binding_admins_pk != "")
    error_message = "ADOPTION GATE: adoption=true requires import_provider_pk and import_binding_admins_pk (witness ids from the gate varmap — gate-time only, never in git)."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition     = var.adoption || (var.import_provider_pk == 0 && var.import_binding_admins_pk == "")
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — clear the ids or set adoption=true."
  }
}

variable "import_provider_pk" {
  description = "Live authentik_provider_oauth2 pk for the gated import (provider 2026.8.0 imports providers by pk)."
  type        = number
  default     = 0
}

variable "import_binding_admins_pk" {
  description = "Live authentik_policy_binding admins uuid for the gated import (bindings import by pk)."
  type        = string
  default     = ""
}

# The OIDC provider — the LIVE blueprint-created provider ADOPTED into
# tofu state via the gated import block at the bottom of this file.
resource "authentik_provider_oauth2" "app" {
  name = "policy-reporter-oidc-provider"

  # No authentication_flow — the blueprint omits it too (Optional, no
  # TF default: null is never sent; authentik falls back to the default
  # authentication flow).
  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  # client_id is REQUIRED by the TF resource, and the live value is a
  # blueprint-minted credential: it is READ from the oidc-client-id
  # file the ProviderConfig materializes from the SAME 1Password-backed
  # Secret key the HelmRelease consumes (valuesFrom ->
  # kyverno-secrets/oidc-client-id) — the value NEVER appears in git, and tofu
  # and the app stay in lockstep on it. client_secret is never set here
  # (Sensitive, generated) — authentik mints it server-side and the
  # operator copy lives in the vault.
  client_id = trimspace(file("oidc-client-id"))

  client_type                = "confidential"
  sub_mode                   = "user_email"
  include_claims_in_id_token = true
  issuer_mode                = "per_provider"
  signing_key                = data.authentik_certificate_key_pair.signing.id

  # Standard scopes (openid/email/profile lookups) — blueprint parity.
  property_mappings = [
    data.authentik_property_mapping_provider_scope.openid.id,
    data.authentik_property_mapping_provider_scope.email.id,
    data.authentik_property_mapping_provider_scope.profile.id,
  ]

  allowed_redirect_uris = [
    {
      url           = "https://kyverno.gateway.services.apocrathia.com/callback"
      matching_mode = "strict"
    }
  ]

  access_code_validity   = "minutes=1"
  # hours=8 — the only non-minutes=5 oidc app in this
  # wave (blueprint-declared, live matches). Always sent explicitly: the
  # TF schema default is minutes=10.
  access_token_validity  = "hours=8"
  refresh_token_validity = "days=30"

  # grant_types REPRODUCES LIVE (witness sheet, live-attrs block): the
  # blueprint did NOT declare grant_types, so authentik kept its FULL
  # default set — the live row carries all seven, verbatim here. The value
  # is pinned so no first apply can ever PATCH the row.
  grant_types = [
    "authorization_code",
    "hybrid",
    "implicit",
    "client_credentials",
    "password",
    "urn:ietf:params:oauth:grant-type:device_code",
    "refresh_token",
  ]
}

# Application — blueprint parity. protocol_provider replaces the
# blueprint's provider FK.
#
# token_validity (blueprint days=30) is dead in authentik 2026.8 (no
# column, not expressible in provider 2026.8.0) — omitted.
resource "authentik_application" "app" {
  name            = "Policy Reporter"
  slug            = "policy-reporter"
  group           = "Platform"
  meta_launch_url = "https://kyverno.gateway.services.apocrathia.com"
  open_in_new_tab = true

  # Optional metadata: null = attribute omitted — the config must not
  # invent values (live rows verified field-by-field in the witness
  # sheet).
  meta_icon        = "https://icons.gateway.services.apocrathia.com/policy-reporter.svg"
  meta_description = "Monitoring and observability tool for PolicyReport CRDs"
  meta_publisher   = "Kyverno"

  protocol_provider = authentik_provider_oauth2.app.id
}

# IMMEDIATELY after the application: an application without policies is
# open to ALL authenticated users until this binding lands. Order-10
# parity with the retired blueprint. No count: the binding always
# exists, so its state address carries no [0] index.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. The application import is UNGATED — the slug is a
# static literal (authentik_application imports by slug). The provider
# and binding ids are GENERATED (pk/uuid), so they ride the adoption
# variables above: default off, inert while the resources are in state
# (tofu skips import blocks for in-state resources), armed once at the
# merge gate by the witness varmap and back off after. The witness ids
# NEVER appear in git — the varmap payload lives in the MR recipe only.
# ---------------------------------------------------------------------------
import {
  to = authentik_application.app
  id = "policy-reporter"
}

import {
  to = authentik_provider_oauth2.app
  id = tostring(var.import_provider_pk)
}

import {
  to = authentik_policy_binding.admins
  id = var.import_binding_admins_pk
}
