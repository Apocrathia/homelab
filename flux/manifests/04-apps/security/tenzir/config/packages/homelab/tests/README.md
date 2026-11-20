# homelab package tests

> **Navigation**: [← homelab package](../README.md)

tenzir-test baselines for every operator in
[`../operators/`](../operators/README.md). Run from the repo root:

```sh
TENZIR_BINARY="uvx tenzir@<deployed-engine-version>" \
  uvx tenzir-test --root ./flux/manifests/04-apps/security/tenzir/packages
```

Pin the runner to the deployed engine version (the node images live in the
node HelmReleases); all baselines stay warning-free.
