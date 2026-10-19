# Pipelines (netflow)

One `.tql` file per Tenzir pipeline that `netflow` runs, plus `ocsf-archive.tql` (the compaction time rule's `pipeline`).
Each file is the pipeline's `definition`, verbatim.

`../kustomization.yaml` is the stitch: its `configMapGenerator` packages
these files into a `tenzir-netflow-pipelines` ConfigMap and its
`replacements` copy them back into the `definition: ""` fields of
`../helmrelease.yaml` at `kustomize build` time. Edit the `.tql` files,
never the HelmRelease placeholders. Rendered node config is byte-identical
to the old inline form.
