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
- `openclaw-cleanup.yaml` — the one-shot `state: absent` companion that
  deletes the retired openclaw proxy provider + outpost; a state:absent
  companion has no tofu shape to migrate to

Everything else that once lived here moved onto the tofu lane: the app
tiles (`tiles/`), the kubernetes OIDC blueprint (`kube-auth/`), the LDAP
outpost stack (`04-apps/social/tak/`), and the system units (`system/` —
the access-tier groups, the default login flow's MFA stages, the tofu
tier's own service account, and the kube-apiserver's OIDC issuer). The
service account moved last of all: its circularity (tofu authenticating
with the very token it manages) resolves on the adoption gate — the
`system/terraform-service-account/` pair adopts the live token and never
rotates it.

> **Navigation**: [← Back to Authentik README](../README.md)
