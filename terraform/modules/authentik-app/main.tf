# authentik-app: the shared tofu module for generic-app chart apps.
# ROOT module — the provider-opentofu Workspace pulls this directory
# directly via source: Remote (import blocks are only legal in the root
# module, so there is no wrapper). One module, three provider modes:
# proxy (provider + application + bindings + outpost), oidc (custom
# scope mappings + oauth2 provider + application + bindings), and
# library (application + bindings only — no provider).

provider "authentik" {
  # House convention for in-cluster Authentik consumers (kagent, the
  # tak LDAP outpost, the kube-apiserver OIDC issuer): the public
  # gateway hostname. The provider appends /api/v3 itself.
  url = "https://auth.gateway.services.apocrathia.com"

  # Token file written by the ProviderConfig credentials array.
  token = file("authentik-token")
}

locals {
  # ALWAYS set access_token_validity explicitly: the TF resource default
  # (minutes=10) would PATCH live rows on the first apply. Per-mode
  # defaults match what the chart-blueprint era left behind: proxy rows
  # live at the authentik model default hours=1, oidc rows at the chart
  # default minutes=5.
  access_token_validity = var.access_token_validity != "" ? var.access_token_validity : (var.mode == "oidc" ? "minutes=5" : "hours=1")

  custom_scope_names = [for m in var.custom_scope_mappings : m.scope_name]

  # Standard scope lookups: a custom mapping with the same scope_name
  # shadows the standard lookup (chart blueprint parity).
  standard_scopes = [for s in var.scopes : s if !contains(local.custom_scope_names, s)]
}

# Blueprint !Find lookups become data sources. authentik ships these
# three flows with every install, so they pre-exist any apply.
data "authentik_flow" "provider-authorization" {
  slug = var.authorization_flow
}

data "authentik_flow" "invalidation" {
  slug = var.invalidation_flow
}

