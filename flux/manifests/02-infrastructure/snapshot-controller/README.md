# Snapshot Controller

CSI external-snapshotter snapshot-controller and volume snapshot CRDs
(`snapshot.storage.k8s.io`), deployed from the home-operations OCI chart.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

- Runs the upstream `snapshot-controller` in `kube-system`
- Installs the `VolumeSnapshot`, `VolumeSnapshotContent`, and
  `VolumeSnapshotClass` CRDs (unmodified from
  [kubernetes-csi/external-snapshotter](https://github.com/kubernetes-csi/external-snapshotter))
- Creates the `longhorn` `VolumeSnapshotClass` (default class,
  `deletionPolicy: Delete`)

Longhorn's own chart ships neither the snapshot controller nor a
`VolumeSnapshotClass`, so this stack is installed separately. It is the
prerequisite for [kopiur](../kopiur/README.md)'s default
`copyMethod: Snapshot` (point-in-time capture via a staged PVC) and for any
other CSI snapshot consumer.

## Configuration

See `helmrelease.yaml`. The `VolumeSnapshotClass` is managed through the
chart's `volumeSnapshotClasses` value so the class lands with the CRDs it
depends on.

## Usage

```bash
# Snapshot classes available to PVCs
kubectl get volumesnapshotclasses.snapshot.storage.k8s.io

# Take a manual snapshot of a PVC
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: test-snapshot
  namespace: <pvc-namespace>
spec:
  source:
    persistentVolumeClaimName: <pvc-name>
EOF
```

- **Chart**: <https://github.com/home-operations/helm-charts/tree/main/charts/snapshot-controller>
- **Upstream**: <https://kubernetes-csi.github.io/docs/snapshot-controller.html>
