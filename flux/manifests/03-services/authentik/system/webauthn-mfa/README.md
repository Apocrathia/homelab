# webauthn-mfa (Authentik system unit)

The tofu-managed tuning of the three upstream-shipped default stages that
gate every login: the WebAuthn setup stage (roaming, platform, and
passkey-manager authenticators), the MFA validation stage (WebAuthn
primary, static recovery codes fallback), and the login identification
stage (passkey autofill from the username field). This pair ADOPTS the
live upstream stages — it never creates or deletes them; a fresh create
would fork the default login flow's stage set.

The MFA deny-switch stays off deliberately: three active users still have
no authenticator enrolled, so `not_configured_action` keeps its live
`configure` value until enrollment coverage is complete (see the header
note in `authentik.tf` for the live witness list).

Retired the `blueprints/webauthn-mfa.yaml` ConfigMap — the blueprint CM
prunes and the live stages survive for this workspace to adopt.

> **Navigation**: [← Back to Authentik system README](../README.md)
