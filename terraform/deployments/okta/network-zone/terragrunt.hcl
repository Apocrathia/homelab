# -----------------------------------------------------------------------------
# Okta network zones
# -----------------------------------------------------------------------------
# Network zones are inert until a sign-in or password policy references them.
#
# Home egress IP is dynamic: home-egress gets it from the plan-time probe
# (egress_probe_url default https://icanhazip.com), never hardcoded here.
#
# Auth (1Password Connect — no OKTA_API_TOKEN in env):
#   OP_CONNECT_HOST  — http://onepassword-connect.onepassword-system.svc:8080
#   OP_CONNECT_TOKEN — Connect API token with read on the vault
#   TF_HTTP_*        — state backend
#
# Do NOT export OKTA_API_TOKEN. Do NOT commit vault UUIDs.

include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/providers/okta.hcl"
}

terraform {
  source = "../../../modules/okta-network-zone"
}

inputs = {
  onepassword_vault_name            = "Secrets"
  onepassword_okta_token_item_title = "okta-terraform-secrets"

  network_zones = {
    home-egress = {
      name              = "Home Egress"
      type              = "IP"
      include_egress_ip = true
    }
    tailscale-cgnat = {
      name     = "Tailscale"
      type     = "IP"
      gateways = ["100.64.0.0/10"]
    }
    tor-anonymizers = {
      name               = "Tor Anonymizers"
      type               = "DYNAMIC"
      usage              = "BLOCKLIST"
      dynamic_proxy_type = "TorAnonymizer"
    }
  }
}
