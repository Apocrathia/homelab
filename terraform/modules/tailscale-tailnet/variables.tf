variable "acl_policy" {
  description = "Tailnet policy file contents (HuJSON or JSON). Managed whole by tailscale_acl."
  type        = string

  validation {
    condition     = length(var.acl_policy) > 0
    error_message = "acl_policy must be non-empty."
  }
}

variable "dns_magic_dns" {
  description = "Enable MagicDNS"
  type        = bool
  default     = true
}

variable "dns_override_local_dns" {
  description = "Prefer configured nameservers over local DNS for non-tailnet queries"
  type        = bool
  default     = false
}

variable "dns_search_paths" {
  description = "Additional DNS search domains"
  type        = list(string)
  default     = []
}

variable "dns_split_dns" {
  description = "Split DNS: map of domain => nameservers"
  type        = map(list(string))
  default     = {}
}

variable "acls_externally_managed_on" {
  description = "Lock the admin console's policy editor (policy file is managed here)"
  type        = bool
  default     = false
}

variable "acls_external_link" {
  description = "URL shown in the console for the external policy manager"
  type        = string
  default     = null
}
