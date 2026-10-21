# Pipelines (netflow)

One `.tql` file per Tenzir pipeline that `netflow` runs, plus
`ocsf-archive.tql` (the compaction time rule's `pipeline`) and
`netflow-attest-verify.tql` (the record_integrity read-back walk).
Each file is the pipeline's `definition`, verbatim.

`ocsf-archive.tql` is the record_integrity lane's stamping point: the
archive rule's pipeline mints the per-record `metadata.uid` (the chain
locator + sort tie-break — load-bearing here, v5 flow stamps tie whole
datagrams deep), sorts the pass in (time, uid) order, and stamps the
per-node attestation chain (chain_uid = tenzir-node-netflow) before
the to_clickhouse INSERT — the attestation covers the record exactly
as archived. The mechanics live in the homelab package
([`packages/homelab/operators/record_integrity/`](../../../packages/homelab/operators/record_integrity/README.md)).

`../kustomization.yaml` is the stitch: its `configMapGenerator` packages
these files into a `tenzir-netflow-pipelines` ConfigMap and its
`replacements` copy them back into the `definition: ""` fields of
`../helmrelease.yaml` at `kustomize build` time. Edit the `.tql` files,
never the HelmRelease placeholders. Rendered node config is byte-identical
to the old inline form.
