# `generic-app-longhorn-restore`: Longhorn volume recovery (skill)

`SKILL.md` is the runbook for restoring a Longhorn-backed volume of a
`generic-app` Helm workload: detach workloads, restore from a Longhorn backup
onto the Git-named volume, re-render PV/PVC when needed, scale back up. CNPG
instance PVCs route to the `cnpg-logical-database-restore` skill instead.

> **Navigation**: [← Back to Skills README](../README.md)
