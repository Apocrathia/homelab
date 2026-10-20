# Vendored stix package

The official `stix` TQL package, vendored byte-for-byte from
[github.com/tenzir/library](https://github.com/tenzir/library) @
`c6bba5f894455ce113f47e923605460b1b720edc` (2026-10-13). It fetches STIX
2.1 objects from TAXII 2.1 collections through `stix::taxii::fetch` and
maps STIX Indicators to OCSF 1.9.0 OSINT Inventory Info through the
`stix::ocsf::*` operators; the intel node's opencti-taxii-factory-walk
and opencti-taxii-factory-poll pipelines call them
([wiring](../../nodes/intel/helmrelease.yaml)), the intel factory's
first row. The upstream repo carries no license file; vendored as-is with
provenance recorded here.

## Runtime vs repo-side content

Only `package.yaml` and `operators/` are runtime content — the four files
render as ConfigMaps and mount read-only at `/etc/tenzir/packages/stix/`
([kustomization](../../kustomization.yaml)). `tests/`, `examples/`,
`fixtures/`, and `changelog/` are repo-side: the tenzir-test harness runs
the baselines from this tree ([suite](../homelab/tests/README.md)),
`fixtures/` carries the synthetic TAXII servers those tests spin up, and
`examples/` and `changelog/` are upstream bookkeeping. The four
`tests/taxii/` baselines need the 6.20 engine line (the fetch operator
uses `entries()`), so the repo's 6.19.1-pinned test runner reports them
as its four documented failures; the intel node runs the 6.20-rc engine
where they hold.

## Refresh

Never hand-edit the vendored files; re-copy the whole directory from a
pinned-or-newer upstream commit:

```sh
git clone https://github.com/tenzir/library /tmp/tenzir-library
git -C /tmp/tenzir-library checkout c6bba5f894455ce113f47e923605460b1b720edc  # or newer
rsync -a --delete --exclude README.md /tmp/tenzir-library/stix/ stix/
```

Then update the commit hash and date above, re-run the package test suite
(runner pinned to the deployed engine version), and check the kustomization
and HelmRelease wiring still covers every runtime file.
