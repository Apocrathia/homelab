# fleetdm (Authentik system unit)

The tofu-managed home for Fleet DM's SAML + SCIM stack: the staff SAML
provider (Fleet's console login path — JIT role sync via the
`Fleet DM Console Role` mapping, Fleet Premium), the MDM end-user SAML
provider (macOS Setup Assistant via ADE, Windows MDM, Linux Orbit
enrollment — audience must equal
`org_settings.mdm.end_user_authentication.entity_id` in
`fleet/default.yml`), the SCIM backchannel provider (IdP vitals on
hosts) with its custom user mapping, both applications (slugs are the
SAML metadata URLs — never rename), and the admins bindings. Adopt-only,
byte-parity with the live rows: any drift here breaks staff SSO or
device enrollment, not just a config change (see the header notes in
`authentik.tf`).

Three live-held columns are API-exposed but outside the tofu provider
2026.8.0 schema — the SAML providers' `default_name_id_policy` and the
SCIM provider's `discovery_enabled` + `verify_certificates` survive
every apply untouched (tofu updates send only schema fields). The SCIM
token stays UI-held: authentik's serializer keeps it write-only, so it
never enters tofu state and no apply can wipe it
(`authentik.tf` header note).

Retired the `fleet/authentik-blueprint.yaml` ConfigMap — the blueprint
CM prunes and the live objects survive for this Workspace to adopt.

Health flag (2026-10-25): the Fleet SCIM sync threw `ResultTimeout` 5x
on 2026-10-19; today's full syncs run info-clean with one synced user.
The sync path is untouched by this migration.

> **Navigation**: [← Back to Authentik system README](../README.md)
