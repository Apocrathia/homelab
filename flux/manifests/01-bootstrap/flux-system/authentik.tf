# flux-operator's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# ADOPTION (not fresh create, no prior tofu state): the live objects are
# BLUEPRINT-CREATED (the retired authentik-blueprint-flux-operator
# ConfigMap) and this workspace takes them over via the import blocks at
# the bottom of this file — uuids intact, no recreate, nobody re-logs
# in. DUAL shape (extends the single-app pair template to two
# applications):
#   - outer proxy gate: proxy provider + application + admins binding +
#     outpost (the launch tile at flux.gateway.services.apocrathia.com);
#   - hidden OIDC gate: oauth2 provider + application + admins binding
#     (flux-operator-oidc, meta_launch_url blank://blank — the
#     kube-auth/headlamp split pattern; the OIDC provider feeds the Status
#     UI SSO, the proxy app is the visible tile).
# Resource addresses carry per-gate suffixes (app_proxy/app_oidc,
# provider_proxy/provider_oidc, binding_proxy/binding_oidc,
# outpost_proxy) — fresh adoption, so the addresses are defined clean
# here. The witness ids (provider pks, binding uuids, outpost uuid) ride
# the GATE-TIME varmap only and never appear in git: suspend the tree
# pre-merge, apply the patched render ONCE with the adoption varmap
# (recipe §8, born-with-varmap), confirm "7 to import, 0 to add", then
# delete the retired blueprint CM (kubectl -n flux-system delete
# configmap authentik-blueprint-flux-operator: the root kustomization
# runs prune: false, so Flux never prunes it — while it lingers,
# authentik co-manages the adopted objects and reverts tofu changes at
# re-discovery; the CM must die before the varmap clear and tree resume
# so authentik drops the blueprint before steady state), clear the
# varmap, resume. Steady state: varmap absent -> gated imports inert
# -> plan reads No changes forever.
#
# OUT OF SCOPE: the blueprint-created GROUP flux-admins is deliberately
# NOT declared here. It survives the blueprint CM retirement (live
# uuid pinned in the witness sheet; 1 member, zero authentik bindings —
# verified in the authentik DB) and Tier B decides its fate. The k8s side
# keeps using it meanwhile: rbac.yaml maps it to flux-web-admin, and the
# HelmRelease's OIDC validation expression checks it in the groups
# claim.

terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.0"
    }
  }

  # PARTIAL backend (the module's versions.tf shape): the per-app args
  # (secret_suffix/namespace/in_cluster_config) come from the ProviderConfig
  # spec.backendFile — the provider writes them as crossplane.remote.tfbackend
  # and passes them via -backend-config at tofu init. The empty block MUST
  # stay: -backend-config without a backend block falls back to the LOCAL
  # backend (warning only), which reads an EMPTY state and plans a full
  # duplicate create set — the adoption bar dies right there.
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
# authentication flow feeds the proxy provider only (the OIDC provider's
# live row carries no authentication_flow — grounded in the authentik
# DB — so provider_oidc omits it).
data "authentik_flow" "provider-authorization" {
  slug = "default-provider-authorization-implicit-consent"
}

data "authentik_flow" "invalidation" {
  slug = "default-invalidation-flow"
}

data "authentik_flow" "authentication" {
  slug = "default-authentication-flow"
}

# Admins-group binding source, order-10 parity with the retired
# blueprint (both gates bind the same group). include_users=false keeps
# the group's member list out of the state Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

# The service connection the outpost runs through — the one authentik
# creates on install, looked up by name.
data "authentik_service_connection_kubernetes" "local" {
  name = "Local Kubernetes Cluster"
}

# JWT signing key lookup (oidc gate) — the house self-signed certificate.
data "authentik_certificate_key_pair" "signing" {
  name = "authentik Self-signed Certificate"
}

# Standard scope mappings, looked up by scope_name (oidc gate) — the
# managed openid/email/profile trio the blueprint declared via !Find
# (live rows verified in the authentik DB). The Status UI requests
# openid/email/profile; the groups claim rides the profile mapping, which
# the HelmRelease's validation expression checks for 'flux-admins'.
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
# PROXY GATE (outer): provider + application + binding + outpost.
# ---------------------------------------------------------------------------

