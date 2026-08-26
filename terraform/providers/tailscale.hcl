# Tailscale provider for OpenTofu/Terragrunt
# Include from deployments under terraform/deployments/tailscale/
#
# Auth chain (1Password Connect — no `op` CLI):
#   OP_CONNECT_HOST + OP_CONNECT_TOKEN → provider "onepassword"
#   data.onepassword_vault by name → vault UUID (not stored in git)
#   ephemeral onepassword_item → provider "tailscale" OAuth client credentials
#
# Connect (in-cluster): http://onepassword-connect.onepassword-system.svc:8080
# Do not set TAILSCALE_API_KEY / TAILSCALE_OAUTH_* in the environment for this stack.
# Do not commit vault UUIDs — only vault name + item title (non-secret).
#
# Item: tailscale-terraform-secrets (API Credential)
#   username               = OAuth client ID
#   credential             = OAuth client secret
#   section dns:nextdns-id = NextDNS profile ID (derives the global resolver)
# Client scopes: policy_file, dns, networking_settings, tailnets:read,
# feature_settings, auth_keys, users:read, log_streaming,
# logs:configuration:read, devices:core, devices:core:read,
# devices:posture_attributes; tags: tag:k8s.

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_version = ">= 1.11.0"

      required_providers {
        tailscale = {
          source  = "tailscale/tailscale"
          version = "~> 0.29"
        }
        onepassword = {
          source  = "1Password/onepassword"
          version = "~> 3.0"
        }
      }
    }

    variable "onepassword_vault_name" {
      type        = string
      description = "1Password vault name that holds the Tailscale OAuth client item (not the vault UUID)"
    }

    variable "onepassword_tailscale_token_item_title" {
      type        = string
      description = "Title of the API Credential item: username = OAuth client ID, credential = OAuth client secret"
    }

    provider "onepassword" {
      # Connect: OP_CONNECT_HOST + OP_CONNECT_TOKEN from the environment
    }

    data "onepassword_vault" "tailscale_secrets" {
      name = var.onepassword_vault_name
    }

    ephemeral "onepassword_item" "tailscale_oauth" {
      vault = data.onepassword_vault.tailscale_secrets.uuid
      title = var.onepassword_tailscale_token_item_title
    }

    provider "tailscale" {
      # OAuth client lives in the API Credential item (username = client ID,
      # credential = client secret). No scopes arg: the token gets the
      # client's full configured scope set.
      oauth_client_id     = ephemeral.onepassword_item.tailscale_oauth.username
      oauth_client_secret = ephemeral.onepassword_item.tailscale_oauth.credential

      # Legacy tailnet DNS-name ID; the custom domain (tailnet.apocrathia.com)
      # is not accepted as an API path identifier.
      tailnet = "taila8ef8c.ts.net"
    }
  EOF
}
