# -----------------------------------------------------------------------------
# Tailscale tailnet (policy file, DNS, tailnet settings)
# -----------------------------------------------------------------------------
# tailscale_acl manages the WHOLE policy file; import the live policy before
# first apply and keep the deployment's policy.hujson as the single source of
# truth. Do not mix tailscale_dns_configuration with the legacy dns_* resources.
#
# Global DNS resolver: NextDNS linked address, derived from the profile ID
# stored in section "dns" of the auth item (kept out of public git).

data "onepassword_vault" "this" {
  name = var.onepassword_vault_name
}

data "onepassword_item" "tailscale_secrets" {
  vault = data.onepassword_vault.this.uuid
  title = var.onepassword_tailscale_token_item_title

  section_map = {
    dns = {}
  }
}

locals {
  nextdns_id = data.onepassword_item.tailscale_secrets.section_map["dns"].field_map["nextdns-id"].value

  # NextDNS linked-IPv6 encoding: 2a07:a8c0::<first 2 hex>:<last 4 hex> of the
  # profile ID. Reproduces the resolver already configured on the tailnet.
  nextdns_nameservers = [
    format("2a07:a8c0::%s:%s", substr(local.nextdns_id, 0, 2), substr(local.nextdns_id, 2, 4)),
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
    for_each = local.nextdns_nameservers
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