# Proxy provider — retired-blueprint parity; every value matches the live
# row (verified in the authentik DB), so the gate import plans zero
# drift.
resource "authentik_provider_proxy" "provider_proxy" {
  name                = "flux-operator-proxy-provider"
  mode                = "proxy"
  authorization_flow  = data.authentik_flow.provider-authorization.id
  invalidation_flow   = data.authentik_flow.invalidation.id
  authentication_flow = data.authentik_flow.authentication.id

  # Live values (grounded in the authentik DB): the operator's web service
  # and the public gateway host.
  internal_host = "http://flux-operator.flux-system.svc.cluster.local:9080"
  external_host = "https://flux.gateway.services.apocrathia.com"

  # FALSE is the blueprint-declared live value — always sent explicitly so
  # the live row never rides on a TF resource default (TF default true
  # would PATCH it on the first apply).
  intercept_header_auth = false

  # skip_path_regex omitted — live row is empty; an explicit value would
  # PATCH it on the first apply.

  # hours=1 is the authentik model default the live row sits at — the TF
  # resource default minutes=10 would PATCH the live row on the first
  # apply, so it is always sent explicitly.
  access_token_validity = "hours=1"
}

# Application — retired-blueprint parity; protocol_provider replaces the
# blueprint's provider FK. This is the visible launch tile.
resource "authentik_application" "app_proxy" {
  name            = "Flux"
  slug            = "flux-operator"
  group           = "Platform"
  meta_launch_url = "https://flux.gateway.services.apocrathia.com"
  open_in_new_tab = true

  # meta_icon: live-DB-verbatim — the witness sheet predates the icon-host lap; the DB is the truth.
  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/01-bootstrap/flux-system/icon.svg"
  meta_description = "Flux Operator Status web UI"
  meta_publisher   = "ControlPlane"

  protocol_provider = authentik_provider_proxy.provider_proxy.id
}

