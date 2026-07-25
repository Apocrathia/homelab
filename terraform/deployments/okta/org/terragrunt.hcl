# -----------------------------------------------------------------------------
# Okta org
# -----------------------------------------------------------------------------
# OIDC web apps + Everyone assignment. Auth:
#   OKTA_API_TOKEN (1Password → .env / GitLab CI)
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
  oauth_apps = {
    authentik = {
      label        = "Authentik"
      redirect_uri = "https://auth.gateway.services.apocrathia.com/source/oauth/callback/okta/"
      login_uri    = "https://auth.gateway.services.apocrathia.com/source/oauth/login/okta/"
    }
  }
}
