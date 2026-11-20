# CNPG Backup Monitoring

PrometheusRule alerting on CloudNativePG backup health, fleet-wide. Born from
the 2026-11 backup audit: nine days of nightly backup failures across the
fleet produced no alert anywhere.

> **Navigation**: [← Back to Observability README](../../README.md)

## Overview

Every CNPG cluster runs nightly 05:00 UTC barman backups to rustfs S3 with
continuous WAL archiving. These alerts fire when that cadence breaks.

Rules live in `alerts.yaml`. The Prometheus instance selects all
PrometheusRules cluster-wide (`ruleSelectorNilUsesHelmValues: false` in the
kube-prometheus-stack HelmRelease), and Alertmanager routes every alert to
the Discord receiver by default.

## Alerts

- **CnpgBackupFailing** (critical): the last backup attempt failed and no
  backup has succeeded since. Fires on the first failed nightly, resolves on
  the next success. Live-verified against tak's stuck `walArchivingFailing`
  schedule (last failed 2026-11-18, never a success).
- **CnpgBackupStale** (warning): no successful base backup in 26h on a
  cluster that has had at least one. The `> 0` guard keeps epoch-0 series
  (never-backed-up or brand-new clusters) out; catches silent stops such as
  a stuck Backup CR blocking the schedule or a suspended schedule.
- **CnpgWalArchiveFailing** (critical): WAL archiving failed more than 3
  times in 30m. Live-verified: tak's stale-barman `--zstd` rejection showed
  ~85 failures/30m while healthy clusters showed 0.

## Metric basis

CNPG's instance manager exposes Prometheus metrics on each Postgres pod. The
operator creates a PodMonitor per Cluster with `monitoring.enablePodMonitor:
true`; this repo's Prometheus scrapes all PodMonitors cluster-wide. All
series below are per-pod and carry `namespace`/`pod` labels into alerts.

- `cnpg_collector_last_available_backup_timestamp` — epoch of the last
  successful base backup (0 when the cluster never had one)
- `cnpg_collector_last_failed_backup_timestamp` — epoch of the last failed
  backup attempt (0 when none recorded)
- `cnpg_pg_stat_archiver_failed_count` — WAL archive failures, from the
  Postgres `pg_stat_archiver` view

Thresholds: 26h staleness is one missed nightly plus margin (healthy age
cycles 0-24h); the archiver threshold (>3 in 30m) tolerates one-off failed
switches while catching persistent breakage.

## Coverage

The alerts only see clusters with a PodMonitor. kagent's Cluster gained
`monitoring.enablePodMonitor: true` in the same change that added these
alerts; it was the cluster that failed silently for nine days. Clusters
still without a PodMonitor (authentik, immich, gatus, chaptarr, endurain,
invidious, openaev, terminus, wakapi, artex, substrate) are follow-up work
in the CNPG backup-pattern component
(`docs/issues/cnpg-backup-pattern-component.md`).
opentaxii-postgres has no backup wiring at all — no ScheduledBackup, no
backup stanza, no PodMonitor, 39 days live holding the feed data — the
same silent-gap class, to be carried into the component slice alongside
the PodMonitor fleet flip. matrix has a PodMonitor but no ScheduledBackup
and has never been backed up — a separate gap from the same audit.

## Verification

```sh
# rules loaded and current firing state
kubectl port-forward -n prometheus-system svc/kube-prometheus-stack-prometheus 9090:9090
curl -s localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name=="cnpg.backup")'

# what the failing-backup expression returns right now
curl -s localhost:9090/api/v1/query --data-urlencode \
  'query=cnpg_collector_last_failed_backup_timestamp > cnpg_collector_last_available_backup_timestamp' | jq .
```

## References

- **[CNPG Monitoring](https://cloudnative-pg.io/documentation/current/monitoring/)** — instance metrics and PodMonitor setup
