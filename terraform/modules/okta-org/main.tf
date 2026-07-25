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
