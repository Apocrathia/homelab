variable "network_zones" {
  description = <<-EOT
    Network zones to manage in this org. Keys are stable Terraform addresses.
    Zones are inert until a sign-in or password policy references them. Set
    include_egress_ip = true to append the plan-time public egress IP (/32)
    to gateways — home egress is dynamic, so never hardcode it.
  EOT
  type = map(object({
    name               = string
    type               = string
    usage              = optional(string, "POLICY")
    gateways           = optional(set(string), [])
    proxies            = optional(set(string), [])
    dynamic_proxy_type = optional(string)
    include_egress_ip  = optional(bool, false)
  }))
  default = {}

  validation {
    condition = alltrue([
      for z in values(var.network_zones) : contains(["IP", "DYNAMIC", "DYNAMIC_V2"], z.type)
    ])
    error_message = "Each network_zones entry needs type IP, DYNAMIC, or DYNAMIC_V2."
  }

  validation {
    condition = alltrue([
      for z in values(var.network_zones) : contains(["POLICY", "BLOCKLIST"], z.usage)
    ])
    error_message = "Each network_zones entry needs usage POLICY or BLOCKLIST."
  }
}

variable "egress_probe_url" {
  description = "Plaintext URL returning the public egress IP; read on every plan/apply for include_egress_ip zones."
  type        = string
  default     = "https://icanhazip.com"
}

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
