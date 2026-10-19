# OpenCTI

Open Cyber Threat Intelligence platform — threat-intel knowledge graph, STIX 2.1 native, with a worker for background processing.

> **Navigation**: [← Back to Security README](../README.md)

## Overview

Deployed from the community chart
[`devops-ia/helm-opencti`](https://github.com/devops-ia/helm-opencti) (chart
pinned at `3.0.18`, app `7.261008.0`). Slices 4 + 5 + 6 of the MISP + OpenCTI
lap — deploy, Authentik OIDC SSO ("Login with Authentik"), and the MISP
external-import connector; local admin login is kept as break-glass.

Stack layout (all in the `opencti` namespace):

```
┌────────────────┐   ┌──────────────────┐
│ opencti-server │──▶│ opencti-worker   │
│  (platform)    │   │ (bg processing)  │
└───┬───┬───┬─────┘   └───┬──────────────┘
    │   │   │             │
    │   │   └──▶ opensearch-cluster-master:9200  (single node, Longhorn 30Gi)
    │   └─────▶ opencti-rabbitmq:5672              (Longhorn 8Gi)
    └─────────▶ opencti-redis:6379                (dragonfly, no eviction)
                    │
                    ▼
        http://storage.services.apocrathia.com:9009
        rustfs bucket `opencti-files` (NAS, slice 1)
```

- **Platform**: `NODE_OPTIONS --max-old-space-size=4096` (tuned down from the
  8 GB default), 5Gi memory limit.
- **OpenSearch**: single-node subchart, 3g heap, `vm.max_map_count=262144` set
  by the chart's privileged busybox initContainer (operator decision — no
  Talos patch).
- **RabbitMQ**: `max_message_size=536870912`, `consumer_timeout=86400000` per
  the OpenCTI docker stack's `rabbitmq.conf`.
- **Dragonfly** (redis): password-gated; the chart's default
  `--cache_mode=true` is dropped — LRU eviction would silently drop stream /
  task state.
- **S3**: NAS rustfs bucket `opencti-files` (slice 1 keypair). No in-cluster
  S3 subchart.
- **MISP connector** (slice 6): `opencti-misp-connector` Deployment (chart
  `connectors:` values) polls MISP every 5 minutes over its gateway URL and
  imports events as reports/indicators/observables — one-way MISP → OpenCTI.
- **MITRE ATT&CK connector**: `opencti-mitre-connector` Deployment (chart
  `connectors:` values) pulls the ATT&CK Enterprise/Mobile/ICS STIX bundles
  plus CAPEC from upstream (`mitre-attack/attack-stix-data`, `mitre/cti`) on
  a 7-day interval. First run on deploy seeds ATT&CK into the graph — the
  platform version here has no built-in dataset-import UI anymore, so the
  connector is the seeding mechanism (2026-10-18 lap note).
- **TAXII2 connector**: `opencti-taxii2-connector` Deployment (chart
  `connectors:` values) polls the OpenTAXII staging hub in-cluster — TAXII
  2.1 discovery at
  `http://opentaxii.opentaxii.svc.cluster.local:9000/taxii2/`, collections
  default `*.*` (the single Default api root / stix-feed collection).

## Access

- **URL**: `https://opencti.gateway.services.apocrathia.com`
- **Login**: "Login with Authentik" (OIDC; authentik `admins` group users land
  in the OpenCTI `Administrators` group)
- **Break-glass**: local admin credentials from the `opencti-secrets`
  1Password item (`APP__ADMIN__EMAIL` / `APP__ADMIN__PASSWORD`)

## Configuration

All configuration is environment variables in `helmrelease.yaml`; the chart
maps `SECTION__KEY` env vars onto the platform config. Secret values are
field-name references into the `opencti-secrets` 1Password item — nothing
sensitive is stored in this repo.

### 1Password secrets

Item `vaults/Secrets/items/opencti-secrets` (created in slice 1):

