# GitLab provider for OpenTofu/Terragrunt
# Include from deployments under terraform/deployments/gitlab/
#
# Auth chain (1Password Connect — no `op` CLI):
#   OP_CONNECT_HOST + OP_CONNECT_TOKEN → provider "onepassword"
#   data.onepassword_vault by name → vault UUID (not stored in git)
#   ephemeral onepassword_item → provider "gitlab".token
#
# Connect (in-cluster): http://onepassword-connect.onepassword-system.svc:8080
# Do not set GITLAB_TOKEN / a PAT in the environment for this stack.
# Do not commit vault UUIDs — only vault name + item title (non-secret).

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"

  contents = <<-EOF
    terraform {
      required_version = ">= 1.11.0"

      required_providers {
        gitlab = {
          source  = "gitlabhq/gitlab"
          version = "~> 19.0"
        }
        onepassword = {
          source  = "1Password/onepassword"
          version = "~> 3.0"
        }
      }
    }

    variable "onepassword_vault_name" {
      type        = string
      description = "1Password vault name that holds the GitLab PAT item (not the vault UUID)"
    }

    variable "onepassword_gitlab_pat_item_title" {
      type        = string
      description = "Title of the API Credential item whose credential field is a GitLab PAT with api scope"
    }

    provider "onepassword" {
      # Connect: OP_CONNECT_HOST + OP_CONNECT_TOKEN from the environment
    }

    data "onepassword_vault" "gitlab_secrets" {
      name = var.onepassword_vault_name
    }

    ephemeral "onepassword_item" "gitlab_pat" {
      vault = data.onepassword_vault.gitlab_secrets.uuid
      title = var.onepassword_gitlab_pat_item_title
    }

    provider "gitlab" {
      # PAT lives in the API Credential "credential" field (not password).
      token    = ephemeral.onepassword_item.gitlab_pat.credential
      base_url = "https://gitlab.com"
    }
  EOF
}
