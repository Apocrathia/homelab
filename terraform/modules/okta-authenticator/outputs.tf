output "authenticator_ids" {
  description = "Map of authenticators keys to Okta authenticator ids"
  value       = { for k, a in okta_authenticator.this : k => a.id }
}

output "webauthn_authenticator_id" {
  description = "Okta authenticator id behind the WebAuthn method config (null when webauthn is unmanaged)"
  value = var.webauthn == null ? null : (
    contains(keys(var.authenticators), "webauthn")
    ? okta_authenticator.this["webauthn"].id
    : data.okta_authenticator.webauthn[0].id
  )
}
