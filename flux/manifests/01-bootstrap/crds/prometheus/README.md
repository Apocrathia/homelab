# Prometheus CRDs

Pulls the kube-prometheus-stack CRD manifests from the upstream Helm chart
repo, stripping the OpenAPI annotations that exceed the API server's
262144-byte limit. Not applied: the entry in the parent `kustomization.yaml`
is commented out with a "managed by Helm chart" note, so the
kube-prometheus-stack chart owns its CRDs.

> **Navigation**: [← Back to CRDs README](../README.md)
