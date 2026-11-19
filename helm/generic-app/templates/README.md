# templates — generic-app chart renders

The render surface behind the shared app chart: Deployment, Services, Gateway
API routes (http/tcp/udp), the CNPG cluster with backup and monitoring, Longhorn
and SMB storage, the Authentik tofu workspace, the kopia backup policy, and the
Cilium load-balancer pieces. Every block is values-gated; only enabled pieces
render.

> **Navigation**: [← Back to generic-app README](../README.md)
