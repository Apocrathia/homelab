# -----------------------------------------------------------------------------
# Okta org
# -----------------------------------------------------------------------------
# OIDC web apps from var.oauth_apps, each assigned to the built-in Everyone
# group. Client secrets are omit_secret=true (not in state); read once from the
# Admin UI into 1Password.

data "okta_group" "everyone" {
  name = "Everyone"
  type = "BUILT_IN"
}

resource "okta_app_oauth" "this" {
  for_each = var.oauth_apps

  label                      = each.value.label
  type                       = "web"
  grant_types                = ["authorization_code"]
  response_types             = ["code"]
  token_endpoint_auth_method = "client_secret_basic"
  redirect_uris              = [each.value.redirect_uri]
  login_mode                 = "SPEC"
  login_uri                  = each.value.login_uri
  hide_web                   = false
  issuer_mode                = "CUSTOM_URL"
  omit_secret                = true
  # consent_method omitted: EA property; can 403 without API Access Management.
}

resource "okta_app_group_assignment" "everyone" {
  for_each = okta_app_oauth.this

  app_id   = each.value.id
  group_id = data.okta_group.everyone.id
}

# -----------------------------------------------------------------------------
# Network zones
# -----------------------------------------------------------------------------
# Home egress is dynamic: the IP is probed at plan/apply time (wherever tofu
# runs egresses to the internet; CI runners sit on the lab network). chomp()
# strips the endpoint's trailing newline. Zones stay inert until a sign-in or
# password policy references them.

data "http" "egress_ip" {
  url = var.egress_probe_url
}

locals {
  egress_ip_cidr = "${chomp(data.http.egress_ip.response_body)}/32"
}

resource "okta_network_zone" "this" {
  for_each = var.network_zones

  name               = each.value.name
  type               = each.value.type
  usage              = each.value.usage
  gateways           = each.value.include_egress_ip ? setunion(each.value.gateways, [local.egress_ip_cidr]) : each.value.gateways
  proxies            = each.value.proxies
  dynamic_proxy_type = each.value.dynamic_proxy_type
}
