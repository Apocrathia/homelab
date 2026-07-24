# -----------------------------------------------------------------------------
# Cloudflare DNS
# -----------------------------------------------------------------------------
# Public DNS RRsets live here (they're public once published). Auth only:
#   CLOUDFLARE_API_TOKEN — Zone:DNS:Edit + Zone:Zone:Read (1Password → .env)
#
# Leave cert-manager _acme-challenge records for other names out of this map.
# Okta's _acme-challenge.okta is vendor verification for the custom domain.

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

  dns_records = {
    "okta-acme-challenge" = {
      name    = "_acme-challenge.okta"
      type    = "TXT"
      content = "8dvbksPgfWfjfP6szb7Wh3u8bUfnWj5ocnNftBkMMe4"
      ttl     = 3600
      proxied = false
      comment = "Okta custom domain ACME challenge"
    }
    "okta-caa" = {
      name = "okta"
      type = "CAA"
      ttl  = 3600
      data = {
        flags = "0"
        tag   = "issue"
        value = "letsencrypt.org"
      }
      comment = "Okta custom domain CAA"
    }
    "okta-cname" = {
      name    = "okta"
      type    = "CNAME"
      content = "integrator-5477892.customdomains.okta.com"
      ttl     = 3600
      proxied = false
      comment = "Okta custom domain"
    }
  }
}
