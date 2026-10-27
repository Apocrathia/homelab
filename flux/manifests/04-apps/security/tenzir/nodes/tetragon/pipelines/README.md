# Pipelines (tetragon)

One `.tql` file per Tenzir pipeline that `tenzir` runs, plus
`ocsf-archive.tql` (the compaction time rule's `pipeline` — superseded
on the write path by the direct leg, deleted in lap 2a-2) and
`tetragon-attest-verify.tql` (the record_integrity read-back walk).
Each file is the pipeline's `definition`, verbatim.

`tetragon-ocsf.tql` is the record_integrity lane's stamping point
(phase 2, lap 2a-1): the direct CH leg mints the per-record
`metadata.uid` (the chain locator + sort tie-break), bounds the stamp
in a 60s event-time window, sorts each window in (time, uid) order,
and stamps the per-node attestation chain (chain_uid =
tenzir-node-tetragon) before the to_clickhouse INSERT — the
attestation covers the record exactly as stored. The mechanics live
in the homelab package
([`packages/homelab/operators/record_integrity/`](../../../packages/homelab/operators/record_integrity/README.md));
the windowed ordering is pinned by the `tetragon-direct-attest` /
`tetragon-direct-verify-clean` package tests.

`../kustomization.yaml` is the stitch: its `configMapGenerator` packages
these files into a `tenzir-tetragon-pipelines` ConfigMap and its
`replacements` copy them back into the `definition: ""` fields of
`../helmrelease.yaml` at `kustomize build` time. Edit the `.tql` files,
never the HelmRelease placeholders. Rendered node config is byte-identical
to the old inline form.
