# Pipelines (enrichment)

The drop zone for the enrichment node's factory pipelines. None ship
yet: the node boots platform-registered and idle, with no
`tenzir.pipelines` entries in
[`../helmrelease.yaml`](../helmrelease.yaml) and no stitch in
[`../kustomization.yaml`](../kustomization.yaml). The first row — the
OpenCTI TAXII intel factory — is built and verified but pending engine
6.20 GA; it lands here with the engine lap (see
[`../README.md`](../README.md)).

Each future pipeline lives as one `.tql` file here (its `definition`,
verbatim), the HelmRelease gains a `pipelines` entry with an empty
`definition` placeholder, and `../kustomization.yaml` grows the
sibling stitch: a `configMapGenerator` entry packaging this folder's
files into a `tenzir-enrichment-pipelines` ConfigMap plus a
`replacements` rule copying each file back into its
`spec.values.tenzir.config.tenzir.pipelines.<id>.definition` field at
`kustomize build` time. Edit the `.tql` files, never the HelmRelease
placeholders. See the investigations and netflow nodes for the exact
shape.

Planned pipeline lanes (see [`../README.md`](../README.md) for the
roadmap): the OpenCTI TAXII intel factory (pending engine 6.20),
`fleet-assets` (Fleet REST API pull, fused asset table into
ClickHouse), abusech threatfox intel as a second intel source, and
baselines once post-6.20 GA lands.
