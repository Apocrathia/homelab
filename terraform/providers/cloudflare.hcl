# Cloudflare provider for OpenTofu
# Include from deployments under terraform/deployments/cloudflare/
#
# Credentials (environment):
#   CLOUDFLARE_API_TOKEN - API token with Zone:DNS:Edit and Zone:Zone:Read
#                         on the target zone (and Account:Cloudflare Zones:Read
#                         if looking up zones by name)

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_version = ">= 1.6.0"

      required_providers {
        cloudflare = {
          source  = "cloudflare/cloudflare"
          version = "~> 5"
        }
      }
    }

    # Credentials read from environment:
    # - CLOUDFLARE_API_TOKEN
    provider "cloudflare" {}
  EOF
}
