# Pipelines (intel)

The CTI factory plane's pipeline drop zone. One row ships:
[opencti-taxii-factory.tql](./opencti-taxii-factory.tql), the intel
factory's first lane — OpenCTI's TAXII 2.1 indicator collection pulled
on a dual schedule (daily 07:00 full walk + 01/13/19 added_after polls)
into the ClickHouse `ocsf.OSINT_Inventory_Info` lookup table, with the
core node's
[opencti-osint-loader](../core/pipelines/opencti-osint-loader.tql) as
the consumer half.

Each pipeline lives as one `.tql` file here (its `definition`, verbatim);
the HelmRelease carries a `pipelines` entry with an empty `definition`
placeholder, and [`../kustomization.yaml`](../kustomization.yaml) holds
the stitch: a `configMapGenerator` entry packaging this folder's files
into a `tenzir-intel-pipelines` ConfigMap plus a `replacements` rule
copying each file back into its
`spec.values.tenzir.config.tenzir.pipelines.<id>.definition` field at
`kustomize build` time. Edit the `.tql` files, never the HelmRelease
placeholders. See the investigations and netflow nodes for the same
shape.

Planned future lanes (see [`../README.md`](../README.md) for the
roadmap): abuse.ch ThreatFox as a second intel source into its own
ClickHouse table plus ingress loaders — the factory pattern proven by
the OpenCTI row.
