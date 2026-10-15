# Longhorn

Distributed block storage for Kubernetes with replication, snapshots, and backup.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

Longhorn provides persistent storage with:

- Replicated block storage across cluster nodes
- Automated backup to MinIO (S3-compatible)
- Point-in-time snapshots
- Dynamic provisioning and online expansion

## Access

- **Web UI**: `https://longhorn.gateway.services.apocrathia.com`
- **Authentication**: Authentik SSO — owned by the `crossplane.yaml` + `authentik.tf` file pair in this directory (the retired blueprint's objects, adopted in place)

## Configuration

See `helmrelease.yaml` for storage settings including replica count, data locality, and retention policies.

### 1Password Setup

Create `longhorn-backup-target-secret` in your vault with:

| Field                   | Value                                |
| ----------------------- | ------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | MinIO access key                     |
| `AWS_SECRET_ACCESS_KEY` | MinIO secret key                     |
| `AWS_ENDPOINTS`         | `http://minio.minio-system.svc:9000` |

## Storage Class

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: example-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
```

## Backup

- **Target**: S3 on the NAS rustfs (`s3://longhorn@us-east-1/`, endpoint `http://storage.services.apocrathia.com:9009`), credentials via `longhorn-backup-target-secret`
- **Schedule**: Recurring jobs in `recurringjobs.yaml` — tiered, see below
- **Retention**: Per tier (see below)

```bash
# List volumes
kubectl get volumes -n longhorn-system

# List backups
kubectl get backups -n longhorn-system

# Check backup target
kubectl get backuptargets -n longhorn-system
```

### Backup tier policy

All volumes are classified into three tiers. A tier is a RecurringJob _group_;
the group a volume belongs to is selected by a label on the Longhorn Volume:

```text
recurring-job-group.longhorn.io/<tier>=enabled     # tier membership
```

Mechanics (longhorn v1.13.0, verified against longhorn-manager source):

- A RecurringJob applies only to volumes labeled with one of its `spec.groups`.
- A volume with **no** recurring-job label is auto-labeled into the `default`
  group (`datastore.FixupRecurringJob`), so new/unclassified volumes always
  get daily backups. Classify them by adding them to
  [`scripts/longhorn/apply-backup-tier-labels.sh`](../../../../scripts/longhorn/apply-backup-tier-labels.sh)
  and re-running it (it also removes the auto `default` label, which would
  otherwise keep tier volumes on the daily schedule).
- Jobs in `default` groups lists are maintenance (snapshot-cleanup,
  snapshot-delete, filesystem-trim) and apply to **every** tier, including
  caches — trim reclaims space and snapshot-delete clears local snapshots
  (local snapshots are not the backup story; the NAS is).

| Tier                   | Job (group)                                | Schedule        | Retain | Volumes            |
| ---------------------- | ------------------------------------------ | --------------- | ------ | ------------------ |
| critical               | `daily-backup-critical`                    | daily 07:00 UTC | 3      | 34                 |
| stateful               | `weekly-backup-stateful`                   | Mon 07:00 UTC   | 4      | 67                 |
| cache                  | — (maintenance jobs only, no backup)       | never           | —      | 22                 |
| default (unclassified) | `daily-backup` (catch-all for new volumes) | daily 07:00 UTC | 3      | any not yet tiered |

Rules of thumb: databases/identity/SIEM state → critical; app data, configs,
uploads, libraries → stateful; build caches, model caches, scratch,
re-downloadable data → cache. Rationale per volume below (generated from the
classification embedded in `apply-backup-tier-labels.sh` — that script is the
executor and source of truth).

#### Critical tier (34 volumes)

| Volume                                     | PVC / workload                                          | Note                                                                               |
| ------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `duckdb-data`                              | `duckdb-data`                                           | duckdb database                                                                    |
| `firecrawl-postgres-data`                  | `firecrawl-postgres-data`                               | firecrawl postgres database                                                        |
| `hermes-agent-state`                       | `hermes-agent-state`                                    | agent harness persistent state                                                     |
| `prime-agent-state`                        | `prime-agent-state`                                     | agent harness persistent state                                                     |
| `projectsend-mysql-data`                   | `projectsend-mysql-data`                                | projectsend mysql database                                                         |
| `pvc-13b79a66-bc24-4590-9ca6-cb9ca817c478` | `data-opencti-rabbitmq-0`                               | OpenCTI broker state                                                               |
| `pvc-21fb46ea-4b66-4f5e-ba76-05f959d7aa78` | `data-fleet-mysql-0`                                    | fleet gitops database                                                              |
| `pvc-2eac4f6a-2741-4b6b-b3ba-f8f2c33ac782` | `opensearch-cluster-master-opensearch-cluster-master-0` | OpenCTI search store                                                               |
| `pvc-2f75cac7-92f2-4bdc-8973-f0a541a4a944` | `terminus-postgres-1`                                   | dashboard database                                                                 |
| `pvc-348cfddf-a971-493d-af9c-5741452edc92` | `jetkvm-postgres-1`                                     | jetkvm database                                                                    |
| `pvc-362ad954-21f8-45dc-90b8-79b8ca4d3fe5` | `crossview-postgres-1`                                  | crossplane state database                                                          |
| `pvc-38a96482-e42c-46d7-8ad5-429567dce500` | `kagent-postgres-1`                                     | agent broker database                                                              |
| `pvc-3dc4ed86-1fcc-45f6-98b9-e4a280d5bd44` | `qdrant-storage-qdrant-0`                               | vector database                                                                    |
| `pvc-4b191226-9c44-4389-b960-2f3bfeef4943` | `endurain-postgres-1`                                   | fitness database                                                                   |
| `pvc-5e91bf4d-0bb8-4fb6-b083-7fd90ade2801` | `duckdb-mcp-data`                                       | duckdb database                                                                    |
| `pvc-6d18c218-57c4-49c0-b8d1-1b0fe2bfc771` | `wakapi-postgres-1`                                     | coding stats database                                                              |
| `pvc-727b21f0-048a-4997-ad91-0242fb1be2fd` | `tak-postgres-1`                                        | TAK server database                                                                |
| `pvc-743ac2a3-8746-44f8-aa69-b64989ae410d` | `mealie-postgres-1`                                     | recipe database                                                                    |
| `pvc-8b3bc323-c524-44a9-9c9b-dcf53a84d161` | `authentik-postgres-1`                                  | identity provider database                                                         |
| `pvc-9c6c2822-9f91-41ff-a5e8-786a5df4c219` | `data-tracearr-timescale-0`                             | tracearr database                                                                  |
| `pvc-a1fa04a6-841d-4275-8b8d-3d8df3534eb8` | `misp-attachments`                                      | MISP indicator attachments — threat intel (git has misp backup cronjob for the DB) |
| `pvc-a70b364c-c5df-4a5a-96f3-a471d19853fb` | `matrix-postgres-1`                                     | matrix database                                                                    |
| `pvc-aa0ab391-ed51-4d43-85f0-b5502fc32445` | `gatus-postgres-1`                                      | uptime database                                                                    |
| `pvc-aa536dd0-ef26-4d09-ac93-30ea6eb75356` | `chaptarr-postgres-1`                                   | chaptarr database                                                                  |
| `pvc-b6ef3dc9-da28-44a0-ba2e-a4229ca48551` | `state-tenzir-node-tetragon-0`                          | SIEM node state (operator: critical)                                               |
| `pvc-bbae135d-facb-45e3-a31b-02b914d10064` | `state-tenzir-node-core-0`                              | SIEM node state (operator: critical)                                               |
| `pvc-bdcea90a-cb5f-4d45-b97d-097ab1f575c6` | `data-mariadb-0`                                        | MISP database                                                                      |
| `pvc-c1815ef1-a229-4058-a33a-fe012a20e1ef` | `litellm-postgres-1`                                    | LLM gateway database                                                               |
| `pvc-c6b71583-f933-4369-abd5-acfa96223f6f` | `immich-postgres-1`                                     | photo library database                                                             |
| `pvc-c94ac7e9-7ba2-4991-a689-cef380f036b0` | `invidious-postgres-1`                                  | invidious database                                                                 |
| `pvc-cb14ab7c-3851-49a5-935e-fe9d070b96ed` | `opentaxii-postgres-1`                                  | TAXII database                                                                     |
| `pvc-dae14a6e-1bd7-47cc-a55a-22a9f9a10e26` | `n8n-postgres-1`                                        | workflow database                                                                  |
| `pvc-f7e9f86d-3ce3-492a-8595-8319fa6fc523` | `romm-postgres-1`                                       | romm database                                                                      |
| `tak-data`                                 | `tak-data`                                              | TAK CA + issued certs; losing the CA breaks enrolled clients                       |

#### Stateful tier (67 volumes)

| Volume                                     | PVC / workload                                                     | Note                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `archisteamfarm-config`                    | `archisteamfarm-config`                                            | ASF bot config + farm state                                      |
| `aurral-config`                            | `aurral-config`                                                    | aurral app config                                                |
| `bazarr-config`                            | `bazarr-config`                                                    | subtitle indexer config/DB                                       |
| `calibre-web-automated-config`             | `calibre-web-automated-config`                                     | calibre-web config + ingest                                      |
| `cantinarr-config`                         | `cantinarr-config`                                                 | cantinarr config                                                 |
| `changedetection-io-config`                | `changedetection-io-config`                                        | watch config + change history                                    |
| `chaptarr-config`                          | `chaptarr-config`                                                  | chaptarr config                                                  |
| `cleanuparr-config`                        | `cleanuparr-config`                                                | cleanuparr config                                                |
| `comfyui-data`                             | `comfyui-data`                                                     | workflow outputs + models; outputs are unique                    |
| `companion-data`                           | `companion-data`                                                   | bitfocus companion data                                          |
| `copyparty-state`                          | `copyparty-state`                                                  | copyparty server state                                           |
| `endurain-data`                            | `endurain-data`                                                    | endurain uploads + app data                                      |
| `halcyon-data`                             | `halcyon-data`                                                     | halcyon client state                                             |
| `houndarr-data`                            | `houndarr-data`                                                    | houndarr data                                                    |
| `icloudpd-config`                          | `icloudpd-config`                                                  | icloud downloader config + session                               |
| `jellyfin-config`                          | `jellyfin-config`                                                  | 50GiB server config + metadata cache; watch state unique         |
| `kavita-config`                            | `kavita-config`                                                    | kavita server state                                              |
| `komga-config`                             | `komga-config`                                                     | komga server state                                               |
| `lidarr-config`                            | `lidarr-config`                                                    | lidarr index DB                                                  |
| `lidarr-youtube-downloader-config`         | `lidarr-youtube-downloader-config`                                 | lyd config                                                       |
| `mealie-data`                              | `mealie-data`                                                      | recipe images + scraper data                                     |
| `mecatl-valkey-data`                       | `mecatl-valkey-data`                                               | coding-agent engine state store (manifest: 'redis-backed state') |
| `meshtastic-data`                          | `meshtastic-data`                                                  | meshtastic client state                                          |
| `moonlight-web-data`                       | `moonlight-web-data`                                               | moonlight pairing state                                          |
| `mumble-data`                              | `mumble-data`                                                      | mumble server DB + audio                                         |
| `n8n-data`                                 | `n8n-data`                                                         | binary workflow data; workflows in n8n-postgres                  |
| `opencanary-data`                          | `opencanary-data`                                                  | canary alert state                                               |
| `prism-results`                            | `prism-results`                                                    | scan reports (OSINT product)                                     |
| `prism-scan-data`                          | `prism-scan-data`                                                  | scan history                                                     |
| `prism-watchlist-data`                     | `prism-watchlist-data`                                             | watchlists                                                       |
| `projectsend-storage`                      | `projectsend-storage`                                              | shared files                                                     |
| `projectsend-valkey-data`                  | `projectsend-valkey-data`                                          | projectsend cache/queue; purpose not documented                  |
| `promptfoo-data`                           | `promptfoo-data`                                                   | eval outputs                                                     |
| `prowlarr-config`                          | `prowlarr-config`                                                  | indexer DB                                                       |
| `pvc-30f87d1e-7d30-4347-bb64-d1737e7ed03c` | `data-loki-backend-1`                                              | log store; OCSF parquet on rustfs is the durable record          |
| `pvc-61ca0880-77fa-4ebc-a2f0-891f1eb57556` | `kafka-data-mimir-kafka-0`                                         | mimir metrics pipeline state                                     |
| `pvc-78ecd672-a9b5-41df-aa87-0e81f3042c34` | `prometheus-storage-prometheus-kube-prometheus-stack-prometheus-0` | TSDB 100GiB; re-scrapable history, daily CIFS cost > value       |
| `pvc-7a222244-99c4-4bbf-bba0-77808d29595f` | `tracearr-backups`                                                 | chart-internal backup store; unknown redundancy, treat as data   |
| `pvc-84500b89-7c1c-40ae-ac3e-3b8f7617e651` | `data-openhands-agent-canvas-0`                                    | agent workspace                                                  |
| `pvc-c961826d-cffc-4a20-8677-c19784328608` | `kube-prometheus-stack-grafana`                                    | dashboards git-provisioned; DB holds users                       |
| `pvc-d17ed758-f6eb-4476-a954-874b3015044e` | `hub-db-dir`                                                       | hub state rebuildable; notebooks live on SMB                     |
| `pvc-e948563e-d03f-4e11-b419-1c0ca3f109b5` | `openwebui-open-webui`                                             | chat history + RAG data + settings                               |
| `pvc-fd27f0f0-1ac9-48c9-b513-ddf13e54f033` | `data-loki-backend-0`                                              | log store; OCSF parquet on rustfs is the durable record          |
| `pyrit-data`                               | `pyrit-data`                                                       | workspace + wordlists                                            |
| `qbittorrent-config`                       | `qbittorrent-config`                                               | torrent client state + config                                    |
| `radarr-config`                            | `radarr-config`                                                    | radarr index DB                                                  |
| `rclone-app-data`                          | `rclone-app-data`                                                  | rclone state                                                     |
| `rclone-config`                            | `rclone-config`                                                    | rclone remote credentials/config                                 |
| `restreamer-config`                        | `restreamer-config`                                                | restreamer config + DB                                           |
| `restreamer-data`                          | `restreamer-data`                                                  | HLS output + recordings                                          |
| `romm-assets`                              | `romm-assets`                                                      | romm cover art + assets                                          |
| `romm-config`                              | `romm-config`                                                      | romm config                                                      |
| `sabnzbd-config`                           | `sabnzbd-config`                                                   | usenet client state                                              |
| `searxng-config`                           | `searxng-config`                                                   | searxng settings                                                 |
| `seerr-config`                             | `seerr-config`                                                     | seerr request DB                                                 |
| `slskd-data`                               | `slskd-data`                                                       | soulseek client data                                             |
| `sonarr-config`                            | `sonarr-config`                                                    | sonarr index DB                                                  |
| `soularr-data`                             | `soularr-data`                                                     | soularr data                                                     |
| `suwayomi-data`                            | `suwayomi-data`                                                    | 50GiB manga library cache                                        |
| `synapse-data`                             | `synapse-data`                                                     | matrix homeserver media store + state                            |
| `tdarr-server-config`                      | `tdarr-server-config`                                              | tdarr config + libraries DB                                      |
| `terminus-uploads`                         | `terminus-uploads`                                                 | user uploads (kopia-backed)                                      |
| `terminus-valkey-data`                     | `terminus-valkey-data`                                             | terminus cache/queue; purpose not documented                     |
| `thelounge-data`                           | `thelounge-data`                                                   | IRC client state                                                 |
| `tunarr-config`                            | `tunarr-config`                                                    | tunarr config                                                    |
| `uptime-kuma-data`                         | `uptime-kuma-data`                                                 | uptime history + config                                          |
| `whisparr-config`                          | `whisparr-config`                                                  | whisparr index DB                                                |

#### Cache tier (22 volumes) — never backed up

| Volume                                     | PVC / workload              | Note                                                            |
| ------------------------------------------ | --------------------------- | --------------------------------------------------------------- |
| `archisteamfarm-plugins`                   | `archisteamfarm-plugins`    | ASF plugins, auto-reinstall from plugin store                   |
| `ate-cache-data`                           | `ate-cache-data`            | rustfs snapshot store for agent substrate (operator-named junk) |
| `bazarr-models`                            | `bazarr-models`             | subgen ML models, re-downloadable                               |
| `demo-app-data`                            | `demo-app-data`             | demo/canary workload, disposable                                |
| `jellyfin-ai-upscaler-data`                | `jellyfin-ai-upscaler-data` | upscaler model/cache dirs; models auto-download at start        |
| `jetkvm-api-app-source`                    | `jetkvm-api-app-source`     | app source checkout, rebuilt by init container                  |
| `jetkvm-app-build-cache`                   | `jetkvm-app-build-cache`    | build cache (operator-named junk)                               |
| `pvc-0318e179-b046-42aa-9e71-186549767add` | `data-valkey-cluster-5`     | agent substrate session store                                   |
| `pvc-13c92990-e678-499a-b2f6-a2852b6bd4d3` | `immich-valkey`             | immich redis cache, rebuilt by app                              |
| `pvc-157ba8ee-ddbe-486d-8d86-2a95749f0b35` | `data-trivy-server-0`       | vulnerability DB, re-downloadable from Aqua                     |
| `pvc-2108d78d-31c2-43e0-9313-1892760c94e4` | `immich-machine-learning`   | ML model cache, re-downloaded at start                          |
| `pvc-45a537ce-7ea6-4948-9aca-6b5fea07db24` | `data-valkey-cluster-4`     | agent substrate session store                                   |
| `pvc-7f0c4ff9-abc4-4078-b601-412c677ddb8c` | `data-valkey-cluster-1`     | agent substrate session store                                   |
| `pvc-a5208775-448d-43e7-828d-2c2c791c8b65` | `data-valkey-cluster-3`     | agent substrate session store                                   |
| `pvc-acd04be8-cfc9-414d-8f67-6739c587f992` | `tracearr-image-cache`      | image cache                                                     |
| `pvc-b136fb45-f55d-45d7-88e4-cbfd5178f2ff` | `data-valkey-cluster-0`     | agent substrate session store, ephemeral by design              |
| `pvc-b48b91e3-9187-4bdc-b459-6f6e9ce4fc62` | `data-tracearr-redis-0`     | redis queue/cache                                               |
| `pvc-da9338d5-99ef-4322-8bac-8a6f18e1df87` | `trivy-operator-pvc`        | report scratch ('local PVC is scratch space only')              |
| `pvc-ebd7c851-9ffd-4063-ae4a-07e510c4bda9` | `data-valkey-cluster-2`     | agent substrate session store                                   |
| `searxng-cache`                            | `searxng-cache`             | search result cache                                             |
| `tdarr-server-cache`                       | `tdarr-server-cache`        | transcode cache                                                 |
| `tdarr-server-logs`                        | `tdarr-server-logs`         | server logs                                                     |

### Orphan BackupVolume prune

Longhorn v1.13.0 never garbage-collects `BackupVolume` CRs for deleted
volumes — over ~1 year 347 orphans accumulated (74% of all CRs), and each one
costs the backup-target sync a mount/ls/umount subprocess chain on **every**
poll pass.

`prune-cronjob.yaml` runs daily (`longhorn-backup-volume-prune` CronJob,
04:00 America/Denver) and cross-checks BackupVolume base names (strip the
trailing `-<8 hex>` hash) against live volumes:

- **dry-run** (shipped default): logs the orphans only.
- **delete** (`PRUNE_MODE=delete` in `prune-cronjob.yaml`): deletes orphan
  BackupVolume CRs through longhorn's own deletion flow, which **also removes
  the target-side data**, so the orphan cannot be re-synced back. Deleting the
  CR alone (via the `longhorn.io/delete-custom-resource-only` label) leaves the
  CIFS folder intact and the next target sync re-creates the CR — regrowth.
- Orphans whose newest backup is younger than `PRUNE_GRACE_DAYS` (14d) are
  kept: a post-mortem restore window for recently deleted volumes, and cover
  for in-flight backup restores.
- If the backup target is unavailable during a delete pass, longhorn skips
  remote cleanup; the CR comes back on the next sync and the prune retries.

RBAC (`prune-rbac.yaml`): list `volumes`, list + delete `backupvolumes` —
nothing else. Script: `backup-volume-prune.sh` (mounted from the generated
`backup-volume-prune` ConfigMap).

### CIFS → S3 migration

The backup target moved from `cifs://storage.services.apocrathia.com/Backup`
to the same NAS box speaking S3: rustfs at
`http://storage.services.apocrathia.com:9009`, bucket `longhorn`, URL
`s3://longhorn@us-east-1/` (longhorn syntax: `s3://<bucket>@<region>/`; the
real endpoint rides in `AWS_ENDPOINTS` on the credential secret, path-style by
default). Why: every CIFS probe cost a full SMB mount/ls/umount subprocess
chain — the sync livelock above — while S3 does listing without per-op mounts.
Existing in-cluster rustfs consumers (loki, mimir, tempo, kopia, tenzir) use
the same endpoint shape.

**Accepted tradeoff (operator, 2026-10-15):** switching targets makes all
CIFS-era backups **invisible to longhorn** — they stop showing in the UI and
cannot be restored from it. The data itself **remains on the NAS** under
`storage.services.apocrathia.com/Backup` until separately cleaned; nothing
deletes it. Restore points rebuild on the new target as recurring jobs run
(critical daily, stateful weekly, retain as configured). The first sync
against the new target also garbage-collects the stale CIFS-era BackupVolume
CRs — they do not exist on the new store, so longhorn's own
`cleanupBackupVolumeNotExistOnBackupTarget` pass drops them; the prune
CronJob keeps the new target clean from then on.

**Provisioning** (one-time, before the target switch reconciles): follow
[`docs/infrastructure/rustfs-bucket-user-creation.md`](../../../../docs/infrastructure/rustfs-bucket-user-creation.md)
— bucket `longhorn`, policy `longhorn` (s3:\* on the bucket ARNs), scoped user
`LONGHORN…` access key. Vault item fields on the existing
`longhorn-backup-target-secret` (OnePasswordItem in `secret.yaml`):

| Field                   | Value                                         |
| ----------------------- | --------------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | rustfs user access key                        |
| `AWS_SECRET_ACCESS_KEY` | rustfs user secret                            |
| `AWS_ENDPOINTS`         | `http://storage.services.apocrathia.com:9009` |

The keys are UPPER_CASE (not the kebab-case vault convention) on purpose:
longhorn v1.13.0 reads the credential secret directly by these key names
(`vendor/backupstore/types`) and cannot remap them the way chart-side
consumers remap kebab-case fields into UPPER_CASE env vars. This matches the
same item's existing CIFS_USERNAME/CIFS_PASSWORD wiring. `VIRTUAL_HOSTED_STYLE`
is left unset (rustfs is path-style). The stale CIFS fields on the item can be
dropped once the migration is verified.

### Backup store sync livelock

`helmrelease.yaml` sets `defaultBackupStore.pollInterval: 1800` (up from the
chart default 300s). v1.13.0's backup-target sync probes **every** BackupVolume
against the target per pass — each probe is a subprocess chain (backup head +
ls + umount) doing a full SMB mount against slow CIFS. With the whole CR set
the pass cannot drain inside 300s, so the gate re-opens immediately and the
sync loop runs continuously: this was the dominant continuous
longhorn-manager process churn (62–88% of node export bytes during the
2026-10-15 flood investigation). 1800s gives each pass room to finish; cron
driven backups are unaffected. Orphan pruning shrinks each pass further
(~470 → ~120 CRs).

## Troubleshooting

```bash
# Check overall health
kubectl get nodes.longhorn.io -n longhorn-system

# Volume status
kubectl get volumes -n longhorn-system

# Replica status
kubectl get replicas -n longhorn-system

# Manager logs
kubectl logs -n longhorn-system deployment/longhorn-manager

# Check volume details
kubectl describe volume <volume-name> -n longhorn-system
```

### Common Issues

**Volume attachment failures:**

```bash
kubectl describe volume <volume-name> -n longhorn-system
kubectl describe node <node-name>
```

**Backup failures:**

```bash
kubectl get backups -n longhorn-system
kubectl exec -n minio-system deployment/minio -- mc admin info local
```

## References

- **[Longhorn Documentation](https://longhorn.io/docs/)** - Official docs
- **[Backup and Restore](https://longhorn.io/docs/1.6.0/snapshots-and-backups/)** - Backup guide
