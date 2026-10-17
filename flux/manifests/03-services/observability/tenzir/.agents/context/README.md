# `tenzir/.agents/context/`

Sixty-second model of the Tenzir subtree, plus the map of context
modules. Repo-wide context lives in the root
[`.agents/context/`](../../../../../../../.agents/context/README.md); this
is the subtree-local mirror, scoped to tenzir work only.

## What this is

Two standalone Tenzir nodes in namespace `tenzir-system` — Tenzir has no
distributed mode, so each node is a process with its own lake and its own
pipelines. The core node is the detection plane; the tetragon node owns
the export flood. Telemetry normalizes onto one OCSF bus, sigma evaluates
live, and everything archives to one class-partitioned parquet dataset at
`s3://tenzir/ocsf/` that Grafana queries over MotherDuck. Full topology
and secrets: the app folder's [`README.md`](../../README.md).

## Shape of the subtree

| Path              | What lives there                                                            |
| ----------------- | --------------------------------------------------------------------------- |
| `nodes/`          | The two node HelmReleases + READMEs (pipelines, sizing, retention)          |
| `packages/`       | The `homelab` TQL package: parse / OCSF map / findings operators + tests    |
| `detections/`     | Sigma rules (homelab + vendored SigmaHQ/YARA) and the bus semantics         |
| `grafana/`        | The three Tenzir dashboards + MotherDuck datasource ConfigMaps              |
| `.agents/skills/` | Vendored tenzir + tenzir-ocsf doc skills (generated upstream, never edited) |

## Module map

| Module                                 | Open when…                                                        |
| -------------------------------------- | ----------------------------------------------------------------- |
| [`tenzir.md`](./tenzir.md)             | You need what Tenzir the product is, or what runs in this homelab |
| [`architecture.md`](./architecture.md) | You touch the detection/landing planes, bus, archive, or metrics  |
| [`packages.md`](./packages.md)         | You add or edit a TQL operator, OCSF map, or package test         |
| [`traps.md`](./traps.md)               | Before trusting a pipeline, test, or detection result             |
