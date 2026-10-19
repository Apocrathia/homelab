# Vendored netflow package

The official `netflow` TQL package, vendored byte-for-byte from
[github.com/tenzir/library](https://github.com/tenzir/library) @
`c6bba5f894455ce113f47e923605460b1b720edc` (2026-10-13). It maps
`read_netflow` v5/v9/IPFIX records to OCSF 1.9.0 Network Activity through
the `netflow::ocsf::*` operators; the netflow node's netflow-ingest
pipeline calls `netflow::ocsf::normalize`
([wiring](../../nodes/netflow/helmrelease.yaml)). It replaced the hand-rolled
`homelab::netflow::ocsf::map` per the library-first rule
([context](../../.agents/context/packages.md)). The upstream repo carries
no license file; vendored as-is with provenance recorded here.

## Runtime vs repo-side content

Only `package.yaml` and `operators/` are runtime content — the five files
render as ConfigMaps and mount read-only at `/etc/tenzir/packages/netflow/`
([kustomization](../../kustomization.yaml)). `tests/`, `examples/`, and
`changelog/` are repo-side: the tenzir-test harness runs the baselines from
this tree ([suite](../homelab/tests/README.md)); `examples/` and
`changelog/` are upstream bookkeeping.

## Refresh

Never hand-edit the vendored files; re-copy the whole directory from a
pinned-or-newer upstream commit:

```sh
git clone https://github.com/tenzir/library /tmp/tenzir-library
git -C /tmp/tenzir-library checkout c6bba5f894455ce113f47e923605460b1b720edc  # or newer
rsync -a --delete --exclude README.md /tmp/tenzir-library/netflow/ netflow/
```

Then update the commit hash and date above, re-run the package test suite
(runner pinned to the deployed engine version), and check the kustomization
and HelmRelease wiring still covers every runtime file.
