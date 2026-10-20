# app-access (Authentik system unit)

The tofu-managed home for the two IdP-level access groups: `admins`
(operator group, bound to every application) and `users` (friends group,
bound only to explicitly shared applications). This pair ADOPTS the live
blueprint-created groups — it never creates or deletes them; every other
tofu pair and application references these groups by NAME as
`data.authentik_group`, so the names are the API contract.

Group membership is UI-managed and deliberately outside tofu scope: the
provider never pulls members into state, and the plan staying at No
changes keeps it that way (see the membership landmine note in
`authentik.tf` before touching any field on these resources).

Retired the `blueprints/app-access.yaml` ConfigMap — the blueprint CM
prunes and the live groups survive for this workspace to adopt.

> **Navigation**: [← Back to Authentik system README](../README.md)
