# -----------------------------------------------------------------------------
# GitLab project (scaffold)
# -----------------------------------------------------------------------------
# Looks up an existing project and optionally manages a single label
# (managed-by-terraform). Provider credentials come from the generated
# provider.tf (1Password ephemeral → gitlab provider), not from this module.

data "gitlab_project" "this" {
  path_with_namespace = var.project_path
}

resource "gitlab_project_label" "managed_by_terraform" {
  count = var.manage_terraform_label ? 1 : 0

  project     = data.gitlab_project.this.id
  name        = var.terraform_label_name
  description = var.terraform_label_description
  color       = var.terraform_label_color
}

# Branch protection: adopts the existing GitLab-side rule on first apply
# (import block below), then enforces the access levels in one plan/apply.
resource "gitlab_branch_protection" "main" {
  count = var.manage_branch_protection ? 1 : 0

  project                = data.gitlab_project.this.id
  branch                 = var.protected_branch
  push_access_level      = var.branch_protection_push_access_level
  merge_access_level     = var.branch_protection_merge_access_level
  unprotect_access_level = "maintainer"
  allow_force_push       = var.branch_protection_allow_force_push

  lifecycle {
    prevent_destroy = true
  }
}

# One-time adoption of the existing protection on main (project id 67295640).
# Only valid while manage_branch_protection = true; delete this block after
# the first successful apply.
import {
  to = gitlab_branch_protection.main[0]
  id = "67295640:main"
}
