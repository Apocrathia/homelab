# -----------------------------------------------------------------------------
# GitLab project — Apocrathia/homelab
# -----------------------------------------------------------------------------
# Pattern spike: 1Password Connect ephemeral → gitlab provider (no `op` CLI).
#
# Required env:
#   OP_CONNECT_HOST  — http://onepassword-connect.onepassword-system.svc:8080
#   OP_CONNECT_TOKEN — Connect API token with read on the vault
#   TF_HTTP_*        — state backend (local PAT; CI can use job token)
#
# Do NOT export GITLAB_TOKEN. Do NOT commit vault UUIDs.
# Set onepassword_gitlab_pat_item_title to the item title in vault Secrets.
# Start with manage_terraform_label = false; flip true for the label apply.

include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/providers/gitlab.hcl"
}

terraform {
  source = "../../../modules/gitlab-project"
}

inputs = {
  onepassword_vault_name            = "Secrets"
  onepassword_gitlab_pat_item_title = "gitlab-terraform-secrets"

  project_path                = "Apocrathia/homelab"
  manage_terraform_label      = false

  # Branch protection: adopt the existing rule on main (import block in the
  # module), then enforce no direct pushes — everything through MRs.
  manage_branch_protection = true
  protected_branch         = "main"
  terraform_label_name        = "managed-by-terraform"
  terraform_label_color       = "#428BCA"
  terraform_label_description = "Owned by OpenTofu under terraform/deployments/gitlab"
}
