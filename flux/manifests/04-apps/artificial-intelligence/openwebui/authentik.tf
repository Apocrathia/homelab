# Open WebUI's Authentik stack — HCL half of the canonical file pair.
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
# provider + application + admins binding + users binding + outpost are
# LIVE, minted by the retired authentik-blueprint-* ConfigMap — never in
# tofu state. This workspace ADOPTS them, no cleanup companion (every
# object adopts; the blueprint CM prunes away and the live objects
# survive for tofu to take over):
#   - the application import is UNGATED — authentik_application imports
#     by slug (a static literal, verified against provider 2026.8.0
#     source: CoreApplicationsRetrieve + d.SetId(res.Slug));
#   - every GENERATED id rides GATED import blocks on adoption variables,
#     default off: var.adoption (bool) + var.import_provider_pk (number)
#     + var.import_binding_admins_pk (string) +
#     var.import_binding_users_pk (string) + var.import_outpost_uuid
#     (string).
# Two-way plan-time gate: adoption=true with any id empty FAILS loudly;
# ids set with adoption=false FAILS loudly; defaults validate clean.
# Steady state (varmap absent): imports inert (resources already in
# state — tofu skips import blocks for in-state resources), plan reads No
# changes forever. The merge gate (MR body, recipe §8) injects the
# witness varmap once at merge, confirms "5 to import, 0 to add", then
# clears it. Witness ids are GATE-TIME ONLY — NEVER in git; if the state
# Secret is ever lost, re-run the gate with fresh ids from the live DB.
#
# Proxy SHARED mode (the only shared app in this wave): provider +
# application + outpost + admins binding order 10 + users binding
# order 20. The users binding IS the shared tag — friends reach the app
# through the tailnet door, which is why the outpost config below carries
# BOTH gateway parentRefs (main-gateway + tailnet-gateway). The outpost
# provisions its own HTTPRoute; openwebui has no hand-written one.

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

# Admins-group binding source, order-10 parity with the retired blueprint.
# include_users=false keeps the group's member list out of the state
# Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

# Users-group binding source, order-20 parity — the shared tag. Same
# include_users=false state-hygiene rationale as admins.
data "authentik_group" "users" {
  name          = "users"
  include_users = false
}

# The service connection the outpost runs through — the one authentik
# creates on install, looked up by name.
data "authentik_service_connection_kubernetes" "local" {
  name = "Local Kubernetes Cluster"
}

# Proxy provider — retired-blueprint parity; every value matches the live
# row (verified in the authentik DB), so the gate import plans zero drift.
resource "authentik_provider_proxy" "app" {
  name                = "openwebui-proxy-provider"
  mode                = "proxy"
  authorization_flow  = data.authentik_flow.provider-authorization.id
  invalidation_flow   = data.authentik_flow.invalidation.id
  authentication_flow = data.authentik_flow.authentication.id

  internal_host = "http://openwebui-open-webui.openwebui.svc.cluster.local:80"
  external_host = "https://chat.gateway.services.apocrathia.com"

  # FALSE is the blueprint-era live value — the TF resource default is
  # TRUE, so an omitted attribute would PATCH the live row to true on
  # the first apply after the gate.
  intercept_header_auth = false

  # skip_path_regex omitted — live row is empty; an explicit value would
  # PATCH it on the first apply.

  # hours=1 is the authentik model default the live row sits at — the TF
  # resource default minutes=10 would PATCH the live row on the first
  # apply, so it is always sent explicitly.
  access_token_validity = "hours=1"
}

# Application — retired-blueprint parity; protocol_provider replaces the
# blueprint's provider FK.
resource "authentik_application" "app" {
  name            = "Open WebUI"
  slug            = "openwebui"
  group           = "Artificial Intelligence"
  meta_launch_url = "https://chat.gateway.services.apocrathia.com"
  open_in_new_tab = true

  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/04-apps/artificial-intelligence/openwebui/icon.svg"
  meta_description = "User-friendly web interface for chat interactions with LLMs"
  meta_publisher   = "OpenWebUI"

  protocol_provider = authentik_provider_proxy.app.id
}

