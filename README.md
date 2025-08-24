# Homelab Kubernetes Cluster

This repository contains my personal homelab Kubernetes cluster configuration. It's what I use to experiment with and run the services that power my home network. Think of it as a ridiculously robust way to host home services while playing with Kubernetes.

## Overview

After years of using k3s, I wanted to migrate my home services to a more standard Kubernetes setup. This homelab provides a path forward from Docker Compose, giving me a production-like environment to learn and experiment with. The cluster is live and actively managed by Flux using the contents of this repository.

Similar to other Flux-based cluster projects, but built from scratch to learn Kubernetes concepts deeply.

## Architecture

### Talos Linux

Using [Talos Linux](https://talos.dev/) as the base OS - vanilla Kubernetes but with a different (and awesome) install method. It's minimal, secure, and purpose-built for Kubernetes without the overhead of a full Linux distribution.

### Infrastructure

Entirely virtualized on 4x Proxmox VMs:

- **Control Plane**: 4 nodes for high availability
- **Worker Nodes**: The same 4 nodes as the control plane
- **Storage**: Longhorn distributed storage
- **Networking**: Cilium with Gateway API

## Key Technologies

- **Kubernetes Distribution**: Talos Linux (vanilla k8s)
- **GitOps**: Flux CD for continuous deployment
- **Secrets Management**: 1Password Connect
- **CI/CD**: GitLab Agent + Runner
- **Storage**: Longhorn (distributed block storage) + SMB integration
- **Networking**: Cilium CNI with Gateway API
- **Authentication**: Authentik SSO with automatic outpost deployment
- **Monitoring**: Prometheus + Grafana stack + LGTM (Loki, Grafana, Tempo, Mimir)
- **Security**: Kyverno policies + Trivy scanning + Chaos Mesh testing
- **Database**: CloudNativePG operator for PostgreSQL management
- **Automation**: Renovate for dependency management and updates + n8n for workflow automation
- **Housekeeping**: Automated cluster maintenance and resource cleanup

### Application Deployment

- **Simple Helm Usage**: Direct `helm install` commands for straightforward deployments
- **Generic App Chart**: Reusable template at `helm/generic-app/` with built-in patterns for:
  - Authentik SSO integration with automatic outpost deployment
  - Longhorn persistent storage or SMB network storage
  - 1Password Connect secrets management
  - Multiple networking options (HTTPRoute, LoadBalancer, TCP routes)
  - Security contexts and non-root containers
- **Demo-First**: Use the demo app as a reference for new application deployments
- **Values-Driven**: Simple YAML values files instead of complex manifests
- **Layered Architecture**: 04-apps layer for user-facing applications with proper separation

### Automation & Maintenance

- **Renovate Integration**: Automated dependency updates for Kubernetes manifests and Helm charts
- **Housekeeping Automation**: Scheduled cluster maintenance and resource cleanup
- **Security Scanning**: Automated vulnerability scanning with Trivy
- **Backup Management**: Longhorn snapshots and backup automation

## Features

### 🏠 Home Services Platform

- Host all your home network services in Kubernetes
- Production-like reliability for personal use
- Easy scaling and updates via GitOps

### 🔬 Learning & Experimentation

- Deep dive into Kubernetes concepts
- Test new services and configurations
- Learn by doing with real workloads

### 🚀 GitOps-First

- Everything managed through Git
- Automated deployments and rollbacks
- Infrastructure as Code principles

### 🔒 Security & Observability

- SSO authentication via Authentik
- Comprehensive monitoring and alerting
- Security scanning and policy enforcement

## Documentation Navigation

This repository follows a comprehensive layered documentation structure. Start here and drill down based on what you need:

### 🏗️ Getting Started

- **[Cluster Bootstrap](./talos/README.md)** - Complete Talos Linux cluster setup guide
- **[Flux Setup](./flux/README.md)** - GitOps deployment configuration and bootstrap
- **[Generic App Chart](./helm/generic-app/README.md)** - Reusable Helm chart for application deployment

### 🏢 Layer Navigation

- **[Bootstrap Layer](./flux/manifests/01-bootstrap/README.md)** - Core components (Flux, CRDs, Helm repos, 1Password)
- **[Infrastructure Layer](./flux/manifests/02-infrastructure/README.md)** - Networking, storage, monitoring foundation
- **[Services Layer](./flux/manifests/03-services/README.md)** - Platform services, security, and operations
- **[Apps Layer](./flux/manifests/04-apps/README.md)** - User-facing applications and examples

### 📋 Component Documentation

Each major component has detailed documentation with setup, configuration, and troubleshooting:

#### Core Infrastructure

- **[Talos Linux](./talos/README.md)** - Kubernetes distribution setup and management
- **[Cilium](./flux/manifests/02-infrastructure/cilium/README.md)** - CNI, network policies, and Gateway API
- **[Longhorn](./flux/manifests/02-infrastructure/longhorn/README.md)** - Distributed storage with backup capabilities
- **[CSI Driver SMB](./flux/manifests/02-infrastructure/csi-driver-smb/README.md)** - SMB storage integration
- **[Kube Prometheus Stack](./flux/manifests/02-infrastructure/kube-prometheus-stack/README.md)** - Monitoring and alerting
- **[Metrics Server](./flux/manifests/02-infrastructure/metrics-server/README.md)** - Resource metrics collection

#### Platform Services

- **[Authentik](./flux/manifests/03-services/authentik/README.md)** - Identity and access management with SSO
- **[Cert Manager](./flux/manifests/03-services/cert-manager/README.md)** - Automated certificate management
- **[PostgreSQL](./flux/manifests/03-services/postgresql/README.md)** - CloudNativePG operator for database management
- **[GitLab Agent](./flux/manifests/03-services/gitlab/agent/README.md)** - Kubernetes cluster agent
- **[GitLab Runner](./flux/manifests/03-services/gitlab/runner/README.md)** - CI/CD runner
- **[Gateway](./flux/manifests/03-services/gateway/README.md)** - Gateway API implementation

#### Monitoring & Observability

- **[Observability Stack](./flux/manifests/03-services/observability/README.md)** - LGTM stack components
- **[Loki](./flux/manifests/03-services/observability/loki/README.md)** - Log aggregation and storage
- **[Mimir](./flux/manifests/03-services/observability/mimir/README.md)** - Long-term metrics storage
- **[Alloy](./flux/manifests/03-services/observability/alloy/README.md)** - Log and metrics collection agent
- **[Dashboard](./flux/manifests/03-services/dashboard/README.md)** - Kubernetes web dashboard

#### Security & Compliance

- **[Kyverno](./flux/manifests/03-services/kyverno/README.md)** - Policy management and enforcement
- **[Trivy](./flux/manifests/03-services/trivy/README.md)** - Security scanning and vulnerability management
- **[Chaos Mesh](./flux/manifests/03-services/chaos-mesh/README.md)** - Chaos engineering and resilience testing

#### Development Tools

- **[Generic App Chart](./helm/generic-app/README.md)** - Reusable Helm chart for application deployment
- **[Demo App](./flux/manifests/04-apps/demo-app/README.md)** - Example application using the generic chart

#### Applications

- **[n8n](./flux/manifests/04-apps/n8n/README.md)** - Workflow automation platform
- **[Bitfocus Companion](./flux/manifests/04-apps/companion/README.md)** - Control surface for Elgato Stream Deck

#### Automation & Operations

- **[Housekeeping](./flux/manifests/03-services/housekeeping/README.md)** - Automated cluster maintenance
- **[Reloader](./flux/manifests/03-services/reloader/README.md)** - Configuration reloading automation

## Target Audience

### 👤 Primary: Myself

- Personal documentation and reference
- Learning Kubernetes concepts
- Experimenting with new services

### 👥 Secondary: Homelab Enthusiasts

- Example of a complete homelab setup
- Learning resource for Kubernetes
- Reference for Flux-based deployments

## Contributing

This is a personal project, but feel free to:

- Open issues with questions or suggestions
- Submit PRs for improvements
- Use it as inspiration for your own setup

## Support

- **Documentation**: Comprehensive guides in each component directory
- **Issues**: GitLab issues for questions and discussions
- **Community**: Useful for other homelab enthusiasts learning Kubernetes

---

_Built with AI for learning Kubernetes and hosting home services robustly_
