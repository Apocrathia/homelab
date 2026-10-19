# homelab package tests

tenzir-test baselines for every operator in
[`../operators/`](../operators/README.md). Run from the repo root:

```sh
TENZIR_BINARY="uvx tenzir@6.19.1" \
  uvx tenzir-test --root ./flux/manifests/04-apps/security/tenzir/packages
```

Pin the runner to the deployed engine version; all baselines stay
warning-free.