# IMMEDIATELY after the application: a proxy app without policies is open
# to ALL authenticated users until this binding lands. Order-10 parity
# with the retired blueprint. No count: the binding always exists, so its
# state address carries no [0] index.
resource "authentik_policy_binding" "binding_proxy" {
  target = authentik_application.app_proxy.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# The outpost itself — retired-blueprint config parity, every key the
# blueprint set; the parentRef list is the not-shared shape (main-gateway
# only, no tailnet parentRef) and jsonencode key order is tofu-canonical
# (sorted). The outpost provisions its own HTTPRoute from
# kubernetes_httproute_parent_refs — no hand-written route lives in this
# dir.
resource "authentik_outpost" "outpost_proxy" {
  name = "flux-operator-outpost"
  type = "proxy"

  service_connection = data.authentik_service_connection_kubernetes.local.id
  protocol_providers = [authentik_provider_proxy.provider_proxy.id]

  config = jsonencode({
    authentik_host          = "https://auth.gateway.services.apocrathia.com"
    authentik_host_insecure = true
    authentik_host_browser  = ""
    log_level               = "info"
    object_naming_template  = "ak-outpost-%(name)s"
    kubernetes_replicas     = 1
    kubernetes_namespace    = "authentik"
    kubernetes_httproute_parent_refs = [
      {
        name        = "main-gateway"
        namespace   = "cilium-system"
        sectionName = "https"
      }
    ]
    kubernetes_json_patches = {
      deployment = [
        {
          op    = "add"
          path  = "/spec/template/spec/automountServiceAccountToken"
          value = false
        }
      ]
    }
  })
}

# ---------------------------------------------------------------------------
# OIDC GATE (inner, hidden): provider + application + binding. No outpost
# (oidc gates run none) — the outer proxy outpost fronts the traffic.
# ---------------------------------------------------------------------------

# The OIDC provider feeding the Status UI SSO — the LIVE blueprint-created
# provider ADOPTED into tofu state via the gated import block at the
# bottom of this file.
resource "authentik_provider_oauth2" "provider_oidc" {
  name = "flux-operator-oidc-provider"

  # No authentication_flow — the blueprint omits it too (Optional, no TF
  # default: null is never sent; the live row carries NULL, grounded in
  # the authentik DB).
  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  # client_id is REQUIRED by the TF resource, and the live value is a
  # blueprint-minted credential: it is READ from the oidc-client-id
  # file the ProviderConfig materializes from the SAME 1Password-backed
  # Secret key the HelmRelease consumes (valuesFrom ->
  # flux-operator-secrets/oidc-client-id ->
  # web.config.authentication.oauth2.clientID) — the value NEVER appears in
  # git, and tofu and the app stay in lockstep on it. client_secret is
  # never set here (Sensitive, generated) — authentik mints it
  # server-side and the operator copy lives in the vault.
  client_id = trimspace(file("oidc-client-id"))

  client_type                = "confidential"
  sub_mode                   = "user_email"
  include_claims_in_id_token = true
  issuer_mode                = "per_provider"
  signing_key                = data.authentik_certificate_key_pair.signing.id

  # Standard scopes (openid/email/profile lookups) — retired-blueprint
  # parity (live rows verified in the authentik DB).
  property_mappings = [
    data.authentik_property_mapping_provider_scope.openid.id,
    data.authentik_property_mapping_provider_scope.email.id,
    data.authentik_property_mapping_provider_scope.profile.id,
  ]

  allowed_redirect_uris = [
    {
      url           = "https://flux.gateway.services.apocrathia.com/oauth2/callback"
      matching_mode = "strict"
    }
  ]

  access_code_validity   = "minutes=1"
  # minutes=5 — retired-blueprint parity, live matches (grounded in the
  # authentik DB). Always sent explicitly: the TF schema default is
  # minutes=10.
  access_token_validity  = "minutes=5"
  refresh_token_validity = "days=30"

  # grant_types REPRODUCES LIVE (grounded in the authentik DB):
  # blueprint-declared {authorization_code, refresh_token}, no drift. The
  # value is pinned so no first apply can ever PATCH the row (the 2026.8
  # serializer does not backfill grant_types on fresh creates — misp
  # evidence 2026-10-12).
  grant_types = [
    "authorization_code",
    "refresh_token",
  ]

  # token_validity (blueprint days=30) is NOT expressible in provider
  # 2026.8.0 — dead attribute in authentik 2026.8 (no column); omitted.
}

# Application — retired-blueprint parity; protocol_provider replaces the
# blueprint's provider FK.
#
# meta_launch_url is blank://blank — the hidden-from-library trick
# (kube-auth/headlamp split pattern): the proxy app is the launch tile;
# this app exists only to carry the OIDC provider. open_in_new_tab
# omitted — the live row is false and the TF default is false (grounded
# in the authentik DB), so sending it would add nothing.
resource "authentik_application" "app_oidc" {
  name            = "Flux Operator OIDC"
  slug            = "flux-operator-oidc"
  group           = "Platform"
  meta_launch_url = "blank://blank"

  # meta_icon: live-DB-verbatim — the witness sheet predates the icon-host lap; the DB is the truth.
  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/01-bootstrap/flux-system/icon.svg"
  meta_description = "OIDC client for Flux Status SSO"
  meta_publisher   = "ControlPlane"

  protocol_provider = authentik_provider_oauth2.provider_oidc.id
}

# IMMEDIATELY after the application: a hidden OIDC app without policies
# is still reachable by direct authorize requests — this binding closes
# it to admins. Order-10 parity with the retired blueprint. No count: the
# binding always exists, so its state address carries no [0] index.
resource "authentik_policy_binding" "binding_oidc" {
  target = authentik_application.app_oidc.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# ---------------------------------------------------------------------------
# ADOPTION VARIABLES — the generated-id import gate. Defaults (adoption
# false, ids empty) validate clean and leave the import blocks below
# inert. The ONLY setter is the merge-gate varmap (MR body, recipe §8):
# injected into the Workspace once, cleared after the adoption apply.
# The ids themselves NEVER appear in git.
# ---------------------------------------------------------------------------

variable "adoption" {
  type        = bool
  description = "Adopt the live blueprint-created authentik objects in place via the gated import blocks below instead of creating fresh ones. Gate-time varmap only (recipe §8): requires every generated import id for BOTH gates; steady state runs with adoption unset (default false) and the gated imports at zero instances."
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  # An empty id means tofu silently skips that import and plans a
  # duplicate create — the jetkvm blink (2026-10-14, proved live).
  validation {
    condition = !var.adoption || (
      var.import_provider_proxy_pk != 0 &&
      var.import_provider_oidc_pk != 0 &&
      var.import_binding_proxy_pk != "" &&
      var.import_binding_oidc_pk != "" &&
      var.import_outpost_proxy_uuid != ""
    )
    error_message = "ADOPTION GATE: adoption=true requires every generated import id for BOTH gates (proxy: import_provider_proxy_pk, import_binding_proxy_pk, import_outpost_proxy_uuid; oidc: import_provider_oidc_pk, import_binding_oidc_pk). An empty id means tofu silently skips the import and plans a duplicate create — the blink."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition = var.adoption || (
      var.import_provider_proxy_pk == 0 &&
      var.import_provider_oidc_pk == 0 &&
      var.import_binding_proxy_pk == "" &&
      var.import_binding_oidc_pk == "" &&
      var.import_outpost_proxy_uuid == ""
    )
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — either set adoption:true (adopt) or clear the ids (steady state)."
  }
}

variable "import_provider_proxy_pk" {
  type        = number
  description = "Live pk of the proxy provider (proxy gate) to adopt. Gate-time varmap only — never in git. 0 = unset (steady state)."
  default     = 0
}

variable "import_provider_oidc_pk" {
  type        = number
  description = "Live pk of the oauth2 provider (oidc gate) to adopt. Gate-time varmap only — never in git. 0 = unset (steady state)."
  default     = 0
}

variable "import_binding_proxy_pk" {
  type        = string
  description = "Live uuid of the admins policy binding (proxy gate) to adopt. Gate-time varmap only — never in git. Empty = unset (steady state)."
  default     = ""
}

variable "import_binding_oidc_pk" {
  type        = string
  description = "Live uuid of the admins policy binding (oidc gate) to adopt. Gate-time varmap only — never in git. Empty = unset (steady state)."
  default     = ""
}

variable "import_outpost_proxy_uuid" {
  type        = string
  description = "Live uuid of the proxy outpost to adopt. Gate-time varmap only — never in git. Empty = unset (steady state)."
  default     = ""
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. The application imports are UNGATED — applications
# import BY SLUG and the slugs are static literals here, so no gate
# variables exist. At steady state the targets are already in tofu state
# and the blocks are no-ops (tofu ignores import blocks for resources
# already in state); if the state Secret is ever lost, the UNGATED app
# blocks re-adopt those rows automatically on the next plan while the
# gated blocks re-arm via a fresh varmap.
#
# Generated-id imports ride GATED blocks, default off. Gating recipe
# (proven on tofu 1.10.8, module-as-root; re-verified 2026-10-14 in the
# jetkvm incident follow-up): count is REJECTED on an import block
# ("Unsupported argument"); a PLAIN import block with a variable id
# BLINKS — when the id resolves empty at the wrong moment, tofu skips
# the import and plans a CREATE duplicate (jetkvm, proved live: the
# binding was recreated as a duplicate instead of imported). for_each is
# a pure on/off gate (toset(["g"]) on, toset([]) off) with a STATIC to:
# adoption=false at steady state yields zero import instances, and after
# the gate the blocks are inert because state already holds the targets.
# The gating is ON THE BLOCKS, not the comments — the jetkvm review
# checked blocks, not prose.
# ---------------------------------------------------------------------------
import {
  to = authentik_application.app_proxy
  id = "flux-operator"
}

import {
  to = authentik_application.app_oidc
  id = "flux-operator-oidc"
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_provider_proxy.provider_proxy
  id       = tostring(var.import_provider_proxy_pk)
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_provider_oauth2.provider_oidc
  id       = tostring(var.import_provider_oidc_pk)
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_policy_binding.binding_proxy
  id       = var.import_binding_proxy_pk
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_policy_binding.binding_oidc
  id       = var.import_binding_oidc_pk
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_outpost.outpost_proxy
  id       = var.import_outpost_proxy_uuid
}
