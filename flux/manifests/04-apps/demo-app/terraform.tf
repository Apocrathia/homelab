terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.0"
    }
  }

  # Per-workspace state: the kubernetes backend stores it as a Secret
  # (tfstate-default-demo-app) in this namespace via the provider runtime SA.
  # Deliberately separate from the CI tofu stack (terraform/, GitLab
  # HTTP backend) — two stacks, two states.
  backend "kubernetes" {
    secret_suffix     = "demo-app"
    namespace         = "demo-app"
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

# Users-group binding source — demo-app is shared tier (order 20 in the
# retired blueprint; friends reach the app over the tailnet door).
# Same include_users=false state-hygiene rationale as admins.
data "authentik_group" "users" {
  name          = "users"
  include_users = false
}

# Proxy provider — 1:1 parity with the retired chart-rendered blueprint.
# mode=proxy: the outpost owns the HTTPRoute, no forward-auth middleware
# anywhere, and this module references no k8s objects.
# intercept_header_auth is EXPLICIT false: the live DB value is false and
# the TF default is true — the one parity trap where demo-app differs from
# the chaos-mesh recipe (whose live value was true). skip_path_regex: the
# blueprint set none, so none here either.
resource "authentik_provider_proxy" "demo-app-proxy-provider" {
  name                  = "demo-app-proxy-provider"
  mode                  = "proxy"
  authorization_flow    = data.authentik_flow.provider-authorization.id
  invalidation_flow     = data.authentik_flow.invalidation.id
  authentication_flow   = data.authentik_flow.authentication.id
  internal_host         = "http://demo-app.demo-app.svc.cluster.local:80"
  external_host         = "https://demo.gateway.services.apocrathia.com"
  intercept_header_auth = false

  # Parity with the live chart-era value — the TF default (minutes=10)
  # would PATCH the row on the first apply.
  access_token_validity = "hours=1"
}

# Application — 1:1 parity with the retired chart-rendered blueprint.
# protocol_provider replaces the blueprint's provider FK.
# meta_description and meta_publisher are omitted: the live DB rows are
# NULL, so this module must not invent them.
resource "authentik_application" "demo-app" {
  name              = "Demo Application"
  slug              = "demo-app"
  group             = "Platform"
  meta_launch_url   = "https://demo.gateway.services.apocrathia.com"
  open_in_new_tab   = true
  meta_icon         = "https://gitlab.com/Apocrathia/homelab/-/raw/main/flux/manifests/04-apps/demo-app/icon.png"
  protocol_provider = authentik_provider_proxy.demo-app-proxy-provider.id
}

# IMMEDIATELY after the application: a proxy app without policies is open
# to ALL authenticated users until these bindings land. The window is
# intra-apply (seconds, single apply) — chaos-mesh precedent. Order-10
# parity with the retired blueprint.
resource "authentik_policy_binding" "demo-app-admins" {
  target = authentik_application.demo-app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# Order-20 parity: the users binding IS the shared tag — friends reach the
# app through the tailnet door, which is why the outpost config below
# carries BOTH gateway parentRefs. A users binding without the tailnet
# parentRef would be a silent 403-by-geography.
resource "authentik_policy_binding" "demo-app-users" {
  target = authentik_application.demo-app.uuid
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

# Outpost — the piece that retired the chart-rendered blueprint
# (ConfigMap authentik-blueprint-demo-app, Helm-pruned after the
# authentik.enabled: false flip in helmrelease.yaml): this module now owns
# the full Authentik stack for the app.
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
# config: every key the blueprint set, byte-parity on values (jsonencode
# formatting is diff-suppressed server-side). BOTH parentRefs —
# main-gateway is the LAN door, tailnet-gateway is the friends door; the
# outpost-generated HTTPRoute dual-parents them and is the ONLY route
# serving the hostname (demo-app has no route of its own). No
# kubernetes_httproute_json_patches: the old 5m/2m-timeouts era is gone
# from live state and must not be recreated.
resource "authentik_outpost" "demo-app-outpost" {
  name               = "demo-app-outpost"
  type               = "proxy"
  service_connection = data.authentik_service_connection_kubernetes.local.id
  protocol_providers = [
    authentik_provider_proxy.demo-app-proxy-provider.id
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

# ---------------------------------------------------------------------------
# Adoption (2026-09-23): the chart-era Authentik objects are adopted IN
# PLACE — no companion deletes, no deletion window, uuids intact, no
# re-login. The ids below are verified live. After the first apply the
# import blocks go INERT (tofu then treats the objects as plain managed
# state) and are safe to keep forever. NEVER leave a varmap value empty:
# an empty id makes tofu silently skip the import and plan a duplicate
# create.
# ---------------------------------------------------------------------------

variable "import_provider_pk" {
  type        = string
  description = "Live pk of the proxy provider to adopt (authentik_provider_proxy.demo-app-proxy-provider)."
}

variable "import_application_id" {
  type        = string
  description = "Slug of the application to adopt (authentik_application.demo-app) — applications import by slug, not uuid."
}

variable "import_binding_admins_pk" {
  type        = string
  description = "Live pk of the admins policy binding to adopt (authentik_policy_binding.demo-app-admins)."
}

variable "import_binding_users_pk" {
  type        = string
  description = "Live pk of the users policy binding to adopt (authentik_policy_binding.demo-app-users)."
}

variable "import_outpost_uuid" {
  type        = string
  description = "Live uuid of the outpost to adopt (authentik_outpost.demo-app-outpost)."
}

import {
  to = authentik_provider_proxy.demo-app-proxy-provider
  id = var.import_provider_pk
}

import {
  to = authentik_application.demo-app
  id = var.import_application_id
}

import {
  to = authentik_policy_binding.demo-app-admins
  id = var.import_binding_admins_pk
}

import {
  to = authentik_policy_binding.demo-app-users
  id = var.import_binding_users_pk
}

import {
  to = authentik_outpost.demo-app-outpost
  id = var.import_outpost_uuid
}
