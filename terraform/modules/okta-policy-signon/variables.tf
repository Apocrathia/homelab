variable "policy_name" {
  description = "Name of the custom sign-on policy"
  type        = string
}

variable "policy_description" {
  description = "Description of the custom sign-on policy"
  type        = string
  default     = ""
}

variable "policy_status" {
  description = "ACTIVE or INACTIVE"
  type        = string
  default     = "ACTIVE"

  validation {
    condition     = contains(["ACTIVE", "INACTIVE"], var.policy_status)
    error_message = "policy_status must be ACTIVE or INACTIVE."
  }
}

variable "policy_priority" {
  description = "Policy priority; lower evaluates first. 1 sits above the system default policy."
  type        = number
  default     = 1
}

variable "rules" {
  description = <<-EOT
    Sign-on rules, evaluated by rule priority inside the policy. Set
    network_connection = "ZONE" and list zone ids in network_includes to scope
    a rule to network zones (ids come from the okta-network-zone unit).
    mfa_prompt: DEVICE (prompt when the device is unknown), SESSION, or ALWAYS.
  EOT
  type = map(object({
    name                = string
    priority            = number
    access              = string
    status              = optional(string, "ACTIVE")
    network_connection  = optional(string, "ANYWHERE")
    network_includes    = optional(list(string), [])
    mfa_required        = optional(bool, false)
    mfa_prompt          = optional(string)
    mfa_lifetime        = optional(number)
    mfa_remember_device = optional(bool, false)
    primary_factor      = optional(string)
    session_idle        = optional(number)
    session_lifetime    = optional(number)
    session_persistent  = optional(bool, false)
  }))
  default = {}

  validation {
    condition = alltrue([
      for r in values(var.rules) : contains(["ALLOW", "DENY"], r.access)
    ])
    error_message = "Each rule needs access ALLOW or DENY."
  }

  validation {
    condition = alltrue([
      for r in values(var.rules) : contains(["ANYWHERE", "ZONE"], r.network_connection)
    ])
    error_message = "Each rule needs network_connection ANYWHERE or ZONE."
  }

  validation {
    condition = alltrue([
      for r in values(var.rules) :
      r.mfa_prompt == null || contains(["DEVICE", "SESSION", "ALWAYS"], r.mfa_prompt)
    ])
    error_message = "mfa_prompt must be DEVICE, SESSION, or ALWAYS."
  }

  validation {
    condition = alltrue([
      for r in values(var.rules) :
      r.network_connection != "ZONE" || length(r.network_includes) > 0
    ])
    error_message = "A ZONE rule needs at least one zone id in network_includes."
  }
}
