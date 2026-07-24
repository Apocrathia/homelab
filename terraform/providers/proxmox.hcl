# Proxmox provider for OpenTofu
# Include from deployments under terraform/deployments/proxmox/
#
# Credentials (environment):
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
