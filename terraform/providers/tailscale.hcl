# Tailscale provider for OpenTofu/Terragrunt
# Include from deployments under terraform/deployments/tailscale/
#
# Auth chain (1Password Connect — no `op` CLI):
#   OP_CONNECT_HOST + OP_CONNECT_TOKEN → provider "onepassword"
#   data.onepassword_vault by name → vault UUID (not stored in git)
#   ephemeral onepassword_item → provider "tailscale" OAuth credentials
#
# Connect (in-cluster): http://onepassword-connect.onepassword-system.svc:8080
# Do not set TAILSCALE_OAUTH_CLIENT_ID / TAILSCALE_OAUTH_CLIENT_SECRET.
# Do not commit vault UUIDs — only vault name + item title (non-secret).

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_version = ">= 1.11.0"

      required_providers {
        tailscale = {
          source  = "tailscale/tailscale"
          version = "~> 0.29.0"
        }
        onepassword = {
          source  = "1Password/onepassword"
          version = "~> 3.0"
        }
      }
    }

    variable "onepassword_vault_name" {
      type        = string
      description = "1Password vault name that holds the Tailscale OAuth item (not the vault UUID)"
    }

    variable "onepassword_tailscale_oauth_item_title" {
      type        = string
      description = "Title of the API Credential item whose username is the OAuth client ID and credential is the OAuth client secret"
    }

    variable "tailscale_tailnet" {
      type        = string
      description = "Tailscale tailnet ID or name"

      validation {
        condition     = length(trimspace(var.tailscale_tailnet)) > 0 && var.tailscale_tailnet != "REVIEW_REQUIRED_SET_TAILNET_ID_OR_NAME"
        error_message = "tailscale_tailnet must be reviewed and set to the intended tailnet ID or name."
      }
    }

    provider "onepassword" {
      # Connect: OP_CONNECT_HOST + OP_CONNECT_TOKEN from the environment
    }

    data "onepassword_vault" "tailscale_secrets" {
      name = var.onepassword_vault_name
    }

    ephemeral "onepassword_item" "tailscale_oauth" {
      vault = data.onepassword_vault.tailscale_secrets.uuid
      title = var.onepassword_tailscale_oauth_item_title
    }

    provider "tailscale" {
      tailnet             = var.tailscale_tailnet
      oauth_client_id     = ephemeral.onepassword_item.tailscale_oauth.username
      oauth_client_secret = ephemeral.onepassword_item.tailscale_oauth.credential
    }
  EOF
}
