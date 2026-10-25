# Authentik system units

Tofu-managed authentik-internal state (not app tiles): the access-tier
groups, the default login flow's MFA stages, the tofu tier's own service
account, and the kube-apiserver's OIDC issuer — migrated off the retired
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
- `terraform-service-account/` — the tofu tier's own role + service
  account + API token; adopt-only (the token never rotates), the 60
  live permission rows stay unmanaged (provider ID-space bug)
- `kubernetes/` — the kube-apiserver's OIDC issuer (`kubernetes-oidc-provider`,
  tier groups, scope mappings, hidden application, admins binding);
  adopt-only, byte-parity with the live provider row
- `fleetdm/` — Fleet DM's SAML + SCIM stack (staff + MDM SAML providers,
  SCIM backchannel + custom user mapping, both applications, admins
  bindings); adopt-only, byte-parity with the live rows

> **Navigation**: [← Back to Authentik README](../README.md)
