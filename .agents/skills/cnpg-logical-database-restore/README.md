# `cnpg-logical-database-restore`: CNPG dump/restore runbook (skill)

`SKILL.md` is the runbook for a logical CloudNativePG restore: suspend Flux,
`pg_dump` from PGDATA on the instance PVC via the `cnpg-data-extract` chart,
build a fresh `Cluster`, `pg_restore` via `cnpg-data-restore`, then resume
Flux. Longhorn volume restore itself is operator-led.

> **Navigation**: [← Back to Skills README](../README.md)
