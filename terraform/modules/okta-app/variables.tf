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

variable "saml_apps" {
  description = <<-EOT
    OIN (Okta Integration Network) pre-configured SAML apps to manage in this
    org. Keys are stable Terraform addresses. preconfigured_app is the OIN
    catalog name. No SSO secrets: signing certs are Okta-managed, and
    vendor-side trust is configured by hand in the vendor admin console.
  EOT
  type = map(object({
    preconfigured_app  = string
    label              = string
    app_settings_json  = string
    user_name_template = optional(string, "$${source.email}")
  }))
  default = {}

  validation {
    condition = alltrue([
      for app in values(var.saml_apps) :
      length(app.label) > 0 && length(app.preconfigured_app) > 0
    ])
    error_message = "Each saml_apps entry needs a non-empty label and preconfigured_app."
  }

  validation {
    condition = alltrue([
      for app in values(var.saml_apps) : can(jsondecode(app.app_settings_json))
    ])
    error_message = "saml_apps app_settings_json must be valid JSON."
  }
}
