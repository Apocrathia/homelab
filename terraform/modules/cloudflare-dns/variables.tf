variable "zone_name" {
  description = "Cloudflare zone apex"
  type        = string

  validation {
    condition     = length(var.zone_name) > 0
    error_message = "zone_name must be non-empty."
  }
}

variable "dns_records" {
  description = <<-EOT
    DNS records to manage in this zone. Keys are stable Terraform addresses.
    Leave handmade / cert-manager challenge records out until imported.
    Use content for A/AAAA/CNAME/TXT/MX; use data for CAA (and similar).
  EOT
  type = map(object({
    name    = string
    type    = string
    content = optional(string)
    ttl     = optional(number, 3600)
    proxied = optional(bool, false)
    comment = optional(string)
    priority = optional(number)
    data = optional(object({
      flags = optional(string)
      tag   = optional(string)
      value = optional(string)
    }))
  }))
  default = {}
}
