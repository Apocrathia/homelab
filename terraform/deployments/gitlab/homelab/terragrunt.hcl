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

  # Adopt the project itself and mark it with the managed-by-terraform topic.
  # description / resolve_outdated_diff_discussions are pinned because provider
  # v19 resets optional-only attributes to null when unset.
  manage_project                      = true
  project_description                 = "GitOps-managed Kubernetes homelab cluster on Talos Linux with Flux CD, 1Password secrets management, and production-like infrastructure for home services."
  resolve_outdated_diff_discussions   = true
  terraform_label_name        = "managed-by-terraform"
  terraform_label_color       = "#428BCA"
  terraform_label_description = "Owned by OpenTofu under terraform/deployments/gitlab"
}
