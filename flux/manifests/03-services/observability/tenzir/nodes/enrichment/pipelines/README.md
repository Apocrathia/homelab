# Pipelines (enrichment)

The drop zone for the enrichment node's factory pipelines. Lap 1 ships
none: the node boots platform-registered and idle, with no
`tenzir.pipelines` entries in
[`../helmrelease.yaml`](../helmrelease.yaml) and no stitch in
[`../kustomization.yaml`](../kustomization.yaml).

From lap 2 on, each pipeline lives as one `.tql` file here (its
`definition`, verbatim), the HelmRelease gains a `pipelines` entry with
an empty `definition` placeholder, and `../kustomization.yaml` grows the
sibling stitch: a `configMapGenerator` entry packaging this folder's
files into a `tenzir-enrichment-pipelines` ConfigMap plus a
`replacements` rule copying each file back into its
`spec.values.tenzir.config.tenzir.pipelines.<id>.definition` field at
`kustomize build` time. Edit the `.tql` files, never the HelmRelease
placeholders. See the investigations and netflow nodes for the exact
shape.

Planned pipeline lanes (see [`../README.md`](../README.md) for the
roadmap): `fleet-assets` (Fleet REST API pull, fused asset table into
ClickHouse), abusech threatfox intel, and baselines once post-6.20 GA
lands.
