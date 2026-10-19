# Pipelines (introspection)

One `.tql` file per Tenzir pipeline that `introspection` runs. Each file
is the pipeline's `definition`, verbatim; `../kustomization.yaml` is the
stitch: its `configMapGenerator` packages these files into a
`tenzir-introspection-pipelines` ConfigMap and its `replacements` copy
them back into the `definition: ""` fields of
[`../helmrelease.yaml`](../helmrelease.yaml) at `kustomize build` time.
Edit the `.tql` files, never the HelmRelease placeholders.

- [`diagnostics-to-loki.tql`](./diagnostics-to-loki.tql): every live,
  not-hidden diagnostic of this node's own pipelines to Loki as
  `job=tenzir-diagnostics` entries (`node=introspection`) — the retired
  per-node lanes' exact shape, so the Grafana dashboard sees this node
  like any other.
- [`error-diagnostics-to-mimir.tql`](./error-diagnostics-to-mimir.tql):
  the error/warning samples to Mimir
  (`tenzir_pipeline_errors` / `tenzir_pipeline_warnings`,
  `node="introspection"`).

The other six nodes' diagnostics ship through the central poller
([`../poller.yaml`](../poller.yaml)), not through this node's config.
