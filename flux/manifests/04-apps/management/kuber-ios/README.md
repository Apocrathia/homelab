# Kuber / Kubenav (iOS) API token

Service account and PushSecret for mobile Kubernetes clients using bearer token auth.

> **Navigation**: [← Back to Management README](../README.md)

## What this is

- **Identity**: `ServiceAccount` `kuber-ios` in namespace `kuber-ios`.
- **Access**: Built-in **`edit`** ClusterRole (cluster-wide namespaced changes: delete pods, exec, patch workloads, etc.) plus **`HelmRelease`** rules for Flux.
- **Credential**: Legacy-type **`Secret`** `kuber-ios-token`; External Secrets **PushSecret** copies `data.token` into 1Password item **`homelab-kuber-ios-token`** (field **`token`**), refreshed every 24h.

RBAC details live in `rbac.yaml`; do not duplicate verb lists here.

## Usage

1. Ensure the 1Password item exists (PushSecret will create/update it).
2. Copy the token from 1Password into Kuber or Kubenav (token auth) along with your API server URL and CA as required.

## Manual token (debug)

```bash
kubectl create token kuber-ios -n kuber-ios --duration=1h
```

Long-lived static secrets use the controller-populated `kuber-ios-token` Secret, which PushSecret syncs.
