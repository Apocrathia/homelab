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
