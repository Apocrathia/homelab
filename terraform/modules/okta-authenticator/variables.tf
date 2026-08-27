variable "authenticators" {
  description = <<-EOT
    Org authenticators to manage. Map keys are stable Terraform addresses (use
    the Okta key, e.g. "webauthn"). Creating an existing key is a soft import;
    destroy only deactivates. settings is the raw jsonencode()d Okta settings
    object for that key (e.g. {"allowedFor" = "recovery"} for email/phone);
    not used for webauthn — see var.webauthn instead.
  EOT
  type = map(object({
    key                = string
    name               = string
    status             = optional(string, "ACTIVE")
    settings           = optional(string)
    legacy_ignore_name = optional(bool, true)
  }))
  default = {}

  validation {
    condition = alltrue([
      for a in values(var.authenticators) : contains(["ACTIVE", "INACTIVE"], a.status)
    ])
    error_message = "Each authenticators entry needs status ACTIVE or INACTIVE."
  }

  validation {
    condition = alltrue([
      for a in values(var.authenticators) : contains([
        "custom_app", "custom_otp", "duo", "external_idp", "google_otp",
        "okta_email", "okta_password", "okta_verify", "onprem_mfa",
        "phone_number", "rsa_token", "security_question", "webauthn",
      ], a.key)
    ])
    error_message = "Each authenticators entry needs a key known to the Okta provider (e.g. webauthn, okta_email, phone_number)."
  }
}

variable "webauthn" {
  description = <<-EOT
    WebAuthn (Security Key / FIDO2) method settings — the passkey levers.
    null (default) leaves the org's settings untouched. Attachment: ANY
    (passkeys + roaming security keys), PLATFORM (device-bound only), or
    CROSS_PLATFORM (roaming keys only). aaguid_groups keys are group names.
    The provider always sends this list: {} asserts Okta's default (no custom
    AAGUID groups), so existing custom org groups must be declared here or the
    first apply clears them. Omitted scalars (e.g. hardware_protected) are
    safe — null keeps the org value.
  EOT
  type = object({
    user_verification                  = optional(string, "PREFERRED")
    user_verification_for_verify       = optional(string)
    attachment                         = optional(string, "ANY")
    # Omit (null) on orgs whose API does not return this field: the provider
    # errors with "Provider produced inconsistent result" when it writes true
    # and reads back null.
    allow_syncable_passkeys            = optional(bool)
    enable_autofill_ui                 = optional(bool, true)
    resident_key_requirement           = optional(string)
    show_sign_in_with_a_passkey_button = optional(bool, true)
    hardware_protected                 = optional(bool)
    fips_compliant                     = optional(bool)
    cert_based_attestation_validation  = optional(bool)
    aaguid_groups = optional(map(object({
      aaguids = set(string)
    })), {})
  })
  default = null

  validation {
    condition     = var.webauthn == null || contains(["DISCOURAGED", "PREFERRED", "REQUIRED"], var.webauthn.user_verification)
    error_message = "webauthn.user_verification must be DISCOURAGED, PREFERRED, or REQUIRED."
  }

  validation {
    condition     = var.webauthn == null || var.webauthn.user_verification_for_verify == null || contains(["DISCOURAGED", "PREFERRED", "REQUIRED"], var.webauthn.user_verification_for_verify)
    error_message = "webauthn.user_verification_for_verify must be DISCOURAGED, PREFERRED, or REQUIRED."
  }

  validation {
    condition     = var.webauthn == null || contains(["ANY", "PLATFORM", "CROSS_PLATFORM"], var.webauthn.attachment)
    error_message = "webauthn.attachment must be ANY, PLATFORM, or CROSS_PLATFORM."
  }

  validation {
    condition     = var.webauthn == null || var.webauthn.resident_key_requirement == null || contains(["DISCOURAGED", "PREFERRED", "REQUIRED"], var.webauthn.resident_key_requirement)
    error_message = "webauthn.resident_key_requirement must be DISCOURAGED, PREFERRED, or REQUIRED."
  }
}
