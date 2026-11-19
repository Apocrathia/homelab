# Kyverno Policies

Kyverno policy manifests (CEL-based `policies.kyverno.io/v1` types):
admission rules, a deployment-recreate rule for MCPServers, the Docker Hub
pull-secret clone plus its pod injection, and the dormant legacy resource
cleanup policies. `kustomization.yaml` applies the active set; the cleanup
entries are commented out and kept for reference. The parent README
documents each policy.

> **Navigation**: [← Back to Kyverno README](../README.md)
