# Okta provider for OpenTofu/Terragrunt
# Include from deployments under terraform/deployments/okta/
#
# Auth chain (1Password Connect — no `op` CLI):
#   OP_CONNECT_HOST + OP_CONNECT_TOKEN → provider "onepassword"
#   data.onepassword_vault by name → vault UUID (not stored in git)
#   ephemeral onepassword_item → provider "okta".api_token
#
# Connect (in-cluster): http://onepassword-connect.onepassword-system.svc:8080
# Do not set OKTA_API_TOKEN in the environment for this stack.
# Do not commit vault UUIDs — only vault name + item title (non-secret).
#
# Org identity is public (also in Cloudflare DNS) and lives in this file.

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_version = ">= 1.11.0"

      required_providers {
        okta = {
          source  = "okta/okta"
          version = "~> 6"
        }
        onepassword = {
          source  = "1Password/onepassword"
          version = "~> 3.0"
        }
      }
    }

    variable "onepassword_vault_name" {
      type        = string
      description = "1Password vault name that holds the Okta API token item (not the vault UUID)"
    }

    variable "onepassword_okta_token_item_title" {
      type        = string
      description = "Title of the API Credential item whose credential field is an Okta SSWS API token"
    }

    provider "onepassword" {
      # Connect: OP_CONNECT_HOST + OP_CONNECT_TOKEN from the environment
    }

    data "onepassword_vault" "okta_secrets" {
      name = var.onepassword_vault_name
    }

    ephemeral "onepassword_item" "okta_api_token" {
      vault = data.onepassword_vault.okta_secrets.uuid
      title = var.onepassword_okta_token_item_title
    }

    provider "okta" {
      org_name  = "integrator-5477892"
      base_url  = "okta.com"
      # Token lives in the API Credential "credential" field.
      api_token = ephemeral.onepassword_item.okta_api_token.credential
    }
  EOF
}
