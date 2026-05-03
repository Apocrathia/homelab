# Loki - Log Aggregation

This directory contains the Flux manifests for Grafana Loki in `loki-system`.

> **Navigation**: [← Back to Observability README](../README.md)

## Deployment Model

Loki is deployed in **SimpleScalable** mode using the community chart and split components:

- `read`
- `write`
- `backend`

This keeps query and ingestion paths separate while staying lightweight for homelab usage.

## Chart Source

- **Chart**: `loki`
- **Repository**: `https://grafana-community.github.io/helm-charts`
- **Version Pinning**: Managed in `helmrelease.yaml`

## Storage Configuration

Loki uses an **external S3-compatible endpoint** for object storage.

- **Storage Type**: `s3`
- **Endpoint**: `http://storage.services.apocrathia.com:9000`
- **Buckets**: `loki` for chunks, ruler, and admin data
- **Auth**: Credentials injected from `loki-secrets` via `valuesFrom`

The in-chart `minio` dependency is disabled.

## Secrets and 1Password

The `OnePasswordItem` at `secret.yaml` syncs `loki-secrets` into `loki-system`.

Required keys:

- `access-key-id`
- `access-key-secret`

These values are mapped into:

- `loki.storage.s3.accessKeyId`
- `loki.storage.s3.secretAccessKey`

## Grafana Integration

Grafana datasource config is defined in `grafana.yaml` and points to:

- `http://loki-read.loki-system.svc:3100`

That endpoint is expected for SimpleScalable deployments.

## Troubleshooting

```bash
kubectl get pods -n loki-system
kubectl get svc -n loki-system
kubectl describe helmrelease loki -n loki-system
```

```bash
kubectl logs statefulset/loki-write -n loki-system
kubectl logs deployment/loki-read -n loki-system
kubectl logs statefulset/loki-backend -n loki-system
```

## References

- [Loki Documentation](https://grafana.com/docs/loki/)
- [Loki Helm Chart Migration](https://github.com/grafana/loki#%EF%B8%8F-helm-chart-migration)
- [Grafana Community Loki Chart Package](https://github.com/grafana-community/helm-charts/pkgs/container/helm-charts%2Floki/826364855?tag=13.3.2)
