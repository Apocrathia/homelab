output "acl_id" {
  description = "tailscale_acl resource ID"
  value       = tailscale_acl.policy.id
}

output "dns_configuration_id" {
  description = "tailscale_dns_configuration resource ID"
  value       = tailscale_dns_configuration.this.id
}

output "tailnet_settings_id" {
  description = "tailscale_tailnet_settings resource ID"
  value       = tailscale_tailnet_settings.this.id
}
