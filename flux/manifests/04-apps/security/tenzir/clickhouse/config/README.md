# ClickHouse cluster configuration

The two XML files here are the source of truth for the tenzir
ClickHouse cluster's `config.d` content; the cluster CR
([`../cluster.yaml`](../cluster.yaml)) no longer carries them inline.

| File                                                 | Role                                                                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`00-storage-tiered.xml`](./00-storage-tiered.xml)   | Disk/volume definitions: `hot` (Longhorn-backed PVC) and `cold` (rustfs S3, `tenzir` bucket under the `clickhouse/` prefix, credentials from the `tenzir-secrets` item via `CH_S3_*` env). |
| [`10-startup-scripts.xml`](./10-startup-scripts.xml) | Boot-time DDL: the `investigations` database + `investigations.records` (single-JSON shape) and the tenzir ocsf lake tables. **Ordering is load-bearing** — see the ordering note inside.  |

## Stitch contract

These files are packaged by the `tenzir-clickhouse-config` configMap
(`disableNameSuffixHash: true`, stable name) and byte-copied into the
ClickHouseInstallation's `spec.configuration.files` by the two
`replacements` rules in
[`../kustomization.yaml`](../kustomization.yaml) — the same
configMapGenerator + replacements idiom the tenzir nodes use for their
pipeline TQL. The `files` entries in `cluster.yaml` are empty-string
placeholders the replacements overwrite; edit the XML files here, never
`cluster.yaml`.

Table-shape doctrine (single-JSON column, vendor decision rule, the
typed-column failure story) lives in
[`../README.md`](../README.md).
