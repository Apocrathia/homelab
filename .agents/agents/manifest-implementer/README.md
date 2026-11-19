# `manifest-implementer` — GitOps manifest editor (persona)

`agent.md` charters the implementer role for Flux/Helm/Kustomize changes:
careful, minimal edits to workloads, HelmReleases, and values, with local
validation renders under `.scratch/`. It does not mutate the cluster, commit,
or touch `helm/generic-app` and bootstrap without explicit confirmation.

> **Navigation**: [← Back to Personas README](../README.md)
