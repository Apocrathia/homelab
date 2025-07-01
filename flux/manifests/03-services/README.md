# Core Services

This directory contains essential services that support the cluster's functionality and other applications.

## Current Services

- [Gateway API](gateway/)
  - Cilium-based Gateway API implementation
  - Load balancer IP management
  - HTTP/HTTPS traffic routing
  - TLS termination support
- GitLab
  - [Agent](gitlab/agent/README.md)
    - GitLab Agent for Kubernetes (KAS)
    - CI/CD integration with cluster
    - Project-specific access control
    - Automated secret management via 1Password
  - [Runner](gitlab/runner/README.md)
    - Kubernetes-based CI/CD runner
    - 2 runner manager pods for high availability
    - Supports up to 10 concurrent jobs
    - Docker-in-Docker support
    - Automated secret management via 1Password
- Cert-Manager
  - Automated certificate management
  - Wildcard certificate generation
  - Cluster-wide certificate issuer

## Suggested Services

_Typical services to consider adding:_

- _DNS services_
- _Authentication providers_
- _CI/CD tools_
- _Observability_

## Guidelines

_Best practices to follow:_

- _Maintain service dependencies_
- _Configure high availability where needed_
- _Set up proper monitoring_
- _Document service interactions_
- _Follow security best practices_
- _Use appropriate resource allocation_
