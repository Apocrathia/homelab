# Pipelines (enrichment)

The drop zone for the enrichment node's factory pipelines — one
pipeline as of lap 2:

- [`fleet-assets-pull.tql`](./fleet-assets-pull.tql) — the hourly
  Fleet host-inventory pull (`GET /api/v1/fleet/hosts`, Bearer via
  the `fleetdm-token` secret) into `ocsf.fleet_assets` on the
  ClickHouse query store. The core node's loader pipeline is the
  consumer half.

The factory lanes on this node are internal reference data only (see
[`../README.md`](../README.md) for the roadmap): `fleet-assets`
(shipped above) and baselines once the post-6.20 GA capability
lands. Threat intel is not this node's lane — it lives on the
[intel node](../../intel/README.md).

Each pipeline lives as one `.tql` file here (its `definition`,
verbatim), the HelmRelease carries a `pipelines` entry with an empty
`definition` placeholder, and [`../kustomization.yaml`](../kustomization.yaml)
stitches: a `configMapGenerator` entry packaging this folder's files
into a `tenzir-enrichment-pipelines` ConfigMap plus a `replacements`
rule copying each file back into its
`spec.values.tenzir.config.tenzir.pipelines.<id>.definition` field at
`kustomize build` time. Edit the `.tql` files, never the HelmRelease
placeholders. See the investigations and netflow nodes for the exact
shape.
