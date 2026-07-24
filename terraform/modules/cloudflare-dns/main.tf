# -----------------------------------------------------------------------------
# Cloudflare DNS (zone lookup + managed records)
# -----------------------------------------------------------------------------
# Only records listed in var.dns_records are managed. Everything else in the
# zone stays handmade until imported.

data "cloudflare_zone" "this" {
  filter = {
    name = var.zone_name
  }
}

resource "cloudflare_dns_record" "this" {
  for_each = var.dns_records

  zone_id  = data.cloudflare_zone.this.id
  name     = each.value.name
  type     = each.value.type
  content  = each.value.content
  ttl      = each.value.ttl
  proxied  = each.value.proxied
  comment  = each.value.comment
  priority = each.value.priority
  data     = each.value.data
}
