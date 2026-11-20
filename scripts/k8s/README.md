# `scripts/k8s/`: Kubernetes cleanup helpers

`delete-terminal-pods.sh` removes pods in terminal phases (Succeeded,
Failed, Evicted) after cluster disruption. Dry-run is the default; set
`DRY_RUN=0` to delete.

> **Navigation**: [← Home](../README.md)
