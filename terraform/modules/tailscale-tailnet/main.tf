# -----------------------------------------------------------------------------
# Tailscale tailnet (policy file, DNS, tailnet settings)
# -----------------------------------------------------------------------------
# tailscale_acl manages the WHOLE policy file; import the live policy before
# first apply and keep the deployment's policy.hujson as the single source of
# truth. Do not mix tailscale_dns_configuration with the legacy dns_* resources.
#
# Global DNS resolver: ControlD legacy resolvers (premium profile, source-IP
# authorized via DDNS — the resolver IPs are non-secret and safe to commit).

locals {
  controld_nameservers = [
    "76.76.2.111",
    "76.76.10.111",
    "2606:1a40:0:8:2cff:59b4:ad7b:0",
    "2606:1a40:1:8:2cff:59b4:ad7b:0",
  ]
}

resource "tailscale_acl" "policy" {
  acl = var.acl_policy
}

resource "tailscale_dns_configuration" "this" {
  magic_dns          = var.dns_magic_dns
  override_local_dns = var.dns_override_local_dns
  search_paths       = var.dns_search_paths

  dynamic "nameservers" {
    for_each = local.controld_nameservers
    content {
      address = nameservers.value
    }
  }

  dynamic "split_dns" {
    for_each = var.dns_split_dns
    content {
      domain = split_dns.key

      dynamic "nameservers" {
        for_each = split_dns.value
        content {
          address = nameservers.value
        }
      }
    }
  }
}

resource "tailscale_tailnet_settings" "this" {
  # Wave 1 manages only the ACL lockout toggle; leave remaining settings
  # unset until the client has the settings scope and values are imported.
  acls_externally_managed_on = var.acls_externally_managed_on
  acls_external_link         = var.acls_external_link
}
