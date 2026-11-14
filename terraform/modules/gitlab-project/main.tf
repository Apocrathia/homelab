# -----------------------------------------------------------------------------
# GitLab project (scaffold)
# -----------------------------------------------------------------------------
# Looks up an existing project and optionally manages a single label
# (managed-by-terraform). Provider credentials come from the generated
# provider.tf (1Password ephemeral → gitlab provider), not from this module.

data "gitlab_project" "this" {
  path_with_namespace = var.project_path
}

# Project adoption: required to manage topics (they are project metadata, and
# the provider has no scoped topics resource). Config only sets attributes
# that are optional-without-computed in provider v19 (everything else keeps
# the live API values after import).
resource "gitlab_project" "this" {
  count = var.manage_project ? 1 : 0

  name        = basename(var.project_path)
  description = var.project_description

  resolve_outdated_diff_discussions = var.resolve_outdated_diff_discussions

  # Marker topic on every managed repo. topics is owned as a full set: topics
  # added via the UI are removed on the next apply.
  topics = setunion(var.project_topics, [var.terraform_topic_name])

  lifecycle {
    prevent_destroy = true
  }
}

# One-time adoption of the existing project (id 67295640). Only valid while
# manage_project = true; delete this block after the first successful apply.
import {
  to = gitlab_project.this[0]
  id = "67295640"
}

locals {
  project_id = var.manage_project ? gitlab_project.this[0].id : data.gitlab_project.this.id
}

resource "gitlab_project_label" "managed_by_terraform" {
  count = var.manage_terraform_label ? 1 : 0

  project     = local.project_id
  name        = var.terraform_label_name
  description = var.terraform_label_description
  color       = var.terraform_label_color
}

# Branch protection: adopts the existing GitLab-side rule on first apply
# (import block below), then enforces the access levels. Uses the EE
# allowed_to_* attributes: access changes are in-place updates on gitlab.com,
# unlike the CE string attrs (push_access_level/merge_access_level), which are
# ForceNew and not available for EE. Requires provider >= 19 (v18 marks the
# nested attributes read-only).
resource "gitlab_branch_protection" "main" {
  count = var.manage_branch_protection ? 1 : 0

  project          = local.project_id
  branch           = var.protected_branch
  allow_force_push = var.branch_protection_allow_force_push

  allowed_to_push = [{
    access_level = var.branch_protection_push_access_level
  }]

  allowed_to_merge = [{
    access_level = var.branch_protection_merge_access_level
  }]

  allowed_to_unprotect = [{
    access_level = "maintainer"
  }]

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

# GitHub push mirror: codifies the existing GitLab → GitHub mirror.
# Token comes from an env-provided variable (masked CI var) because the
# push mirror resource embeds credentials in the url and Terragrunt cannot
# pass ephemeral resource values into module inputs.
resource "gitlab_project_push_mirror" "github" {
  count = var.manage_push_mirror ? 1 : 0

  project                 = local.project_id
  url                     = "https://${var.github_mirror_username}:${var.github_mirror_token}@github.com/${var.github_mirror_repo}.git"
  only_protected_branches = var.github_mirror_only_protected_branches
  keep_divergent_refs     = var.github_mirror_keep_divergent_refs
}

# One-time adoption of the existing push mirror (id 2972203 on project 67295640).
# Only valid while manage_push_mirror = true; delete this block after the first
# successful apply.  Note: the provider cannot round-trip url-embedded credentials,
# so this import forces a replace (new mirror_id, same destination).
import {
  to = gitlab_project_push_mirror.github[0]
  id = "67295640:2972203"
}