| Field                             | Used for                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP__ADMIN__EMAIL`               | bootstrap admin account                                                                                                                                                   |
| `APP__ADMIN__PASSWORD`            | bootstrap admin account                                                                                                                                                   |
| `APP__ADMIN__TOKEN`               | admin API token (worker + health gate)                                                                                                                                    |
| `APP__ENCRYPTION_KEY`             | at-rest crypto for sensitive config                                                                                                                                       |
| `RABBITMQ__PASSWORD`              | RabbitMQ auth (app + subchart)                                                                                                                                            |
| `REDIS__PASSWORD`                 | dragonfly auth (app + subchart)                                                                                                                                           |
| `MINIO__ACCESS_KEY`               | rustfs `opencti-files` keypair                                                                                                                                            |
| `MINIO__SECRET_KEY`               | rustfs `opencti-files` keypair                                                                                                                                            |
| `OIDC_CLIENT_SECRET`              | Authentik OIDC provider client secret                                                                                                                                     |
| `APP__ENTERPRISE_EDITION_LICENSE` | OpenCTI EE license (PEM); provider login (SSO) is EE-gated on 7.26 CE — wired as `APP__ENTERPRISE_EDITION_LICENSE` env which takes precedence over a UI-pasted DB license |
| `misp-key`                        | MISP auth key (read) — consolidated from the former `opencti-misp-connector` item; feeds the connector's `MISP_KEY` env via `envFromSecrets`                              |

The former separate item `opencti-misp-connector` was consolidated into
`opencti-secrets` (field `misp-key`, kebab-style; 2026-10-19) — the
`envFromSecrets` indirection maps it to the connector's `MISP_KEY` env
name, so only the vault field label changed. The standalone item and its
`OnePasswordItem` CR are gone.

Wiring notes (verified against the chart templates):

- `envFromSecrets` entries take precedence over chart-default plaintext env.
- **Health key**: the vault item has no dedicated health field, and upstream
  returns 401 for an empty/`ChangeMe` key, so `APP__HEALTH_ACCESS_KEY` maps
  to the `APP__ADMIN__TOKEN` field value. Probes use the chart's exec form
  (the key never appears in the pod spec).
- **Worker token**: the chart only auto-derives `OPENCTI_TOKEN` from plaintext
  values, so `worker.envFromSecrets` wires it from the vault explicitly.
- **RabbitMQ erlang cookie**: left empty so bitnami generates a random cookie
  into the managed secret instead of shipping the chart-default `ChangeMe`.

### Authentik OIDC SSO (slice 5)

- **Provider**: the canonical file pair — `crossplane.yaml` carries the
  Crossplane objects, `authentik.tf` is the single source of truth for the
  HCL, and kustomization.yaml stitches the HCL bytes into the
  provider-opentofu Workspace's (`opencti-authentik`, the house tofu path,
  headlamp / chaos-mesh pattern) `spec.forProvider.module` at build time
  (rendered module byte-identical to the file — never render this
  directory outside kustomize). It creates the `opencti-oidc-provider`
  (OIDC, confidential) and the OpenCTI application tile in the `Security`
  dashboard category. Fresh create (MR unmerged — no import blocks, no
  adoption ids; the first plan after merge MUST read as a clean create-set
  — a read-only plan against live authentik is the authorized post-merge
  check, not run now); the scoped authentik API token rides the
  `authentik-terraform-token` Secret (1Password item
  `crossplane-terraform-secrets` via a namespace-local OnePasswordItem),
  and the tofu state lives in the `tfstate-opencti-authentik-opencti`
  Secret in this namespace — separate from the CI tofu stack. The
  Workspace is prune-guarded (`Observe/Create/Update` only): a GitOps prune
  orphans the stack without destroying the live authentik objects. Admins
  group gets access; no `users` binding — admins-only per the app-access
  model. If the state Secret is ever lost, re-adopt via manual
  `tofu import` — never a blip.
- **client_id** is pinned to `opencti` in `authentik.tf` so the HelmRelease
  can name it statically; the client secret is generated by authentik and
  copied into the `opencti-secrets` item (field `OIDC_CLIENT_SECRET`)
  post-merge.
- **Seed values**: `PROVIDERS__OPENID__*` env vars in `helmrelease.yaml`
  (issuer `https://auth.gateway.services.apocrathia.com/application/o/opencti/`,
  callback `https://opencti.gateway.services.apocrathia.com/auth/oic/callback`).
  On first boot OpenCTI 7.x migrates these into its own database; from then the
  DB provider entry is the source of truth — later env edits are ignored
  (`app:authentication:force_env` not set). The chart default
  `PROVIDERS__LOCAL__STRATEGY=LocalStrategy` keeps local login enabled.
- **Groups mapping**: authentik `groups` claim (delivered via the `profile`
  scope mapping, read from the access token) maps `admins:Administrators` —
  the built-in OpenCTI administrator group. First OIDC login creates the user
  inside that group.
