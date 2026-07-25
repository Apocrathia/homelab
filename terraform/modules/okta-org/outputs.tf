output "oauth_client_ids" {
  description = "Map of oauth_apps keys to OAuth client ids (non-secret)"
  value       = { for k, app in okta_app_oauth.this : k => app.client_id }
}

output "oauth_app_ids" {
  description = "Map of oauth_apps keys to Okta application ids"
  value       = { for k, app in okta_app_oauth.this : k => app.id }
}
