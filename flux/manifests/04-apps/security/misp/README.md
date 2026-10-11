# MISP

MISP (Malware Information Sharing Platform) — open-source threat-intelligence
sharing platform for collecting, storing, and distributing IOCs, feeds, and
event data. Deployed from the official misp-docker images via the
[cmu-sei/misp-helm](https://github.com/cmu-sei/misp-helm) chart.

> **Navigation**: [← Back to Security README](../README.md)

## Overview

This deployment includes:

- MISP core (misp-core, official `ghcr.io/misp/misp-docker` image) with
  workers running in-container under supervisord
- misp-modules enrichment service (official image)
- Bitnami MariaDB subchart (single standalone instance, Longhorn)
- valkey subchart (cache and background-job queue, no persistence)
- Gateway API HTTPRoute on `main-gateway` (chart-rendered, Gateway API only —
  the chart's nginx Ingress is disabled)

## Access

- **URL**: `https://misp.gateway.services.apocrathia.com`
- **Internal Service**: `http://misp.misp.svc.cluster.local:80`
- **Login**: Authentik SSO (see [SSO](#sso-authentik-oidc)) — the `admins`
  group gets MISP site-admin. Local admin login stays enabled as
  break-glass, credentials from 1Password `misp-secrets`
  (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Chart source

The chart has no published helm index, so it is consumed via the `misp`
GitRepository (`flux/manifests/01-bootstrap/helm/repositories/misp.yaml`)
pinned to git tag `v5.0.1` — the tracearr pattern. Flux ignores the
HelmRelease `chart.spec.version` for GitRepository sources, so the **git tag
is the chart version pin**; Renovate tracks it via the `git-tags` datasource
annotation on that file.

Subchart dependencies (bitnami mariadb 19.0.5, valkey 0.9.4, ntppool smtp
2.4.0) are resolved by the source controller from the Chart.yaml repositories
when it packages the chart from the git tree.

## Images and update strategy

Chart defaults misp-core and misp-modules to `latest` — both are pinned here
with tag + digest and Renovate annotations:

- `ghcr.io/misp/misp-docker/misp-core:v2.5.44` — matches chart appVersion
  (2.5.44)
- `ghcr.io/misp/misp-docker/misp-modules:v3.0.9` — the upstream
  `misp-docker` pairing for core v2.5.44 (`template.env` history)
- `docker.io/bitnamilegacy/mariadb:10.11.9-debian-12-r3` — the chart default
  is `latest`; pinned to the MariaDB 10.11 line that misp-docker's compose
  uses. volumePermissions `bitnamilegacy/os-shell` and valkey 9.0.2 ride
  their subchart defaults (deterministic per subchart version)

Updates are deliberate: chart tag + the core/modules image pair bump together
(MISP follows the chart appVersion; appVersion lags MISP upstream by a few
releases — accepted, research doc risk 1). Renovate drafts; Trivy/gitleaks
gate.

## Secrets

1Password item `vaults/Secrets/items/misp-secrets` (slice 1). Fields and
consumers:

| Field                   | Consumer                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MYSQL_ROOT_PASSWORD`   | valuesFrom → `mariadb.auth.rootPassword`                                                                                                                                                                     |
| `MYSQL_PASSWORD`        | valuesFrom → `mariadb.auth.password`; ExternalSecret → `misp-mysql-credentials` (`password` key)                                                                                                             |
| `REDIS_PASSWORD`        | valuesFrom → valkey ACL default user; postRenderers → misp/misp-modules pods                                                                                                                                 |
| `ADMIN_EMAIL`           | valuesFrom → `env.mispEmail`; postRenderers → `ADMIN_EMAIL` env                                                                                                                                              |
| `ADMIN_PASSWORD`        | postRenderers → `ADMIN_PASSWORD` env (entrypoint resets admin user 1 password on every container start — vault is desired state)                                                                             |
| `username` / `password` | OIDC client credentials read directly from the `misp-secrets` Secret: `username` = pinned client_id `misp`, `password` = authentik-generated client secret, copied by the operator post-merge (step 1 below) |

How the chart expects credentials:

- `misp-mysql-credentials` (externalsecret.yaml): `username: misp` (static,
  matches `mariadb.auth.username`) + `password` from the vault — the chart
  template reads `MYSQL_USER`/`MYSQL_PASSWORD` from this shape.
- `misp-secrets` (secret.yaml, OnePasswordItem): carries the app fields plus
  `username` / `password` (OIDC client_id `misp` + the authentik-generated
  secret — operator-copied post-merge). The former ESO remap
  (`misp-oidc-credentials`) is retired.
- The chart writes the Redis password into ConfigMaps by design; the
  HelmRelease postRenderers strip those keys and inject `REDIS_PASSWORD` /
  `REDIS_PW` from the Secret instead, so the value only lives in Secret
  objects in-cluster.

### MISP auth key for OpenCTI (slice 6 — `setAPIKey` stays off)

The MISP → OpenCTI connector authenticates with a regular MISP auth key
(read permission). The chart's `setAPIKey` value does **not** mint one: it
only works with `setk8sSecrets: true` and then renders a chart-managed
Secret straight from the plaintext `apiKeyCredentials.key` **value** — a
secret flowing through HelmRelease values, the exact pattern this deployment
avoids (1Password is the SSOT; ExternalSecrets own credential
materialization here). It also mounts a `customize_misp.sh` ConfigMap that
runs `cake user change_authkey admin@admin.test "$MISP_API_KEY"` on every
container start — resetting a **hardcoded** user's authkey (chart v5.0.1,
not our vault-managed `ADMIN_EMAIL`). Both `setk8sSecrets` and `setAPIKey`
are therefore off (the HelmRelease `setAPIKey: false` is the deliberate
record of this decision).

Instead the operator mints the key at runtime: MISP UI → dedicated read-only
user (org `Apocrathia` — org-only distribution events are visible only to
same-org users) → Auth Keys → Add key. The key is copied into the
`opencti-misp-connector` 1Password item (`MISP_KEY` field), and the
connector consumes it from the **opencti** namespace (OnePasswordItem in
`opencti/secret.yaml`; wiring in the OpenCTI README slice-6 section).
MISP keeps auto-generating its own admin authkey untouched.

## SSO (Authentik OIDC)

Native MISP `OidcAuth` core plugin via the misp-docker env surface
(research doc §1.6). Pieces:

- **Provider** (`crossplane.yaml` + `authentik.tf`): provider-opentofu
  Workspace `misp-authentik` — the house tofu path (headlamp / chaos-mesh
  pattern) as the canonical file pair: `crossplane.yaml` carries the
  Crossplane objects, `authentik.tf` is the single source of truth for the
  HCL, and kustomization.yaml stitches the HCL bytes into the Workspace's
  `spec.forProvider.module` at build time (rendered module byte-identical
  to the file — never render this directory outside kustomize). It creates
  the confidential client `misp` (client_id pinned in the HCL — only the
  client secret is a post-merge copy), PKCE S256 client-side, strict
  redirect `https://misp.gateway.services.apocrathia.com/users/login` (the
  plugin hardcodes `MISP.baseurl + /users/login` as the callback — plugin
  source), dashboard tile in the "Security" group, `admins` binding order
  10, no user binding. Fresh create (MR unmerged — no import blocks, no
  adoption ids; the first plan after merge MUST read as a clean create-set
  — a read-only plan against live authentik is the authorized post-merge
  check, not run now); the scoped authentik API token rides the
  `authentik-terraform-token` Secret (1Password item
  `crossplane-terraform-secrets` via a namespace-local OnePasswordItem),
  and the tofu state lives in the `tfstate-misp-authentik-misp` Secret in
  this namespace — separate from the CI tofu stack. The Workspace is
  prune-guarded (`Observe/Create/Update` only): a GitOps prune orphans the
  stack without destroying the live authentik objects. If the state
  Secret is ever lost, re-adopt via manual `tofu import` — never a blip.
- **Roles claim**: the "MISP Roles" custom scope mapping in `authentik.tf`
  (a hand-written resource, ported verbatim from the original blueprint)
  emits `{"roles": ["misp-admin"]}` for the authentik `admins` group; the
  HelmRelease `oidcRolesMapping` maps `misp-admin` → MISP role id 1
  (site admin). `oidcScopes` requests the custom `roles` scope.
- **Logout**: `oidcLogoutUrl` is the provider end-session endpoint;
  misp-docker maps it to `Plugin.CustomAuth_custom_logout` with
  `post_logout_redirect_uri` appended, so MISP logout returns to the
  IdP-hosted login page.
- **Break-glass**: `mixedAuth` (postRenderer env `OIDC_MIXEDAUTH=true`,
  the chart does not render this env) keeps the local login form working
  alongside the "Login with OIDC" button. Local admin creds remain the
  recovery path if authentik is down.
- **Email linking**: postRenderer envs `OIDC_ALLOW_EMAIL_LINKING=true` +
  `OIDC_REQUIRE_EMAIL_VERIFIED=false`. Without linking, the operator's
  first SSO login with the same email as local user id 1 is refused
  ("Refusing to link OIDC identity…" — plugin source). Email-verified is
  disabled because authentik's stock email scope emits
  `email_verified: false` (it does no email verification; verified against
  authentik 2026.8.2 `blueprints/system/providers-oauth2.yaml`). Email
  ownership is operator-asserted in this single-operator IdP, and only the
  `admins` group can reach the authorization flow.

### Blocked-user caveat (documented behavior)

Blocking a user in authentik stops **new** logins but does not revoke an
active MISP session or API keys on this image. The plugin's real hardening
— `OidcAuth.offline_access` + `check_user_validity` (revalidate the user
via refresh token every N seconds, research §1.6) — is plugin config that
the misp-docker v2.5.44 entrypoint never writes: the chart renders
`OIDC_OFFLINE_ACCESS` / `OIDC_CHECK_USER_VALIDITY` envs, but no part of the
image consumes them (verified repo-wide against misp-docker @ 33ac4e6d —
the v2.5.44 image-era tree). The values are pinned in the HelmRelease so
the intent is on record and a future image can pick them up. To fully cut
off a blocked user today: disable the MISP user manually (`MISP →
Administration → List Users`) — sessions die at next request, and their
auth keys stop working.

## Storage

| Volume           | Class    | Size | Notes                                        |
| ---------------- | -------- | ---- | -------------------------------------------- |
| misp-attachments | longhorn | 20Gi | attachments + default feed cache (chart PVC) |
| mariadb data     | longhorn | 10Gi | bitnami StatefulSet volumeClaimTemplate      |
| valkey data      | -        | -    | emptyDir (cache/queue only; no persistence)  |

rustfs bucket `misp-mariadb-backups` (slice 1 keypair) receives the nightly
MariaDB dump CronJob — see [Backups](#backups). `misp-files` stays reserved
for future S3 attachment storage.

## Backups

Two independent mechanisms (research doc §5 slice 8):

1. **Logical DB dump** — `backup-cronjob.yaml`: CronJob `misp-mariadb-backup`
   fires daily at 22:30 America/Denver (04:30 UTC, after the kopia 02:00 UTC
   volume window). The init container runs `mariadb-dump --single-transaction`
   from the same digest-pinned bitnami mariadb image the subchart runs (dump
   client/server versions always match), gzips it, and the aws-cli container
   PUTs it to `s3://misp-mariadb-backups/misp-mariadb-YYYY-MM-DD.sql.gz`, then
   prunes to the newest 14 daily copies (parity with the CNPG
   `retentionPolicy: 14d` house default — the bucket is the archive, retention
   is date-prefix-based). Credentials: rustfs keypair from the 1Password item
   `misp-mariadb-backups-secrets` via the OnePasswordItem in
   `backup-secret.yaml` (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` keys); DB
   password read from the chart-managed Secret `mariadb` (`mariadb-password`
   key) so DB creds live in no second store.
2. **Volume snapshots** — `backup.yaml` + the namespace label: kopiur
   `SnapshotPolicy/misp-backup` snapshots `misp-attachments` and
   `data-mariadb-0` nightly (`H 2 * * *`, 30m jitter) into the shared
   `ClusterRepository/nas-rustfs` on the NAS rustfs instance — 7 daily / 4
   weekly (GFS). The mariadb mover inherits `runAsUser 1001` from the
   StatefulSet (`pvcConsumer`); the attachments consumer runs as root with no
   UID pinned in the pod spec, so its mover falls back to the default mover
   UID — php uploads land 0644 (umask 022), the expected-readable case; if a
   snapshot ever errors on unreadable files the mover UID is the knob
   (`mover.podSecurityContext`). The
   volume copy of MariaDB is crash-consistent only; the logical dump is the
   restore path that matters for the database.

RPO: database up to ~24 h (last nightly dump), attachments up to ~24 h (last
nightly kopia snapshot).

### Restore procedure (operator-led drill; slice-8 live acceptance)

Restore = dump from the bucket → MariaDB → MISP login works. For a real
recovery (empty or corrupted DB) scale the app down first; on a fresh
Flux-provisioned MariaDB the database `misp` already exists and no scaling is
needed to smoke-test.

```bash
# 1. List the dumps and fetch the latest one
aws --endpoint-url http://storage.services.apocrathia.com:9009 s3 ls s3://misp-mariadb-backups/
aws --endpoint-url http://storage.services.apocrathia.com:9009 s3 cp s3://misp-mariadb-backups/misp-mariadb-2026-10-10.sql.gz - | gunzip > misp-restore.sql

# (real recovery only) stop the app while the DB is being rewritten
kubectl -n misp scale deploy/misp deploy/misp-modules --replicas=0

# 2. Load it into MariaDB (root password read inside the pod, never on the host)
kubectl -n misp exec -i sts/mariadb -- bash -c 'exec mariadb -u root -p"$MARIADB_ROOT_PASSWORD" misp' < misp-restore.sql

# (real recovery only) bring the app back
kubectl -n misp scale deploy/misp deploy/misp-modules --replicas=1

# 3. Verify: MISP login works (break-glass local admin or Authentik SSO) and
#    the event list shows the expected rows.
```

The dump covers the `misp` database (MISP's only schema). The container
entrypoint re-applies `ADMIN_EMAIL`/`ADMIN_PASSWORD` on every start, so the
admin login keeps working off the vault either way. Restoring the
`misp-attachments` volume is a kopia/Longhorn PVC restore (see the
[backup service README](../../../03-services/backup/README.md)); the kopia
web UI is read-only — restores go through kopiur `Restore` CRs.

## Known chart quirks (verified against chart v5.0.1 + misp-docker)

- The chart's configmap emits env names the current misp-docker image does
  not read (`MISP_UUID` vs `UUID`, `SECURITY_SALT` vs `SALT`,
  `MISP_MODULE_URL` vs `MISP_MODULES_FQDN`, `ZEROMQ_ENABLED`); the image
  defaults are correct for this deployment, so those keys are inert.
- Same class of dead env in the OIDC block: `OIDC_OFFLINE_ACCESS`,
  `OIDC_CHECK_USER_VALIDITY`, `OIDC_CLIENT_CRYPTO_PASS`, and
  `OIDC_PASSWORD_RESET` render from chart values but nothing in misp-docker
  v2.5.44 consumes them (the real OidcAuth offline/validity config is
  written by nothing on this image — see the blocked-user caveat above).
- The core container runs as root (image runs supervisord + drops to
  www-data per service); the chart drops NET_RAW/SYS_CHROOT/MKNOD/SETFCAP
  capabilities with RuntimeDefault seccomp. This is the upstream shape.
- GPG is auto-configured (`AUTOCONF_GPG`) with a key that lives in the
  container filesystem — it regenerates on pod restart. PGP/S/MIME features
  are not deployment blockers (research §1.4); don't rely on them until
  reworked.
- The instance UUID (`MISP.uuid`) is auto-generated by the image and stored
  in DB/config; the chart's `MISP_UUID` value does not reach the container
  image's expected env name.
- MariaDB stays on bitnami subchart defaults for `innodb_buffer_pool_size`
  (no `extraConfiguration` in 19.0.5); retune via `primary.configuration` if
  event volume grows.

## Post-deploy verification (live cluster — post-merge)

1. **Copy the OIDC client secret** (one-time): after the tofu workspace
   creates the provider, open authentik → Applications → MISP → provider
   `misp-oidc-provider` and copy the generated client secret into the
   `OIDC_CLIENT_SECRET` field of `vaults/Secrets/items/misp-secrets`
   (1Password). Until then the misp pods wait on the missing `username`/`password` fields in `misp-secrets` (the Connect Secret exists; the
   stays not-Ready and the misp pod waits on the missing Secret — that
   ordering is intended (client_id is pinned in `authentik.tf`, so the copy
   is secret-only).
2. Pods healthy: `kubectl -n misp get pods` → misp, misp-modules, mariadb,
   valkey all Ready (first misp boot runs schema init — the startup probe
   allows 15 min).
3. `https://misp.gateway.services.apocrathia.com` loads behind the gateway
   (external-dns creates the record from the HTTPRoute automatically).
4. Local admin login works with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from
   `vaults/Secrets/items/misp-secrets` (break-glass path — must stay
   working after SSO is on).
5. **Live SSO acceptance**: the "Login with OIDC" button completes the
   authentik flow; the authentik `admins` member lands as MISP role id 1
   (site admin); MISP logout returns to the IdP-hosted page.
6. **Blocked-user check**: block a test user in authentik → their next
   MISP login is refused. Note the documented caveat — an existing
   session/API keys survive until the MISP user is disabled manually
   (offline_access revalidation is not wired on this image).
7. Default feeds pull: scheduled task runs in-container (cron);
   `kubectl -n misp logs deploy/misp` shows pull successes.
8. SMTP gate: mail is unconfigured (`smtp.enabled: false`) — the relay
   target is an operator call on the issue checklist; enable the ntppool
   smtp subchart with `SMARTHOST_*` config when decided.
9. **MISP auth key for OpenCTI** (slice 6): dedicated read-only user → Auth
   Keys → Add key; copy the key into the `opencti-misp-connector` 1Password
   item (`MISP_KEY` field). See the secrets section above for the
   `setAPIKey` decision and the OpenCTI README for the connector wiring.
10. **Backups** (slice 8): `kubectl -n misp get cronjob misp-mariadb-backup`
    shows the schedule; trigger a manual run
    (`kubectl -n misp create job --from=cronjob/misp-mariadb-backup
misp-mariadb-backup-drill`), confirm the object lands in the
    `misp-mariadb-backups` bucket, then run the [restore
    drill](#restore-procedure-operator-led-drill-slice-8-live-acceptance) —
    a restored dump must reproduce a working MISP login. Kopia: `kubectl -n
misp get snapshotpolicy,snapshotschedule` and the first `Snapshot` after
    the 02:00 UTC window (mover UID caveats per policy comments).

## Troubleshooting

```bash
# Pod status (core, modules, mariadb, valkey)
kubectl -n misp get pods

# Core logs (schema init on first boot, admin bootstrap on each start)
kubectl -n misp logs deploy/misp -f

# MariaDB / valkey
kubectl -n misp logs statefulset/mariadb -f
kubectl -n misp logs deploy/valkey -f

# Route status
kubectl -n misp get httproute misp

# HelmRelease state
kubectl -n misp describe helmrelease misp
```

## References

- [Deployment issue](../../../../../docs/issues/misp-deployment.md) —
  per-slice acceptance and operator checklist
- [Research doc](../../../../../docs/research/misp-opencti-deployment.md) —
  chart verdicts, sizing, risks (design source of truth)
- **[MISP](https://www.misp-project.org/)** - project and docs
- **[MISP/misp-docker](https://github.com/MISP/misp-docker)** - official images
- **[cmu-sei/misp-helm](https://github.com/cmu-sei/misp-helm)** - Helm chart
