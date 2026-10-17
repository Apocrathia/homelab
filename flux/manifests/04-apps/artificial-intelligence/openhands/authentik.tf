terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.0"
    }
  }

  # Per-workspace state: the kubernetes backend stores it as a Secret
  # (tfstate-default-openhands) in this namespace via the provider runtime SA.
  # Deliberately separate from the CI tofu stack (terraform/, GitLab
  # HTTP backend) — two stacks, two states.
  backend "kubernetes" {
    secret_suffix     = "openhands"
    namespace         = "openhands"
    in_cluster_config = true
  }
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

# Users-group binding source — openhands is shared tier (order 20 in the
# retired blueprint; friends reach the app over the tailnet door).
# Same include_users=false state-hygiene rationale as admins.
data "authentik_group" "users" {
  name          = "users"
  include_users = false
}

# Proxy provider — 1:1 parity with the retired blueprint. mode=proxy: the
# outpost owns the HTTPRoute, no forward-auth middleware anywhere, and this
# module references no k8s objects.
# intercept_header_auth is EXPLICIT false (blueprint parity): the TF default
# is true — an omitted attribute would set it true on apply. skip_path_regex:
# the blueprint set none, so none here either.
resource "authentik_provider_proxy" "openhands-proxy-provider" {
  name                  = "openhands-proxy-provider"
  mode                  = "proxy"
  authorization_flow    = data.authentik_flow.provider-authorization.id
  invalidation_flow     = data.authentik_flow.invalidation.id
  authentication_flow   = data.authentik_flow.authentication.id
  internal_host         = "http://openhands-agent-canvas.openhands.svc.cluster.local:8000"
  external_host         = "https://openhands.gateway.services.apocrathia.com"
  intercept_header_auth = false

  # Blueprint parity with the authentik model default — the TF default
  # (minutes=10) would PATCH the row on the first apply.
  access_token_validity = "hours=1"
}

# Application — 1:1 parity with the retired blueprint.
# protocol_provider replaces the blueprint's provider FK.
resource "authentik_application" "openhands" {
  name              = "OpenHands"
  slug              = "openhands"
  group             = "Artificial Intelligence"
  meta_launch_url   = "https://openhands.gateway.services.apocrathia.com"
  open_in_new_tab   = true
  meta_icon         = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/04-apps/artificial-intelligence/openhands/icon.svg"
  meta_description  = "AI software-engineering agent platform for coding agents"
  meta_publisher    = "OpenHands"
  protocol_provider = authentik_provider_proxy.openhands-proxy-provider.id
}

# IMMEDIATELY after the application: a proxy app without policies is open
# to ALL authenticated users until these bindings land. The window is
# intra-apply (seconds, single apply) — chaos-mesh precedent. Order-10
# parity with the retired blueprint.
resource "authentik_policy_binding" "openhands-admins" {
  target = authentik_application.openhands.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# Order-20 parity: the users binding IS the shared tag — friends reach the
# app through the tailnet door, which is why the outpost config below
# carries BOTH gateway parentRefs. A users binding without the tailnet
# parentRef would be a silent 403-by-geography.
resource "authentik_policy_binding" "openhands-users" {
  target = authentik_application.openhands.uuid
  group  = data.authentik_group.users.id
  order  = 20
}

# The service connection the outpost runs through — the one authentik
# creates on install (replaces the blueprint's !Find on the same name).
# Read by name through the outposts/service_connections/kubernetes API,
# hence the role's view_kubernetesserviceconnection permission.
data "authentik_service_connection_kubernetes" "local" {
  name = "Local Kubernetes Cluster"
}

# Outpost — the piece that retires the blueprint (ConfigMap
# authentik-blueprint-openhands, never applied live): this module owns the
# full Authentik stack for the app, greenfield (no import blocks — there
# is nothing live to adopt).
#
# config: every key the blueprint set, value parity on values (jsonencode
# formatting is diff-suppressed server-side). BOTH parentRefs —
# main-gateway is the LAN door, tailnet-gateway is the friends door; the
# outpost-generated HTTPRoute dual-parents them and is the ONLY route
# serving the hostname (openhands has no route of its own).
resource "authentik_outpost" "openhands-outpost" {
  name               = "openhands-outpost"
  type               = "proxy"
  service_connection = data.authentik_service_connection_kubernetes.local.id
  protocol_providers = [
    authentik_provider_proxy.openhands-proxy-provider.id
  ]
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
