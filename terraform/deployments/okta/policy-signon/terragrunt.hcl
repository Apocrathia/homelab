# -----------------------------------------------------------------------------
# Okta sign-on policy (network zone wiring)
# -----------------------------------------------------------------------------
# Custom sign-on policy above the system default:
#   1. DENY from the Tor Anonymizers blocklist zone
#   2. ALLOW from trusted zones (Home Egress + Tailscale) — MFA required,
#      preferred-style: DEVICE prompt + remembered devices
#   3. ALLOW everywhere else — MFA required at every sign-in attempt
#
# Zone ids come from the okta/network-zone unit (terragrunt dependency).
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
  source = "../../../modules/okta-policy-signon"
}

dependency "network_zone" {
  config_path = "../network-zone"
}

inputs = {
  onepassword_vault_name            = "Secrets"
  onepassword_okta_token_item_title = "okta-terraform-secrets"

  policy_name        = "Zone Sign-On"
  policy_description = "Deny anonymizers; preferred MFA on trusted zones; MFA everywhere else."
  policy_priority    = 1

  rules = {
    deny-anonymizers = {
      name               = "Deny Anonymizers"
      priority           = 1
      access             = "DENY"
      network_connection = "ZONE"
      network_includes   = [dependency.network_zone.outputs.network_zone_ids["tor-anonymizers"]]
    }
    trusted-zones = {
      name               = "Trusted Zones"
      priority           = 2
      access             = "ALLOW"
      network_connection = "ZONE"
      network_includes = [
        dependency.network_zone.outputs.network_zone_ids["home-egress"],
        dependency.network_zone.outputs.network_zone_ids["tailscale-cgnat"],
      ]
      mfa_required        = true
      mfa_prompt          = "DEVICE"
      mfa_remember_device = true
      primary_factor      = "PASSWORD_IDP_ANY_FACTOR"
      session_idle        = 120
      session_lifetime    = 1440
    }
    require-mfa-elsewhere = {
      name               = "Require MFA Elsewhere"
      priority           = 3
      access             = "ALLOW"
      network_connection = "ANYWHERE"
      mfa_required       = true
      mfa_prompt         = "ALWAYS"
      primary_factor     = "PASSWORD_IDP_ANY_FACTOR"
      session_idle       = 120
      session_lifetime   = 1440
    }
  }
}
