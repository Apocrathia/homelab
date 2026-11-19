# Longhorn CRDs

Fetches the upstream Longhorn deployment manifest and patches it down to the
CRDs only. Not applied: the entry in the parent `kustomization.yaml` is
commented out with a "managed by Helm chart" note, so the Longhorn chart owns
its CRDs.

> **Navigation**: [← Back to CRDs README](../README.md)
