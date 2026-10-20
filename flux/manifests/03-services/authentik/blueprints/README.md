# Authentik blueprints

The last blueprint-mode ConfigMaps: sources and service accounts whose
secrets or error states make tofu the wrong lane. Each yaml here renders
as a `authentik_blueprint`-labeled ConfigMap; the authentik worker
imports them every discovery pass.

What remains and why:

- `okta.yaml` — the aspirational Okta federation source. The blueprint is
  written for a UI-pre-created source that was never created, so the
  blueprint instance errors and retries every pass (harmless, known). Its
  consumer_key/secret are UI-held by design; a tofu resource would have to
  carry the secret in state
- `terraform-service-account.yaml` — the ak-terraform user + token the tofu
  workspaces themselves authenticate with. Tofu managing its own
  bootstrap credentials is a circular dependency (state Secret authed by a
  token the state manages); the blueprint keeps it out of band

Everything else that once lived here moved onto the tofu lane: the app
tiles (`tiles/`), the kubernetes OIDC blueprint (`kube-auth/`), the LDAP
outpost stack (`04-apps/social/tak/`), and the system units (`system/` —
the access-tier groups and the default login flow's MFA stages).

> **Navigation**: [← Back to Authentik README](../README.md)