# IMMEDIATELY after the application: a proxy app without policies is open
# to ALL authenticated users until these bindings land. The window is
# intra-apply (seconds, single apply) — chaos-mesh precedent. Order-10
# parity with the retired blueprint. No count: the binding always
# exists, so its state address carries no [0] index.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# Order-20 parity: the users binding IS the shared tag — friends reach
# the app through the tailnet door, which is why the outpost config
# below carries BOTH gateway parentRefs. A users binding without the
# tailnet parentRef would be a silent 403-by-geography.
resource "authentik_policy_binding" "users" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.users.id
  order  = 20
}

# The outpost itself — retired-blueprint config parity, every key the
# blueprint set; the parentRef list is the SHARED shape (BOTH gateways)
# and jsonencode key order is tofu-canonical (sorted). The outpost
# provisions its own HTTPRoute from kubernetes_httproute_parent_refs —
# openwebui has no hand-written route on purpose.
resource "authentik_outpost" "app" {
  name = "openwebui-outpost"
  type = "proxy"

  service_connection = data.authentik_service_connection_kubernetes.local.id
  protocol_providers = [authentik_provider_proxy.app.id]

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
      },
      {
        name        = "tailnet-gateway"
        namespace   = "cilium-system"
        sectionName = "https-gateway-services"
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
# ADOPTION VARIABLES — the generated-id import gate. Defaults (adoption
# false, ids empty) validate clean and leave the import blocks below
# inert. The ONLY setter is the merge-gate varmap (MR body, recipe §8):
# injected into the Workspace once, cleared after the adoption apply.
# The ids themselves NEVER appear in git.
# ---------------------------------------------------------------------------
variable "adoption" {
  description = "Merge-gate switch: adopt the live blueprint-created provider, bindings, and outpost into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  validation {
    condition     = !var.adoption || (var.import_provider_pk > 0 && var.import_binding_admins_pk != "" && var.import_binding_users_pk != "" && var.import_outpost_uuid != "")
    error_message = "ADOPTION GATE: adoption=true requires import_provider_pk, import_binding_admins_pk, import_binding_users_pk, and import_outpost_uuid (witness ids from the gate varmap — gate-time only, never in git)."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition     = var.adoption || (var.import_provider_pk == 0 && var.import_binding_admins_pk == "" && var.import_binding_users_pk == "" && var.import_outpost_uuid == "")
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — clear the ids or set adoption=true."
  }
}

variable "import_provider_pk" {
  description = "Live authentik_provider_proxy pk for the gated import (provider 2026.8.0 imports providers by pk)."
  type        = number
  default     = 0
}

variable "import_binding_admins_pk" {
  description = "Live authentik_policy_binding admins uuid for the gated import (bindings import by pk)."
  type        = string
  default     = ""
}

variable "import_binding_users_pk" {
  description = "Live authentik_policy_binding users uuid for the gated import (bindings import by pk)."
  type        = string
  default     = ""
}

variable "import_outpost_uuid" {
  description = "Live authentik_outpost uuid for the gated import (outposts import by uuid)."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. The application import is UNGATED — the slug is a
# static literal (authentik_application imports by slug). The provider,
# binding, and outpost ids are GENERATED (pk/uuid), so they ride the
# adoption variables above: default off, inert while the resources are
# in state (tofu skips import blocks for in-state resources), armed once
# at the merge gate by the witness varmap and back off after. The
# witness ids NEVER appear in git — the varmap payload lives in the MR
# recipe only.
# ---------------------------------------------------------------------------
import {
  to = authentik_application.app
  id = "openwebui"
}

import {
  to = authentik_provider_proxy.app
  id = tostring(var.import_provider_pk)
}

import {
  to = authentik_policy_binding.admins
  id = var.import_binding_admins_pk
}

import {
  to = authentik_policy_binding.users
  id = var.import_binding_users_pk
}

import {
  to = authentik_outpost.app
  id = var.import_outpost_uuid
}
