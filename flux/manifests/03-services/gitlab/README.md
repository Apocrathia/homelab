# GitLab

GitLab integration for the cluster, split into the `agent/` and `runner/`
subtrees. `flux-notifications.yaml` posts Flux Kustomization events to GitLab
as commit statuses, and `secret.yaml` supplies the token through a 1Password
Item.

> **Navigation**: [← Back to Services README](../README.md)
