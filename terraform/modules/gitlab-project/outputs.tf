output "project_id" {
  description = "Numeric GitLab project id"
  value       = data.gitlab_project.this.id
}

output "project_path" {
  description = "path_with_namespace"
  value       = data.gitlab_project.this.path_with_namespace
}

output "terraform_label_id" {
  description = "Label id when manage_terraform_label is true; null otherwise"
  value       = try(gitlab_project_label.managed_by_terraform[0].label_id, null)
}
