output "network_zone_ids" {
  description = "Map of network_zones keys to Okta network zone ids"
  value       = { for k, zone in okta_network_zone.this : k => zone.id }
}
