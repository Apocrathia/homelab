# -----------------------------------------------------------------------------
# Okta org
# -----------------------------------------------------------------------------
# OIDC web apps + Everyone assignment.
#
# Auth (1Password Connect — no OKTA_API_TOKEN in env):
#   OP_CONNECT_HOST  — http://onepassword-connect.onepassword-system.svc:8080
#   OP_CONNECT_TOKEN — Connect API token with read on the vault
#   TF_HTTP_*        — state backend
#
# Do NOT export OKTA_API_TOKEN. Do NOT commit vault UUIDs.
#
# Client secrets are omit_secret=true — read once from Okta Admin UI into
# 1Password (not TF outputs).

include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/providers/okta.hcl"
}

terraform {
  source = "../../../modules/okta-org"
}

inputs = {
  onepassword_vault_name            = "Secrets"
  onepassword_okta_token_item_title = "okta-terraform-secrets"

  oauth_apps = {
    authentik = {
      label        = "Authentik"
      redirect_uri = "https://auth.gateway.services.apocrathia.com/source/oauth/callback/okta/"
      login_uri    = "https://auth.gateway.services.apocrathia.com/source/oauth/login/okta/"
    }
  }
}
