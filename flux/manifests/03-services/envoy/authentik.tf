terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.2"
    }
  }
  backend "kubernetes" {}
}

provider "authentik" {
  url   = "https://auth.gateway.services.apocrathia.com"
  token = file("authentik-token")
}

data "authentik_flow" "provider-authorization" {
  slug = "default-provider-authorization-implicit-consent"
}

data "authentik_flow" "invalidation" {
  slug = "default-invalidation-flow"
}

data "authentik_flow" "authentication" {
  slug = "default-authentication-flow"
}

data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

data "authentik_service_connection_kubernetes" "local" {
  name = "Local Kubernetes Cluster"
}

resource "authentik_provider_proxy" "envoy-admin" {
  name                  = "envoy-admin"
  external_host         = "https://envoy.gateway.services.apocrathia.com"
  internal_host         = "http://envoy-gateway-admin.envoy-system.svc.cluster.local:19000"
  authorization_flow    = data.authentik_flow.provider-authorization.id
  invalidation_flow     = data.authentik_flow.invalidation.id
  authentication_flow   = data.authentik_flow.authentication.id
  mode                  = "forward_single"
  cookie_domain         = "gateway.services.apocrathia.com"
  access_token_validity = "hours=1"
}

resource "authentik_application" "envoy-admin" {
  name             = "Envoy Gateway"
  slug             = "envoy-admin"
  group            = "Platform"
  protocol_provider = authentik_provider_proxy.envoy-admin.id
  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/03-services/envoy/icon.svg"
  meta_description = "Envoy Gateway control plane — dashboard, config dump, stats, profiling"
  meta_publisher   = "Envoy Proxy"
  open_in_new_tab  = true
}

resource "authentik_policy_binding" "envoy-admin-admins" {
  target = authentik_application.envoy-admin.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

resource "authentik_outpost" "envoy-admin" {
  name               = "envoy-admin-outpost"
  type               = "proxy"
  service_connection = data.authentik_service_connection_kubernetes.local.id
  protocol_providers = [authentik_provider_proxy.envoy-admin.id]
  config = jsonencode({
    authentik_host          = "https://auth.gateway.services.apocrathia.com"
    authentik_host_insecure = true
    kubernetes_httproute_parent_refs = [
      {
        name        = "main-gateway"
        namespace   = "envoy-system"
        sectionName = "https"
      }
    ]
    kubernetes_namespace = "authentik"
    kubernetes_replicas  = 1
    log_level            = "info"
  })
}
