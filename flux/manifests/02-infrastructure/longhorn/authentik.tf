# Longhorn's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# ADOPTION (not fresh create, not state parity): the live provider,
# application, admins binding, and outpost are BLUEPRINT-CREATED (the
# retired authentik-blueprint-longhorn ConfigMap) and tofu state holds
# nothing yet. The first tofu run must IMPORT them in place — uuids
# intact, no recreate, nobody re-logs in — via the import blocks at the
# bottom of this file. The witness ids (provider pk, binding uuid, outpost
# uuid) ride the GATE-TIME varmap only and never appear in git: suspend
# the tree pre-merge, apply the patched render ONCE with the adoption
# varmap (recipe §8, born-with-varmap), confirm "N to import, 0 to add",
# clear the varmap, resume. Steady state: varmap absent -> gated imports
# inert -> plan reads No changes forever.
#
# Proxy mode: provider + application + admins binding + outpost. NOT
# shared: live carries only the admins binding (no users binding, no
# tailnet parentRef on the outpost). The outpost provisions its own HTTPRoute; the
# hand-written httproute.yaml stays commented out.

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

# The service connection the outpost runs through — the one authentik
# creates on install, looked up by name.
data "authentik_service_connection_kubernetes" "local" {
  name = "Local Kubernetes Cluster"
}

# Proxy provider — retired-blueprint parity; every value matches the live
# row (verified in the authentik DB), so the gate import plans zero drift.
resource "authentik_provider_proxy" "app" {
  name                = "longhorn-proxy-provider"
  mode                = "proxy"
  authorization_flow  = data.authentik_flow.provider-authorization.id
  invalidation_flow   = data.authentik_flow.invalidation.id
  authentication_flow = data.authentik_flow.authentication.id

  internal_host = "http://longhorn-frontend.longhorn-system.svc.cluster.local:80"
  external_host = "https://longhorn.gateway.services.apocrathia.com"

  # FALSE is the blueprint-era live value — the TF resource default is
  # TRUE, so an omitted attribute would PATCH the live row to true on the
  # first apply after the gate.
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
  name            = "Longhorn"
  slug            = "longhorn"
  group           = "Infrastructure"
  meta_launch_url = "https://longhorn.gateway.services.apocrathia.com"
  open_in_new_tab = true

  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/02-infrastructure/longhorn/icon.svg"
  meta_description = "Distributed block storage system for Kubernetes"
  meta_publisher   = "Rancher Labs"

  protocol_provider = authentik_provider_proxy.app.id
}

# IMMEDIATELY after the application: a proxy app without policies is open
# to ALL authenticated users until this binding lands. Order-10 parity
# with the retired blueprint. No count: the binding always
# exists, so its state address carries no [0] index.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# The outpost itself — retired-blueprint config parity, every key the
# blueprint set; the parentRef list is the not-shared shape (main-gateway
# only, no tailnet parentRef) and jsonencode key order is tofu-canonical
# (sorted). The outpost provisions its own
# HTTPRoute from kubernetes_httproute_parent_refs — the hand-written
# httproute.yaml stays commented out on purpose.
resource "authentik_outpost" "app" {
  name = "longhorn-outpost"
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

# --- adoption machinery (gate-time varmap only; ids never in git) ------

variable "adoption" {
  type        = bool
  description = "Adopt the live blueprint-created authentik objects in place via the import blocks below instead of creating fresh ones. Gate-time varmap only (recipe §8): requires every generated import id for this app's shape; steady state runs with adoption unset (default false) and the gated imports at zero instances."
  default     = false

  validation {
    condition = !var.adoption || (
      var.import_provider_pk != 0 &&
      var.import_binding_admins_pk != "" &&
      var.import_outpost_uuid != ""
    )
    error_message = "adoption=true requires every generated import id for this app's shape (import_provider_pk, import_binding_admins_pk, import_outpost_uuid). An empty id means tofu silently skips the import and plans a duplicate create — the blip."
  }
  validation {
    condition = var.adoption || (
      var.import_provider_pk == 0 &&
      var.import_binding_admins_pk == "" &&
      var.import_outpost_uuid == ""
    )
    error_message = "import ids set but adoption=false - either set adoption:true (adopt) or clear the ids (steady state)."
  }
}

variable "import_provider_pk" {
  type        = number
  description = "Live pk of the proxy provider to adopt. Gate-time varmap only — never in git. 0 = unset (steady state)."
  default     = 0
}

variable "import_binding_admins_pk" {
  type        = string
  description = "Live uuid of the admins policy binding to adopt. Gate-time varmap only — never in git. Empty = unset (steady state)."
  default     = ""
}

variable "import_outpost_uuid" {
  type        = string
  description = "Live uuid of the outpost to adopt. Gate-time varmap only — never in git. Empty = unset (steady state)."
  default     = ""
}

# Application import: UNGATED by design — applications import BY SLUG and
# the slug is a static literal here, so no gate variable exists. At
# steady state the target is already in tofu state and the block is a
# no-op (tofu ignores import blocks for resources already in state); if
# the state Secret is ever lost, this block re-adopts the application
# row automatically on the next plan.
import {
  to = authentik_application.app
  id = "longhorn"
}

# Generated-id imports ride GATED blocks, default off. Gating recipe
# (proven on tofu 1.10.8, module-as-root): count is REJECTED on an
# import block ("Unsupported argument"); an ungated import with an EMPTY
# id is silently skipped by tofu and a fresh create is planned — the
# validation above turns that into a loud failure instead. for_each is a
# pure on/off gate (toset(["g"]) on, toset([]) off) with a STATIC to:
# adoption=false at steady state yields zero import instances, and after
# the gate the blocks are inert because state already holds the targets.
import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_provider_proxy.app
  id       = tostring(var.import_provider_pk)
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_policy_binding.admins
  id       = var.import_binding_admins_pk
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_outpost.app
  id       = var.import_outpost_uuid
}
