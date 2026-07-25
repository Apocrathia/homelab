variable "oauth_apps" {
  description = <<-EOT
    OIDC web apps to manage in this org. Keys are stable Terraform addresses.
    Client secrets use omit_secret=true — read once from the Okta Admin UI into
    1Password; they are never TF outputs.
  EOT
  type = map(object({
    label        = string
    redirect_uri = string
    login_uri    = string
  }))
  default = {}

  validation {
    condition = alltrue([
      for app in values(var.oauth_apps) : length(app.label) > 0
    ])
    error_message = "Each oauth_apps entry needs a non-empty label."
  }

  validation {
    condition = alltrue([
      for app in values(var.oauth_apps) :
      startswith(app.redirect_uri, "https://") && startswith(app.login_uri, "https://")
    ])
    error_message = "oauth_apps redirect_uri and login_uri must be https URLs."
  }
}
