# authenticator: Okta authenticators deployment

Terragrunt unit for the org authenticators and the WebAuthn (passkey) method
settings. Sources `modules/okta-authenticator`. `allow_syncable_passkeys` is
deliberately omitted; the org API returns null for it and the provider fails
the apply.

> **Navigation**: [← Back to okta: Okta deployment](../README.md)
