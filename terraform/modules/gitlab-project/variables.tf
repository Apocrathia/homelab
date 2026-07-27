variable "project_path" {
  type        = string
  description = "GitLab project path_with_namespace (e.g. Apocrathia/homelab)"

  validation {
    condition     = length(var.project_path) > 0 && can(regex(".+/.+", var.project_path))
    error_message = "project_path must look like group/project."
  }
}

variable "manage_terraform_label" {
  type        = bool
  description = "When true, create/manage the managed-by-terraform project label. Leave false for the read-only auth spike."
  default     = false
}

variable "terraform_label_name" {
  type        = string
  description = "Name of the project label that marks Terraform ownership"
  default     = "managed-by-terraform"
}

variable "terraform_label_description" {
  type        = string
  description = "Description for the managed-by-terraform label"
  default     = "Resources in this project are managed by OpenTofu/Terragrunt in-repo"
}

variable "terraform_label_color" {
  type        = string
  description = "Label color (hex with leading # or a CSS color name)"
  default     = "#428BCA"
}
