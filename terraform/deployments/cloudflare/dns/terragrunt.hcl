# -----------------------------------------------------------------------------
# Cloudflare DNS
# -----------------------------------------------------------------------------
# Public DNS RRsets live here (they're public once published). Auth only:
#   CLOUDFLARE_API_TOKEN — Zone:DNS:Edit + Zone:Zone:Read (1Password → .env)
#
# Leave cert-manager _acme-challenge records for other names out of this map.

include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/providers/cloudflare.hcl"
}

terraform {
  source = "../../../modules/cloudflare-dns"
}

inputs = {
  zone_name = "apocrathia.com"

  # Add public records here (Okta custom domain, etc.). Empty = zone lookup only.
  dns_records = {}
}
