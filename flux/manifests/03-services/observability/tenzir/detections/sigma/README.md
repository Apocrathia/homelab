# Sigma rules

The sigma rule corpus the core node's sigma-detection pipeline evaluates
over the OCSF bus with `mapping="auto"`.

- [`homelab/`](./homelab/README.md): rules written against OCSF field
  paths (they evaluate live)
- [`sigmahq/`](./sigmahq/README.md): vendored SigmaHQ kubernetes-audit
  corpus (raw audit fields; parked until upstream translates it)
