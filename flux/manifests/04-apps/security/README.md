# Security

Threat-intelligence and security-analysis platforms for the homelab.

> **Navigation**: [← Back to Apps README](../README.md)

## Applications

### [MISP](./misp/README.md)

MISP threat-intelligence sharing platform (open source): curated feeds, event
and indicator management, community sharing, and enrichment via misp-modules.
MariaDB + valkey are in-cluster subchart dependencies; authentik OIDC SSO is
included with the local login kept as break-glass.

### [OpenCTI](./opencti/README.md)

OpenCTI threat-intelligence knowledge platform (open source): STIX 2.1
knowledge graph, dashboards, investigations, and a connector ecosystem. A
single-node OpenSearch, rabbitmq, and dragonfly run as subchart dependencies;
object storage rides the NAS rustfs bucket `opencti-files`. Authentik SSO and the MISP import connector are included.

## Overview

Security tooling that consumes or produces threat intelligence lives here
(MISP and OpenCTI). Deployed via Flux; external access goes
through the `main-gateway` with Gateway API HTTPRoutes, hostnames under
`security.gateway.services.apocrathia.com` are reserved but app routes follow
the `<app>.gateway.services.apocrathia.com` convention.

## References

- **[MISP](https://www.misp-project.org/)** - Threat sharing platform
- **[cmu-sei/misp-helm](https://github.com/cmu-sei/misp-helm)** - Helm chart consumed via GitRepository
- **[OpenCTI](https://www.opencti.io/)** - Threat-intelligence knowledge platform
- **[devops-ia/helm-opencti](https://github.com/devops-ia/helm-opencti)** - Helm chart from its published repository
