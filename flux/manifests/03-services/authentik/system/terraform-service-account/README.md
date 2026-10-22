# terraform-service-account (Authentik system unit)

The tofu-managed home for the tofu tier's own bootstrap identity: the
`terraform-workspace-manager` role, the `ak-terraform` service account,
and the API token every authentik tofu workspace — this one included —
authenticates with. That circularity is the unit's whole hazard profile:
the pair ADOPTS all three objects and never creates, rotates, or deletes
anything; the plan staying at No changes keeps the token stable and the
workspaces online (see the header notes in `authentik.tf`).

The role's 60 live permission rows stay deliberately unmanaged: the
`authentik_rbac_permission_role` resource is unusable on provider
2026.8.0 (ID-space bug; upstream fix !5530 unreleased), so the role
models name-only and the rows keep living on the blueprint grants. Do
NOT re-import the retired blueprint — its one-shot apply would truncate
the role back to 30 permissions and 403 the whole tier.

Retired the `blueprints/terraform-service-account.yaml` ConfigMap — the
blueprint CM prunes and the live objects survive for this workspace to
adopt.

> **Navigation**: [← Back to Authentik system README](../README.md)
