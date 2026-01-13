# Root Terragrunt configuration
# All child configurations inherit from this file

# -----------------------------------------------------------------------------
# Remote State - GitLab HTTP Backend
# -----------------------------------------------------------------------------
# Required environment variables:
#   TF_HTTP_ADDRESS        - GitLab base state URL (e.g., https://gitlab.com/api/v4/projects/ID/terraform/state/homelab)
#   TF_HTTP_USERNAME       - GitLab username
#   TF_HTTP_PASSWORD       - GitLab access token (api scope)
#
# Each deployment gets a unique state key based on its path.

locals {
  # Base state URL from environment
  base_address = get_env("TF_HTTP_ADDRESS", "")

  # Create unique state key per deployment by appending relative path
  # e.g., homelab/talos-01, homelab/talos-02, etc.
  state_key = replace(path_relative_to_include(), "/", "-")
  address   = "${local.base_address}-${local.state_key}"
}

remote_state {
  backend = "http"

  config = {
    address        = local.address
    lock_address   = "${local.address}/lock"
    unlock_address = "${local.address}/lock"
    username       = get_env("TF_HTTP_USERNAME", "")
    password       = get_env("TF_HTTP_PASSWORD", "")
    lock_method    = "POST"
    unlock_method  = "DELETE"
  }

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

# -----------------------------------------------------------------------------
# Provider Configuration - Proxmox
# -----------------------------------------------------------------------------
# The bpg/proxmox provider reads credentials from environment variables:
#   PROXMOX_VE_ENDPOINT  - Proxmox API endpoint (e.g., https://pve:8006)
#   PROXMOX_VE_API_TOKEN - Full API token (format: user@pam!tokenname=secret)
#   PROXMOX_VE_INSECURE  - Skip TLS verification (optional, default: false)

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_version = ">= 1.6.0"

      required_providers {
        proxmox = {
          source  = "bpg/proxmox"
          version = "~> 0.70"
        }
      }
    }

    # Credentials read from environment variables:
    # - PROXMOX_VE_ENDPOINT
    # - PROXMOX_VE_API_TOKEN
    # - PROXMOX_VE_INSECURE (optional)
    provider "proxmox" {
      ssh {
        agent = true
      }
    }
  EOF
}