- **Logout**: local by default (`logout_remote` unset) — the OpenCTI session
  ends, the authentik session persists.

### MISP connector watermark + backlog imports

The connector's cursor (`last_event_date`, platform-side state) tracks MISP's
`timestamp` field — the **source event's last-modified time**, not local
creation. Two consequences (live-verified 2026-10-18):

- The 2026-10-16 CIRCL archive import bulk-touched the maltrail events, so the
  connector's first boot (10-day lookback default) imported only the touched
  tail and stranded ~2.1k archive events below the cursor.
- Feed-imported events (abuse.ch backfill) carry historical `timestamp`s and
  always land below the cursor.

Re-import mechanism: `MISP_IMPORT_FROM_DATE` (pinned to epoch in
`helmrelease.yaml`) becomes the initial cursor when the connector state
resets. Reset the state (UI: Data → Ingestion → Connectors → MISP → state
reset) **after** any bulk backfill completes — the next PT5M run re-imports
everything with `timestamp` above 2000-01-01.

### MISP → OpenCTI connector (slice 6)

The official Filigran-verified external-import connector
([OpenCTI-Platform/connectors](https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/misp))
runs as its own Deployment via the chart's first-class `connectors:` values
surface. It pulls MISP events/attributes over the MISP REST API (PyMISP),
converts them to STIX 2.1, and pushes them into OpenCTI — one-way.

