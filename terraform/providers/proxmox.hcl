# Proxmox provider for OpenTofu/Terragrunt
# Include from deployments under terraform/deployments/proxmox/
#
# Auth chain (1Password Connect — no `op` CLI):
#   OP_CONNECT_HOST + OP_CONNECT_TOKEN → provider "onepassword"
#   data.onepassword_vault by name → vault UUID (not stored in git)
#   ephemeral onepassword_item → provider "proxmox".api_token
#
# Connect (in-cluster): http://onepassword-connect.onepassword-system.svc:8080
# Do not set PROXMOX_VE_API_TOKEN in the environment for this stack.
# Do not commit vault UUIDs — only vault name + item title (non-secret).
#
# Endpoint and insecure are lab identity/config (not secrets) and live here.

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_version = ">= 1.11.0"

      required_providers {
        proxmox = {
          source  = "bpg/proxmox"
          version = "~> 0.70"
        }
        onepassword = {
          source  = "1Password/onepassword"
          version = "~> 3.0"
        }
      }
    }

    variable "onepassword_vault_name" {
      type        = string
      description = "1Password vault name that holds the Proxmox API token item (not the vault UUID)"
    }

    variable "onepassword_proxmox_token_item_title" {
      type        = string
      description = "Title of the API Credential item whose credential field is a Proxmox API token (user@pam!name=secret)"
    }

    provider "onepassword" {
      # Connect: OP_CONNECT_HOST + OP_CONNECT_TOKEN from the environment
    }

    data "onepassword_vault" "proxmox_secrets" {
      name = var.onepassword_vault_name
    }

    ephemeral "onepassword_item" "proxmox_api_token" {
      vault = data.onepassword_vault.proxmox_secrets.uuid
      title = var.onepassword_proxmox_token_item_title
    }

    provider "proxmox" {
      endpoint  = "https://node-01.services.apocrathia.com:8006"
      api_token = ephemeral.onepassword_item.proxmox_api_token.credential
      insecure  = true

      ssh {
        agent = true
      }
    }
  EOF
}
