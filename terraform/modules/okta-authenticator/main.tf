# -----------------------------------------------------------------------------
# Okta authenticators
# -----------------------------------------------------------------------------
# Org authenticators (Identity Engine only) from var.authenticators, keyed by
# a stable Terraform address. Okta never truly deletes authenticators: creating
# an existing key is a soft import, destroy only deactivates. legacy_ignore_name
# defaults true so a display name renamed in the Admin UI does not produce a
# rename-back diff.
#
# var.webauthn configures the WebAuthn (Security Key / FIDO2) method: passkey
# settings like syncable passkeys, attachment, and user verification. The
# method always exists in an Identity Engine org; this only manages its
# settings (destroy resets them to Okta defaults).

resource "okta_authenticator" "this" {
  for_each = var.authenticators

  key                = each.value.key
  name               = each.value.name
  status             = each.value.status
  settings           = each.value.settings
  legacy_ignore_name = each.value.legacy_ignore_name
}

# Lookup only when the method is managed but the authenticator is NOT in
# var.authenticators (settings-only case). When webauthn is in the map, the
# method takes the resource id directly — a depends_on here would defer this
# read to apply time, and core rejects deferred data in required attributes.
data "okta_authenticator" "webauthn" {
  count = var.webauthn != null && !contains(keys(var.authenticators), "webauthn") ? 1 : 0

  key = "webauthn"
}

resource "okta_authenticator_method_webauthn" "this" {
  count = var.webauthn == null ? 0 : 1

  authenticator_id = contains(keys(var.authenticators), "webauthn") ? okta_authenticator.this["webauthn"].id : data.okta_authenticator.webauthn[0].id

  user_verification                  = var.webauthn.user_verification
  user_verification_for_verify       = var.webauthn.user_verification_for_verify
  attachment                         = var.webauthn.attachment
  allow_syncable_passkeys            = var.webauthn.allow_syncable_passkeys
  enable_autofill_ui                 = var.webauthn.enable_autofill_ui
  resident_key_requirement           = var.webauthn.resident_key_requirement
  show_sign_in_with_a_passkey_button = var.webauthn.show_sign_in_with_a_passkey_button
  hardware_protected                 = var.webauthn.hardware_protected
  fips_compliant                     = var.webauthn.fips_compliant
  cert_based_attestation_validation  = var.webauthn.cert_based_attestation_validation

  dynamic "aaguid_group" {
    for_each = var.webauthn.aaguid_groups
    content {
      name    = aaguid_group.key
      aaguids = aaguid_group.value.aaguids
    }
  }
}