Wiring (verified against the chart's connector template + connector source):

- **Deployment** `opencti-misp-connector` in this namespace; `OPENCTI_URL`
  is auto-built by the chart to `http://opencti-server:80` (in-cluster
  service — no gateway involved on the OpenCTI leg).
- **Image**: the chart default builds `opencti/<name>`, which does not exist
  on Docker Hub; Filigran publishes the connector as
  `opencti/connector-misp`. Repository is overridden; the tag rides the chart
  `appVersion` (connector images publish the same date-based tags as the
  platform), so the update cadence knob stays the chart version alone.
- **MISP leg**: `MISP_URL` is the gateway HTTPRoute
  `https://misp.gateway.services.apocrathia.com` with
  `MISP_SSL_VERIFY=true` (public Let's Encrypt wildcard on the gateway
  listener, so chain verification works). Poll interval
  `CONNECTOR_DURATION_PERIOD=PT5M` per the research doc (also the connector
  default; pinned because the slice acceptance is worded on it).
  `CONNECTOR_LOG_LEVEL=info` (default `error` — imports stay visible).
  Reports/indicators/observables creation is pinned `true` (also defaults).
  Everything else trusts connector defaults, verified against the connector
  source: `CONNECTOR_ID` ships a built-in UUID, type/scope default
  `EXTERNAL_IMPORT`/`misp`, filters import everything the key can see.
- **Secrets**: `MISP_KEY` from the `opencti-misp-connector` vault item via
  the OnePasswordItem in `secret.yaml`; `OPENCTI_TOKEN` from
  `opencti-secrets`/`APP__ADMIN__TOKEN` (the chart only auto-derives the
  token from plaintext values — same explicit ref as the worker). Until the
  operator creates the vault item post-merge, the connector pod waits on the
  missing Secret — intended step-0 ordering (same pattern as the OIDC
  client secret).
- **Container hardening**: `allowPrivilegeEscalation=false` + drop all
  capabilities (the image runs as root by upstream Dockerfile; the platform
  and worker ride chart defaults without securityContext).
- **MISP side** — `setAPIKey` stays off (see the MISP README secrets section
  for the evidence): the key is minted in the MISP UI post-merge and copied
  into the vault. 1Password stays the SSOT; nothing secret passes through
  chart values.
- **Network path**: no NetworkPolicy change is needed. The connector reaches
  MISP through the shared `main-gateway` HTTPRoute (same hairpin as any
  external client). The repo tree ships a handful of policies (the kopia UI
  ingress NetworkPolicy, CiliumNetworkPolicies under tak/, prime-agent/,
  jupyterhub/ — whose egress-gateway policy is the in-tree precedent for
  this reserved-ingress gateway hairpin — and copyparty/, plus the mcp-servers
  CiliumClusterwideNetworkPolicy), but none of them select the opencti or
  misp namespaces or constrain this connector's egress; this release adds no
  policies of its own. MISP's namespace has no ingress restrictions.
- **MISP auth-key scope**: the key belongs to a MISP user — mint it on a
  dedicated read-only user in the `Apocrathia` org. MISP events with
  org-only distribution (level 0) are visible only to same-org users, so a
  same-org connector user sees the default-distribution test events.

### Update cadence

OpenCTI releases near-daily with date-based versions; the chart tracks
upstream same-day. The chart version here is the single deliberate knob —
platform/worker images ride the chart's `appVersion` (digest-pinning split
`repository`/`tag` fields is not supported by the repo's renovate config).
Merge chart-bump MRs on purpose; the LTS-vs-rolling cadence call is tracked
in `docs/issues/opencti-deployment.md`.

## Backups (slice 8)

No database lives in this stack — the knowledge graph is OpenSearch, queues
are RabbitMQ, cache is dragonfly, and file storage is already the rustfs
`opencti-files` bucket (its own durability domain). Coverage:

- **Kopia** — `backup.yaml` + the namespace label: kopiur
  `SnapshotPolicy/opencti-backup` snapshots the OpenSearch claim
  (`opensearch-cluster-master-opensearch-cluster-master-0`) nightly
  (`H 2 * * *`, 30m jitter) into the shared `ClusterRepository/nas-rustfs` —
  7 daily / 4 weekly (GFS). The opensearch StatefulSet pins
  `runAsUser 1000` at pod level, so the mover inherits it cleanly.
- **Deliberately excluded**: the rabbitmq PVC (`data-opencti-rabbitmq-0`) —
  queue state is in-flight work, not durable knowledge; dragonfly (no PVC,
  in-memory by design). Losing them costs pending jobs only.

RPO honesty (research risk 6): the volume snapshot is crash-consistent —
Lucene translog replay recovers the index on restore — and restoring the
platform means PVC restore with up to ~24 h of graph loss accepted. Anything
the MISP connector imported is replayable from MISP (which has its own
backups); analyst-created work beyond the last kopia snapshot is not.

## Export surfaces (slice 7 — Tenzir/SIEM handoff)

Documentation only — no infrastructure lands in this slice. OpenCTI ships
three built-in export surfaces, all configured in the UI under
**Data → Data sharing** with uniform filter + access-control parameters
(verified against the platform feeds doc and the platform source routes):
public feeds impersonate a chosen user, so data visibility is that user's
markings/organizations.

| Surface               | What it serves                                                                                                                                                                 | URL shape (behind the gateway)                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| TAXII 2.1 collections | embedded TAXII server, valid STIX 2.1 bundles, token auth (basic/bearer), classic pagination; nested IDs are not always resolved in-bundle — consistency is the consumer's job | `https://opencti.gateway.services.apocrathia.com/taxii2/` (discovery → `/taxii2/root/collections/…`)         |
| Live streams          | STIX 2.1 create/update/delete events (SSE), resolves relationships and dependencies beyond the filter, can be public                                                           | `https://opencti.gateway.services.apocrathia.com/stream/<stream-id>` (raw authed platform stream: `/stream`) |
| CSV feeds             | rolling-interval CSV of created/updated entities, relationship columns supported, 5000-entry default cap                                                                       | `https://opencti.gateway.services.apocrathia.com/feeds/<feed-id>`                                            |

Recorded intake rows for the sibling SIEM funnel (Tenzir; research §3.4/3.5 —
their acceptance, not ours):

1. **`from_http` pull** against a TAXII 2.1 collection URL (STIX 2.1 JSON
   over HTTP; pagination + token handled by their pipeline/package) — or a
   public live-stream URL for event-driven SSE consumption.
2. **rustfs STIX file-drop**: a scheduled STIX export (platform export or
   connector output) into a bucket the sibling node watches (`from_s3` /
   file-drop row).

The sibling lane owns the intake row + the OCSF mapping package
(`MISP → OpenCTI → TAXII/stream/export file → Tenzir funnel`). Tenzir's old
STIX distribution layer (threatbus) is archived with no native TAXII
connector in the current platform — the sibling lane confirms the row on
their side.

Stream/collection tokens are minted in the OpenCTI UI **post-merge** when
creating the collection/stream (shown on creation; nothing to pre-provision
in Git). Operator step when the SIEM lane asks: create a dedicated
**read-only OpenCTI user**, then a TAXII collection or stream scoped with
filters, and hand over the URL + token — see the slice-7 checklist in
[`docs/issues/opencti-deployment.md`](../../../../../docs/issues/opencti-deployment.md).

## Post-merge live acceptance (slice 4)

1. Pods healthy: `kubectl get pods -n opencti` (server, worker, opensearch,
   rabbitmq, dragonfly; OpenSearch first boot takes a few minutes — the
   platform's ready-checker waits for dependencies).
2. Health green:
   `curl "https://opencti.gateway.services.apocrathia.com/health?health_access_key=<APP__ADMIN__TOKEN value>"`
   → `status: success` (the token value lives in 1Password).
3. MITRE seed: ATT&CK techniques visible under Data → Entities once the
   `opencti-mitre-connector` completes its first run (7-day interval; first
   run starts on deploy). The 7.x platform has no built-in dataset-import
   UI — the connector is the only seeding mechanism.
4. File storage smoke test (research §2.6): import a file via the UI
   (Data → Import), then confirm the object landed in the rustfs
   `opencti-files` bucket (multipart upload is the point of the test).
5. Websockets: leave the UI open with a background import running —
   broadcast/live views update through the Cilium gateway without reconnect.

## Post-merge live acceptance (slice 5)

0. Copy the generated OIDC client secret: authentik UI → Applications →
   Providers → `opencti-oidc-provider` → copy the Client secret into the
   `opencti-secrets` 1Password item field `OIDC_CLIENT_SECRET` (the secret is
   never stored in this repo; the env var
   `PROVIDERS__OPENID__CONFIG__CLIENT_SECRET` reads it from the synced
   Secret). Restart the platform deployment after the item syncs.
1. "Login with Authentik" works end-to-end from the OpenCTI login page (or
   the authentik `Security` → `OpenCTI` tile).
2. First OIDC login creates the user; the user lands in the `Administrators`
   group (authentik `admins` mapping) with admin capabilities.
3. Logout returns to the login page (local logout only; authentik session
   stays live).
4. Break-glass check: local admin login still works alongside OIDC.

## Post-merge live acceptance (slice 6)

0. Copy the MISP auth key into 1Password: in the MISP UI create a dedicated
   read-only user (org `Apocrathia`), open its profile → Auth Keys → Add key
   (label `opencti-connector`), and copy the key into a new 1Password item
   `opencti-misp-connector`, field `MISP_KEY` (the item is slice-1-deferred
   to this step). Until the item exists the connector pod waits on the
   missing Secret (CreateContainerConfigError) — intended step-0 ordering.
   After the OnePasswordItem syncs, the connector starts; restart it if it
   had exhausted backoff (Troubleshooting has the restart command).
1. Create a test MISP event with indicators (default distribution is
   org-only — keep it in the `Apocrathia` org, or publish the event).
2. Within one poll interval (`PT5M`) the event appears in OpenCTI as a report
   with indicators/observables (Reports → newest `misp-event`).
3. Connector dashboard success counts: Data → Ingestion → Connectors → MISP
   shows the connector as active with rising success/message counts; errors
   would show in `kubectl -n opencti logs deployment/opencti-misp-connector`.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n opencti

# Platform logs (startup sequence: ES → rabbit → redis → S3 → seed)
kubectl logs -n opencti deployment/opencti-server -f

# Health from inside the cluster
kubectl exec -n opencti deploy/opencti-server --   node -e "require('http').get({host:'127.0.0.1',port:4000,path:'/health?health_access_key='+process.env.APP__HEALTH_ACCESS_KEY},r=>process.exit(r.statusCode===200?0:1))"

# OpenSearch bootstrap failures: check vm.max_map_count initContainer ran
kubectl logs -n opencti sts/opensearch-cluster-master -c sysctl

# RabbitMQ limits applied (max_message_size / consumer_timeout)
kubectl exec -n opencti sts/opencti-rabbitmq -- rabbitmqctl environment | grep -E "max_message_size|consumer_timeout"

# MISP connector (slice 6) — polls MISP every PT5M
kubectl logs -n opencti deployment/opencti-misp-connector -f

# Restart the connector once the MISP_KEY Secret has synced
kubectl -n opencti rollout restart deployment/opencti-misp-connector
```

## Area wiring note

The `04-apps/security/` area dir (kustomization, flux-kustomization, README)
is created by the parallel MISP slice. When this app dir landed the area
registries were not yet present — this app must be registered in the area
`kustomization.yaml` (add `- opencti` to `resources`) and listed in the area
README for Flux to pick it up.
