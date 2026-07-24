# Okta provider for OpenTofu
# Include from deployments under terraform/deployments/okta/
#
# Credentials (environment):
#   OKTA_API_TOKEN - SSWS API token with permissions for managed resources
#
# Org identity is public (also in Cloudflare DNS) and lives in this file.

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_version = ">= 1.6.0"

      required_providers {
        okta = {
          source  = "okta/okta"
          version = "~> 6"
        }
      }
    }

    # Token from environment: OKTA_API_TOKEN
    provider "okta" {
      org_name = "integrator-5477892"
      base_url = "okta.com"
    }
  EOF
}
