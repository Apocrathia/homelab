# -----------------------------------------------------------------------------
# Okta authenticators
# -----------------------------------------------------------------------------
# Org authenticators + WebAuthn (passkey / FIDO2) method settings. webauthn is
# activated and its method configured for passkeys (syncable passkeys allowed,
# any attachment, autofill + sign-in button). Add more entries to authenticators
# to manage email/phone/etc.
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
  source = "../../../modules/okta-authenticator"
}

inputs = {
  onepassword_vault_name            = "Secrets"
  onepassword_okta_token_item_title = "okta-terraform-secrets"

  authenticators = {
    webauthn = {
      key  = "webauthn"
      name = "Security Key or Built-in Authenticator"
    }
  }

  webauthn = {
    allow_syncable_passkeys            = true
    attachment                         = "ANY"
    user_verification                  = "PREFERRED"
    show_sign_in_with_a_passkey_button = true
    enable_autofill_ui                 = true
  }
}
