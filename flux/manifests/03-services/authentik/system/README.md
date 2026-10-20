# Authentik system units

Tofu-managed authentik-internal state (not app tiles): the access-tier
groups and the default login flow's MFA stages, migrated off the retired
`blueprints/` ConfigMaps onto the canonical file pair — one folder per
unit, `crossplane.yaml` (ProviderConfig + Workspace, ns authentik) +
`authentik.tf` (the module), stitched by each unit's `kustomization.yaml`.
Every unit ADOPTS its live blueprint-created or upstream-shipped objects
via for_each-gated imports; witness ids ride the merge-gate varmap only,
never git.

All units share the one ns-authentik `authentik-terraform-token` Secret
rendered by `tiles/authentik-terraform-token.yaml` — that Secret is the
tier's shared substrate and must outlive any single unit.

## Units

- `app-access/` — the `admins` + `users` IdP groups every application
  binds against; adopt-only, membership stays UI-managed
- `webauthn-mfa/` — the upstream WebAuthn/MFA/identification stages that
  gate the default login flow; adopt-only, deny-switch deliberately off

> **Navigation**: [← Back to Authentik README](../README.md)
