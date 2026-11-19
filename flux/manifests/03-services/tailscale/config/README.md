# Tailscale Config

Tailscale custom resources: the `exit-nodes` Connector (two replicas
advertising as tailnet exit nodes) and the `peer-relays` PeerRelay with its
Cilium IP pool and L2 announcement policy. Runs as its own Flux
Kustomization so these CRs apply only after the operator's CRDs exist.

> **Navigation**: [← Back to Tailscale README](../README.md)
