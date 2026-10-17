# The `homelab` TQL package

Anatomy of [`packages/homelab/`](../../packages/homelab/README.md), the
TQL package both nodes mount read-only at `/etc/tenzir/packages`
(rendered as ConfigMaps by the root
[`kustomization.yaml`](../../kustomization.yaml)). Vendored docs:
package [guides](../skills/tenzir/guides/packages/) (create / install /
test / publish),
[`package_add`](../skills/tenzir/reference/operators/package_add.md) and
[`package_list`](../skills/tenzir/reference/operators/package_list.md)
(installing and listing packages), package test
[guide](../skills/tenzir/guides/packages/test-packages.md).

## Anatomy

One folder per feed under
[`operators/`](../../packages/homelab/operators/README.md), each operator
a self-contained pipeline stage:

- `parse.tql` — raw payload → structured record
- `ocsf/map.tql` — structured record → OCSF event
- `findings/stamp.tql` — Detection Finding (2004) post-processing: the
  stable uid (rule id + subject fingerprint) the archive dedup and the
  triage lifecycle joins use

## Tests

[`tests/`](../../packages/homelab/tests/README.md) pins every operator's
output as tenzir-test baselines — `<name>.input` / `<name>.tql` /
`<name>.txt` triplets. Run from the repo root:

```sh
TENZIR_BINARY="uvx tenzir@6.19.1" \
  uvx tenzir-test --root ./flux/manifests/03-services/observability/tenzir/packages
```

Pin the runner to the deployed engine version (the node images live in
the node HelmReleases; the runner banner confirms the pin on every run).
All baselines must stay warning-free.

## Library-first

Durable guidance: before writing any new TQL operator, OCSF mapping, or
detection package here, check
[github.com/tenzir/library](https://github.com/tenzir/library) first —
leverage its packages wherever possible instead of inventing our own.
Precedent: `packages/homelab/operators/netflow/` (flow record → OCSF
Network Activity map) was hand-rolled before this rule and is a candidate
to revisit against tenzir/library.

## Adding a feed end to end

1. Operators: `operators/<feed>/parse.tql` and `operators/<feed>/ocsf/map.tql`
2. Baselines: `<feed>-parse` and `<feed>-ocsf-map` triplets in
   [`tests/`](../../packages/homelab/tests/README.md)
3. `configMapGenerator` entries in the root
   [`kustomization.yaml`](../../kustomization.yaml) (files stay in the
   shared `packages/` tree)
4. Mount and pipeline wiring in the target node's HelmRelease (subPath
   `extraVolumeMounts`)
5. A `README.md` for the new operator folder

## Sources

- [`packages/README.md`](../../packages/README.md) — package source of
  truth, baseline pinning
- [`packages/homelab/README.md`](../../packages/homelab/README.md) —
  package layout and convention
- [`operators/README.md`](../../packages/homelab/operators/README.md) and
  the per-feed READMEs — stage taxonomy
- [`tests/README.md`](../../packages/homelab/tests/README.md) — runner
  command and engine-version pin
- [`nodes/core/README.md`](../../nodes/core/README.md) — ConfigMap +
  subPath mount recipe
- [`kustomization.yaml`](../../kustomization.yaml) — generator entries
