# Vendored tenzir package

The official `tenzir` utilities TQL package, vendored byte-for-byte from
[github.com/tenzir/library](https://github.com/tenzir/library) @
`c6bba5f894455ce113f47e923605460b1b720edc` (2026-10-13). This lane mounts
its OSINT pair: `tenzir::osint::update_context` loads OCSF OSINT Inventory
Info events into the shared `ocsf-osint` lookup table (the core node's
opencti-osint-loader pipeline,
[wiring](../../nodes/core/helmrelease.yaml)), and `tenzir::osint::enrich`
stamps matched OSINT objects onto in-stream category-4 events — the
consumption half that no node's pipelines call yet. The package's
detect/ocsf operators ride along unmounted. The upstream repo carries no
license file; vendored as-is with provenance recorded here.

## Runtime vs repo-side content

Only `package.yaml` and `operators/` are runtime content; this lane's
nodes mount the osint pair plus `package.yaml`, rendering as ConfigMaps
read-only at `/etc/tenzir/packages/tenzir/`
([kustomization](../../kustomization.yaml)). `tests/`, `examples/`, and
`changelog/` are repo-side: the tenzir-test harness runs the baselines
from this tree ([suite](../homelab/tests/README.md)); `examples/` and
`changelog/` are upstream bookkeeping. Note that `package.yaml` declares
the `process-name-baselines` lookup-table context — every node that loads
this package materializes that context at boot, unused until a baseline
lane consumes it.

## Refresh

Never hand-edit the vendored files; re-copy the whole directory from a
pinned-or-newer upstream commit:

```sh
git clone https://github.com/tenzir/library /tmp/tenzir-library
git -C /tmp/tenzir-library checkout c6bba5f894455ce113f47e923605460b1b720edc  # or newer
rsync -a --delete --exclude README.md /tmp/tenzir-library/tenzir/ tenzir/
```

Then update the commit hash and date above, re-run the package test suite
(runner pinned to the deployed engine version), and check the kustomization
and HelmRelease wiring still covers every runtime file.
