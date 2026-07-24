# Root Terragrunt configuration
# All child configurations inherit remote state from this file.
# Provider blocks live under terraform/providers/ and are included per stack.

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

  # Path relative to this root include (named — required when stacks also
  # include providers/*.hcl). Bare path_relative_to_include() keys off the
  # wrong include and injects ".." into the state URL.
  state_key = replace(path_relative_to_include("root"), "/", "-")
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
