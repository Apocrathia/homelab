# Packages

Shared TQL package source for all three nodes, rendered as ConfigMaps by the
root [`kustomization.yaml`](../kustomization.yaml) and mounted read-only
into the node pods at `/etc/tenzir/packages`. One source of truth: the
tenzir-test baselines in [`homelab/tests/`](./homelab/tests/README.md)
pin every operator's output, and the runner must match the deployed
engine version.
