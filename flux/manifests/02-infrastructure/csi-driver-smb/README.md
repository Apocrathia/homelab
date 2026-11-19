# CSI Driver SMB

CSI driver that lets workloads mount SMB shares as persistent volumes. This
deployment installs the driver only; the shares themselves are static
per-app PVs. There is no StorageClass and no dynamic provisioning.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

- HelmRelease `csi-driver-smb` into `kube-system` (chart pinned and
  Renovate-managed in `helmrelease.yaml`)
- Controller runs on control-plane nodes (toleration in `helmrelease.yaml`)
- Windows support is disabled: the Talos cluster is linux/amd64-only, the
  chart's default windows DaemonSet schedules zero pods, and its
  windows/amd64-only image fails trivy scan jobs

## How apps consume it

Each consumer owns its share wiring in its own directory.
`04-apps/games/rom-audit/smb-storage.yaml` is the canonical example:

1. A static `PersistentVolume` with `csi.driver: smb.csi.k8s.io`,
   `volumeAttributes.source` pointing at the NAS share, and a
   `nodeStageSecretRef` naming the app's credentials secret
2. A matching PVC with `storageClassName: ""` and `volumeName` pinned to
   the PV
3. Credentials materialized by a `OnePasswordItem` CR, never a bare
   managed Secret and never `kubectl create secret`:

   ```yaml
   apiVersion: onepassword.com/v1
   kind: OnePasswordItem
   metadata:
     name: <app>-smb-credentials
     namespace: <app>
   spec:
     itemPath: "vaults/Secrets/items/smb-credentials"
   ```

Search for `smb.csi.k8s.io` under `flux/manifests/04-apps/` for the current
consumer set (rom-audit, skyscraper, immich, jupyterhub, and friends).

## Troubleshooting

```bash
# Driver pods (controller + node plugin)
kubectl get pods -n kube-system | grep csi-smb

# Node plugin logs (mount failures land here)
kubectl logs -n kube-system daemonset/csi-smb-node
```

## References

- **[CSI Driver SMB](https://github.com/kubernetes-csi/csi-driver-smb)** - Official documentation
- **[Kubernetes CSI](https://kubernetes-csi.github.io/docs/)** - CSI specification
