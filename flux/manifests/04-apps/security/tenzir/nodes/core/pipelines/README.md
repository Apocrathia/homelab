# Pipelines (core)

One `.tql` file per Tenzir pipeline that `core` runs, plus `ocsf-archive.tql` (the compaction time rule's `pipeline`) and `detection-attest-verify.tql` (the record_integrity read-back walk).
Each file is the pipeline's `definition`, verbatim.

`ocsf-archive.tql` is the record_integrity lane's stamping point: the
archive rule's pipeline mints the per-record `metadata.uid` (the chain
locator + sort tie-break), sorts the pass in (time, uid) order, and
stamps the per-node attestation chain (chain_uid = tenzir-node-core)
before the to_clickhouse INSERT — the attestation covers the record
exactly as archived. The mechanics live in the homelab package
([`packages/homelab/operators/record_integrity/`](../../../packages/homelab/operators/record_integrity/README.md)).

`../kustomization.yaml` is the stitch: its `configMapGenerator` packages
these files into a `tenzir-core-pipelines` ConfigMap and its
`replacements` copy them back into the `definition: ""` fields of
`../helmrelease.yaml` at `kustomize build` time. Edit the `.tql` files,
never the HelmRelease placeholders. Rendered node config is byte-identical
to the old inline form.
