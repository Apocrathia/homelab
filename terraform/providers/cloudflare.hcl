# Cloudflare provider for OpenTofu/Terragrunt
# Include from deployments under terraform/deployments/cloudflare/
#
# Auth chain (1Password Connect — no `op` CLI):
#   OP_CONNECT_HOST + OP_CONNECT_TOKEN → provider "onepassword"
#   data.onepassword_vault by name → vault UUID (not stored in git)
#   ephemeral onepassword_item → provider "cloudflare".api_token
#
# Connect (in-cluster): http://onepassword-connect.onepassword-system.svc:8080
# Do not set CLOUDFLARE_API_TOKEN in the environment for this stack.
# Do not commit vault UUIDs — only vault name + item title (non-secret).
#
# Token scopes: Zone:DNS:Edit + Zone:Zone:Read on the target zone
# (and Account:Cloudflare Zones:Read if looking up zones by name).

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_version = ">= 1.11.0"

      required_providers {
        cloudflare = {
          source  = "cloudflare/cloudflare"
          version = "~> 5"
        }
        onepassword = {
          source  = "1Password/onepassword"
          version = "~> 3.0"
        }
      }
    }

    variable "onepassword_vault_name" {
      type        = string
      description = "1Password vault name that holds the Cloudflare API token item (not the vault UUID)"
    }

    variable "onepassword_cloudflare_token_item_title" {
      type        = string
      description = "Title of the API Credential item whose credential field is a Cloudflare API token"
    }

    provider "onepassword" {
      # Connect: OP_CONNECT_HOST + OP_CONNECT_TOKEN from the environment
    }

    data "onepassword_vault" "cloudflare_secrets" {
      name = var.onepassword_vault_name
    }

    ephemeral "onepassword_item" "cloudflare_api_token" {
      vault = data.onepassword_vault.cloudflare_secrets.uuid
      title = var.onepassword_cloudflare_token_item_title
    }

    provider "cloudflare" {
      # Token lives in the API Credential "credential" field.
      api_token = ephemeral.onepassword_item.cloudflare_api_token.credential
    }
  EOF
}
