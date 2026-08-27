# -----------------------------------------------------------------------------
# Okta sign-on policy (network zone wiring)
# -----------------------------------------------------------------------------
# Custom sign-on policy above the system default:
#   1. ALLOW from trusted zones (Home Egress + Tailscale) — MFA required,
#      preferred-style: DEVICE prompt + remembered devices
#   2. ALLOW everywhere else — MFA required at every sign-in attempt
#
# Tor anonymizers are denied by the BLOCKLIST "Tor Anonymizers" zone itself —
# blocklist zones are enforced globally by Okta and cannot be referenced in
# policy rules (the API rejects them).
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
  policy_description = "Tor denied via blocklist zone; preferred MFA on trusted zones; MFA everywhere else."
  policy_priority    = 1

  rules = {
    trusted-zones = {
      name               = "Trusted Zones"
      priority           = 1
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
      priority           = 2
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
