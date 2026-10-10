# Staged Tenzir mapping package (SIEM lap C)

TQL mapping package that turns tetragon's `export-stdout` event stream into
OCSF. It is **staged here** until lap B
([Tenzir node](../../observability/tenzir/)) merges — its final home is
`tenzir/packages/homelab/operators/tetragon/`, wired into the tenzir
`kustomization.yaml` ConfigMaps (lap-C part 2, together with the intake
pipeline; see the prep report's transport gap notes for tetragon and fleet).

Layout mirrors lap B's homelab package: dispatcher
(`operators/tetragon/ocsf/map.tql`) + per-kind leaves under
`ocsf/events/` + tests. `package.yaml` is NOT included — lap B's
`tenzir/packages/homelab/package.yaml` owns the `homelab` package id after
the merge.

Run the tests from a merged copy (lap B package + this one):

```sh
# merge the two package trees under one homelab/ dir, then:
TENZIR_BINARY="uvx tenzir@6.18.1" \
  uvx tenzir-test --root ./<merged>/packages
```

(`--root` names the test root for discovery; `--package-dirs` only controls
operator visibility and is silently ignored for discovery — the same pattern
lap B's tenzir README documents.)

Verified against Tenzir v6.18.1 (the lap-B node pin) and v6.19.1 (the
harness's `uvx tenzir` fallback): both suites pass, `ocsf_cast` clean (no schema
warnings) across all six arms — process_exec, process_exit,
secret-file-access kprobe, container-escape kprobe, tcp_connect kprobe
(egress policy), and the unknown-kind Base Event fallback (which now maps
`time` and `device.hostname` like every other arm).
