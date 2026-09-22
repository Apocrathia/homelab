terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.0"
    }
  }

  # Per-workspace state: the kubernetes backend stores it as a Secret
  # (tfstate-default-chaos-mesh) in this namespace via the provider runtime SA.
  # Deliberately separate from the CI tofu stack (terraform/, GitLab
  # HTTP backend) — two stacks, two states.
  backend "kubernetes" {
    secret_suffix     = "chaos-mesh"
    namespace         = "chaos-mesh"
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

# Proxy provider — 1:1 parity with the retired blueprint entry. mode=proxy:
# the outpost owns the HTTPRoute, no forward-auth middleware anywhere, and
# this module references no k8s objects. intercept_header_auth is explicit
# because the blueprint set it (TF default is also true). skip_path_regex:
# the blueprint set none, so none here either.
resource "authentik_provider_proxy" "chaos-mesh-dashboard-proxy-provider" {
  name                  = "chaos-mesh-dashboard-proxy-provider"
  mode                  = "proxy"
  authorization_flow    = data.authentik_flow.provider-authorization.id
  invalidation_flow     = data.authentik_flow.invalidation.id
  authentication_flow   = data.authentik_flow.authentication.id
  internal_host         = "http://chaos-dashboard.chaos-mesh.svc.cluster.local:2333"
  external_host         = "https://chaos.gateway.services.apocrathia.com"
  intercept_header_auth = true
}

# Application — 1:1 parity with the retired blueprint entry.
# protocol_provider replaces the blueprint's provider FK.
resource "authentik_application" "chaos-mesh-dashboard" {
  name              = "Chaos Mesh"
  slug              = "chaos-mesh-dashboard"
  group             = "Platform"
  meta_launch_url   = "https://chaos.gateway.services.apocrathia.com"
  open_in_new_tab   = true
  meta_icon         = "https://gitlab.com/Apocrathia/homelab/-/raw/main/flux/manifests/03-services/chaos-mesh/icon.svg"
  meta_description  = "Chaos engineering platform for Kubernetes"
  meta_publisher    = "Chaos Mesh"
  protocol_provider = authentik_provider_proxy.chaos-mesh-dashboard-proxy-provider.id
}

# IMMEDIATELY after the application: a proxy app without policies is open
# to ALL authenticated users until this binding lands. Same class of
# window headlamp accepted (seconds, single apply).
resource "authentik_policy_binding" "chaos-mesh-dashboard-admins" {
  target = authentik_application.chaos-mesh-dashboard.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# The service connection the outpost runs through — the one authentik
# creates on install (replaces the blueprint's !Find on the same name).
# Read by name through the outposts/service_connections/kubernetes API,
# hence the role's view_kubernetesserviceconnection permission.
data "authentik_service_connection_kubernetes" "local" {
  name = "Local Kubernetes Cluster"
}

# Outpost — the piece that retired the blueprint (authentik-blueprint.yaml,
# deleted): this module now owns the full Authentik stack for the app.
#
# Why TF and not a blueprint: authentik's OutpostSerializer (2026.8.3,
# authentik/outposts/api/outposts.py validate_providers) rejects CREATING a
# provider-less outpost ("This list may not be empty."), and the TF
# resource's protocol_providers is Required — a blueprint could never
# create the outpost empty for authentik_outpost_provider_attachment to
# fill afterwards (the attachment PATCHes an existing outpost). The
# resource creates the outpost WITH the provider in one POST and manages
# the m2m itself, so no attachment resource exists here.
#
# config: every key the blueprint set, byte-parity on values
# (jsonencode formatting is diff-suppressed server-side). The outpost
# owns the HTTPRoute on main-gateway; the route gains the chaos host
# when this resource lands with the provider attached.
resource "authentik_outpost" "chaos-mesh-dashboard-outpost" {
  name               = "chaos-mesh-dashboard-outpost"
  type               = "proxy"
  service_connection = data.authentik_service_connection_kubernetes.local.id
  protocol_providers = [
    authentik_provider_proxy.chaos-mesh-dashboard-proxy-provider.id
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
