# -----------------------------------------------------------------------------
# Okta org
# -----------------------------------------------------------------------------
# Scaffold stack: provider + empty module. Org settings and apps land later.
# Auth: OKTA_API_TOKEN (1Password → .env / GitLab CI)

include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/providers/okta.hcl"
}

terraform {
  source = "../../../modules/okta-org"
}

inputs = {}
