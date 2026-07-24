output "zone_id" {
  description = "Cloudflare zone ID"
  value       = data.cloudflare_zone.this.id
}

output "zone_name" {
  description = "Cloudflare zone name"
  value       = data.cloudflare_zone.this.name
}

output "record_ids" {
  description = "Map of dns_records keys to Cloudflare record IDs"
  value       = { for k, r in cloudflare_dns_record.this : k => r.id }
}
