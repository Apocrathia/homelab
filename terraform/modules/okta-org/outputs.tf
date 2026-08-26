output "oauth_client_ids" {
  description = "Map of oauth_apps keys to OAuth client ids (non-secret)"
  value       = { for k, app in okta_app_oauth.this : k => app.client_id }
}

output "oauth_app_ids" {
  description = "Map of oauth_apps keys to Okta application ids"
  value       = { for k, app in okta_app_oauth.this : k => app.id }
}

output "network_zone_ids" {
  description = "Map of network_zones keys to Okta network zone ids"
  value       = { for k, zone in okta_network_zone.this : k => zone.id }
}
