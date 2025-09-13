# Services

This directory contains the deployment configuration for platform services that provide core functionality to the homelab cluster.

## Components

### Core Services

- [**Gateway**](gateway/README.md) - Gateway API implementation for traffic management
- [**Authentik**](authentik/README.md) - Identity and access management with SSO
- [**Cert Manager**](cert-manager/README.md) - Automated certificate management
- [**Reloader**](reloader/README.md) - Configuration reloading automation

### Monitoring and Observability

- [**Observability Stack**](observability/README.md) - LGTM stack (Loki, Grafana, Tempo, Mimir)
  - [**Loki**](observability/loki/README.md) - Log aggregation and storage
  - [**Mimir**](observability/mimir/README.md) - Long-term metrics storage
  - [**Alloy**](observability/alloy/) - Log and metrics collection

### Security and Compliance

- [**Kyverno**](kyverno/README.md) - Policy management and enforcement
- [**Trivy**](trivy/README.md) - Security scanning and vulnerability management
- [**External Secrets Operator**](external-secrets/README.md) - Integration with external secret management systems

### Data Services

- [**PostgreSQL Operator**](postgresql/README.md) - CloudNativePG operator for Kubernetes-native PostgreSQL management with enterprise features

### Development and Operations

- [**Dashboard**](dashboard/README.md) - Kubernetes web dashboard
- [**GitLab Integration**](gitlab/) - GitLab Agent and Runner
  - [**Agent**](gitlab/agent/README.md) - Kubernetes cluster agent
  - [**Runner**](gitlab/runner/README.md) - CI/CD runner
- [**Housekeeping**](housekeeping/README.md) - Cluster maintenance automation
- [**W&B Operator**](wandb/README.md) - Weights & Biases Kubernetes operator for ML experiment tracking

## Architecture

The services layer provides:

- **Identity Management**: SSO and authentication through Authentik
- **Traffic Management**: Gateway API for external access and routing
- **Security**: Policy enforcement, scanning, and compliance
- **Monitoring**: Comprehensive observability and alerting
- **Data Services**: PostgreSQL operator for database management
- **ML Operations**: Weights & Biases operator for experiment tracking and model management
- **Development Tools**: CI/CD integration and development workflows
- **Operations**: Automated maintenance and housekeeping tasks

## Dependencies

- **Infrastructure Layer**: Storage, networking, and monitoring infrastructure
- **Bootstrap Layer**: Core Flux and 1Password components
- **External Services**: GitLab, Cloudflare DNS, external monitoring

## Security

All services implement:

- **RBAC**: Role-based access control
- **Network Policies**: Traffic isolation and control
- **Secret Management**: 1Password integration and External Secrets Operator for sensitive data
- **Audit Logging**: Comprehensive audit trails
- **TLS Encryption**: End-to-end encryption for all communications
