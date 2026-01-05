# CoreDNS Configuration

GitOps management of the Talos-deployed CoreDNS.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Documentation

- **[CoreDNS Documentation](https://coredns.io/manual/toc/)** - Primary documentation source
- **[GitHub Repository](https://github.com/coredns/coredns)** - Source code and issues

## Overview

Talos deploys CoreDNS during cluster bootstrap but doesn't expose replica configuration. This kustomization patches the deployment to control scaling.

## Configuration

- **Replicas**: 4 (configured in `deployment-patch.yaml`)

## Notes

- `prune: false` is set because Talos owns the base resource
- Flux applies patches on top of Talos-managed deployment
