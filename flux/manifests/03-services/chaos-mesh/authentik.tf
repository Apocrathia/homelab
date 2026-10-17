# chaos-mesh's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# ADDRESS PARITY with the live tfstate Secret
# (tfstate-chaos-mesh-authentik-chaos-mesh): the resource and data-source
# names below mirror terraform/modules/authentik-app exactly (the
# module-era addresses), so the first plan after this layout swap reads
# No changes — no state-mv gate, no recreate, no import ids. There are NO
# import blocks here: tofu state holds the objects, and if the state Secret
# is ever lost, re-adopt via manual tofu import (ids from the live DB) —
# never a blip.
#
# Proxy mode: provider + application + admins binding + outpost. NOT
# shared: live carries only the admins binding (no users binding, no
# tailnet parentRef on the outpost).

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
  # duplicate create set — the parity bar dies right there.
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

# Users-group binding source — module-shape parity: the module declares
# this data source ungated, so the live state carries it even though
# chaos-mesh is NOT shared (no users binding resource). Keeping it declared
# preserves the state address set; unreferenced data sources are fine —
# tofu still reads and stores them.
data "authentik_group" "users" {
  name          = "users"
  include_users = false
}

# The service connection the outpost runs through — the one authentik
# creates on install. count stays 1 (not a conditional): the live state
# address is local[0], the module-era shape; removing count would rename
# the address and plan a destroy/create.
data "authentik_service_connection_kubernetes" "local" {
  count = 1
  name  = "Local Kubernetes Cluster"
}

# Proxy provider — chart-blueprint parity. count stays 1: the live state
# address is app[0], the module-era shape; removing count would rename the
# address and plan a destroy/create.
resource "authentik_provider_proxy" "app" {
  count = 1

  name                = "chaos-mesh-dashboard-proxy-provider"
  mode                = "proxy"
  authorization_flow  = data.authentik_flow.provider-authorization.id
  invalidation_flow   = data.authentik_flow.invalidation.id
  authentication_flow = data.authentik_flow.authentication.id

  # Live override 1 of 3 (verified in the authentik DB 2026-09-25): the
  # dashboard service URL, not the app-name pattern the chart would
  # compose.
  internal_host = "http://chaos-dashboard.chaos-mesh.svc.cluster.local:2333"
  external_host = "https://chaos.gateway.services.apocrathia.com"

  # Live override 2 of 3: TRUE (module default false — chart parity; the
  # TF resource default is TRUE, so an omitted attribute would PATCH live
  # rows to true on the first apply).
  intercept_header_auth = true

  # skip_path_regex omitted — module parity (the empty list maps to null =
  # attribute omitted): live rows are empty, and an explicit empty string
  # would PATCH live rows.

  # Live override 3 of 3: minutes=10 (the TF default written at blip time;
  # the module proxy default is hours=1 — always sent explicitly).
  access_token_validity = "minutes=10"
}

# Application — chart-blueprint parity. protocol_provider replaces the
# blueprint's provider FK.
resource "authentik_application" "app" {
  name            = "Chaos Mesh"
  slug            = "chaos-mesh-dashboard"
  group           = "Platform"
  meta_launch_url = "https://chaos.gateway.services.apocrathia.com"
  open_in_new_tab = true

  # Optional metadata: null = attribute omitted — live DB rows are NULL
  # for many apps; the config must not invent values.
  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/03-services/chaos-mesh/icon.svg"
  meta_description = "Chaos engineering platform for Kubernetes"
  meta_publisher   = "Chaos Mesh"

  protocol_provider = authentik_provider_proxy.app[0].id
}

# IMMEDIATELY after the application: a proxy app without policies is open
# to ALL authenticated users until this binding lands. Order-10 parity
# with the chart blueprint. No count: the binding always exists, so its
# state address carries no [0] index.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# The outpost itself is workspace-owned (the retired blueprint could never
# create a provider-less outpost — authentik's OutpostSerializer rejects
# an empty providers list — so the outpost + the provider m2m land in one
# apply here). count stays 1: the live state address is app[0], the
# module-era shape. config: every key the chart blueprint set; the
# parentRef list is the not-shared shape (main-gateway only, no tailnet
# parentRef) and jsonencode key order is tofu-canonical (sorted).
resource "authentik_outpost" "app" {
  count = 1

  name = "chaos-mesh-dashboard-outpost"
  type = "proxy"

  service_connection = data.authentik_service_connection_kubernetes.local[0].id
  protocol_providers = [authentik_provider_proxy.app[0].id]

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
