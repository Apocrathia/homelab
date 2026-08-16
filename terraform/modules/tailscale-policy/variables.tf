variable "policy" {
  type        = string
  description = "Complete Tailscale policy file in HuJSON format"

  validation {
    condition     = length(trimspace(var.policy)) > 0
    error_message = "policy must not be empty."
  }
}