data "authentik_flow" "authentication" {
  slug = var.authentication_flow
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

# The service connection the outpost runs through — the one authentik
# creates on install (replaces the blueprint's !Find on the same name).
# Read by name through the outposts/service_connections/kubernetes API,
# hence the role's view_kubernetesserviceconnection permission. Proxy
# mode only.
data "authentik_service_connection_kubernetes" "local" {
  count = var.mode == "proxy" ? 1 : 0
  name  = var.service_connection
}

# JWT signing key lookup (oidc mode).
data "authentik_certificate_key_pair" "signing" {
  count = var.mode == "oidc" ? 1 : 0
  name  = var.signing_key
}

# Standard scope mappings, looked up by scope_name (oidc mode). Custom
# mappings below shadow same-scope_name lookups.
data "authentik_property_mapping_provider_scope" "standard" {
  for_each   = var.mode == "oidc" ? toset(local.standard_scopes) : toset([])
  scope_name = each.value
}

# --- proxy mode ---------------------------------------------------------------

resource "authentik_provider_proxy" "app" {
  count = var.mode == "proxy" ? 1 : 0

  name                = "${var.app_name}-proxy-provider"
  mode                = "proxy"
  authorization_flow  = data.authentik_flow.provider-authorization.id
  invalidation_flow   = data.authentik_flow.invalidation.id
  authentication_flow = data.authentik_flow.authentication.id
  internal_host       = var.internal_host
  external_host       = var.external_host

  # Chart parity default false — the TF resource default is TRUE. Always
  # sent explicitly: an omitted attribute would PATCH live rows to true
  # on the first apply (the demo-app parity trap).
  intercept_header_auth = var.intercept_header_auth

  # The provider field is a single string; the chart's list joins with
  # newlines (block-scalar parity). Empty list = attribute omitted:
  # live rows for most apps are empty.
  skip_path_regex = length(var.skip_path_regex) > 0 ? join("\n", var.skip_path_regex) : null

  access_token_validity = local.access_token_validity
}

# --- oidc mode ----------------------------------------------------------------

resource "authentik_property_mapping_provider_scope" "custom" {
  for_each = var.mode == "oidc" ? { for m in var.custom_scope_mappings : m.name => m } : {}

  name        = each.value.name
  scope_name  = each.value.scope_name
  description = each.value.description
  expression  = each.value.expression
}

resource "authentik_provider_oauth2" "app" {
  count = var.mode == "oidc" ? 1 : 0

  name = "${var.app_name}-oidc-provider"
  # No authentication_flow — the chart blueprint omits it too (Optional,
  # no TF default: null is never sent, live values preserved).
  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  # The TF resource requires client_id (the blueprint auto-generated it
  # when unset). Adopt: the LIVE value — the import preserves it, so a
  # config value that differs plans an update. Blip: a deterministic id
  # (convention: the app name). client_secret is never set here
  # (Sensitive, generated) — imports preserve live secrets.
  client_id = var.oidc_client_id

  client_type                = var.client_type
  sub_mode                   = var.sub_mode
  include_claims_in_id_token = var.include_claims_in_id_token
  issuer_mode                = var.issuer_mode
  signing_key                = data.authentik_certificate_key_pair.signing[0].id

  # Standard scopes (scope_name lookups) + custom mappings; custom
  # scope_names shadow the standard lookups (chart blueprint parity).
  property_mappings = concat(
    [for s in data.authentik_property_mapping_provider_scope.standard : s.id],
    [for m in authentik_property_mapping_provider_scope.custom : m.id]
  )

  # TF field name is allowed_redirect_uris (the blueprint's
  # redirect_uris). Empty list = attribute omitted: live rows keep
  # whatever the blueprint era set.
  allowed_redirect_uris = length(var.redirect_uris) > 0 ? [
    for r in var.redirect_uris : { url = r.url, matching_mode = r.matching_mode }
  ] : null

  access_code_validity   = var.access_code_validity
  access_token_validity  = local.access_token_validity
  refresh_token_validity = var.refresh_token_validity

  # grant_types is TF-Computed — never sent by tofu; the API default on
  # POST/PATCH covers the authentik 2026.5+ empty-grant-types trap.
  # token_validity (mealie/romm) is NOT expressible in provider 2026.8.0:
  # unmanaged here — verify post-adopt that live values survive.
}

# --- application + bindings (both modes) ---------------------------------------

resource "authentik_application" "app" {
  name            = var.display_name
  slug            = var.app_name
  group           = var.category
  meta_launch_url = var.sso_launch_url != "" ? var.sso_launch_url : var.external_host
  open_in_new_tab = var.open_in_new_tab

  # Optional metadata: null = attribute omitted — live DB rows are NULL
  # for many apps; the config must not invent values.
  meta_icon        = var.icon != "" ? var.icon : null
  meta_description = var.meta_description != "" ? var.meta_description : null
  meta_publisher   = var.meta_publisher != "" ? var.meta_publisher : null

  # Library mode: no provider — the tile's login is handled elsewhere
  # (headlamp: the kubernetes OIDC issuer blueprint). null omits the
  # attribute, so an adopted provider-less application stays provider-less.
  protocol_provider = var.mode == "library" ? null : (var.mode == "proxy" ? authentik_provider_proxy.app[0].id : authentik_provider_oauth2.app[0].id)
}

# IMMEDIATELY after the application: a proxy app without policies is open
# to ALL authenticated users until these bindings land. The window is
# intra-apply (seconds, single apply) — chaos-mesh/demo-app precedent.
# Order-10 parity with the chart blueprint. No count: the binding always
# exists (the application is ungated), so its import address carries no
# [0] index.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# Order-20 parity: the users binding IS the shared tag — friends reach the
# app through the tailnet door, which is why the outpost config carries
# BOTH gateway parentRefs when tailnet is set. Gated by var.shared, so its
# import address carries the [0].
resource "authentik_policy_binding" "users" {
  count  = var.shared ? 1 : 0
  target = authentik_application.app.uuid
  group  = data.authentik_group.users.id
  order  = 20
}

# --- outpost (proxy mode) ------------------------------------------------------

resource "authentik_outpost" "app" {
  count = var.mode == "proxy" ? 1 : 0

  name = "${var.app_name}-outpost"
  type = "proxy"

  service_connection = data.authentik_service_connection_kubernetes.local[0].id
  protocol_providers = [authentik_provider_proxy.app[0].id]

  # config: every key the chart blueprint set, value parity on values
  # (jsonencode formatting is diff-suppressed server-side). The gateway
  # parentRefs are hardcoded house convention — the only live gateway
  # override sets identical values — main-gateway is the LAN door,
  # tailnet-gateway is the friends door.
  config = jsonencode({
    authentik_host          = var.authentik_host
    authentik_host_insecure = var.authentik_host_insecure
    authentik_host_browser  = ""
    log_level               = var.log_level
    object_naming_template  = "ak-outpost-%(name)s"
    kubernetes_replicas     = var.kubernetes_replicas
    kubernetes_namespace    = var.kubernetes_namespace
    kubernetes_httproute_parent_refs = concat(
      [
        {
          name        = "main-gateway"
          namespace   = "cilium-system"
          sectionName = "https"
        }
      ],
      var.tailnet ? [
        {
          name        = "tailnet-gateway"
          namespace   = "cilium-system"
          sectionName = "https-gateway-services"
        }
      ] : []
    )
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
