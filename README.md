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

- **Control Plane**: 3 nodes for high availability
- **Worker Nodes**: 1 worker node (expandable)
- **Storage**: Longhorn distributed storage
- **Networking**: Cilium with Gateway API

## Key Technologies

- **Kubernetes Distribution**: Talos Linux (vanilla k8s)
- **GitOps**: Flux CD for continuous deployment
- **Secrets Management**: 1Password Connect
- **CI/CD**: GitLab Agent + Runner
- **Storage**: Longhorn (distributed block storage)
- **Networking**: Cilium CNI with Gateway API
- **Authentication**: Authentik SSO
- **Monitoring**: Prometheus + Grafana stack
- **Security**: Kyverno policies + Trivy scanning

### Application Deployment

- **Simple Helm Usage**: Direct `helm install` commands for straightforward deployments
- **Generic App Chart**: Reusable template at `helm/generic-app/` for consistent application patterns
- **Demo-First**: Use the demo app as a reference for new application deployments
- **Values-Driven**: Simple YAML values files instead of complex manifests

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

This repository follows a layered documentation structure. Start here and drill down based on what you need:

### 🏗️ Getting Started

- **[Cluster Bootstrap](./talos/README.md)** - Set up your first cluster
- **[Flux Setup](./flux/README.md)** - GitOps deployment configuration

### 🏢 Layer Navigation

- **[Bootstrap Layer](./flux/manifests/01-bootstrap/README.md)** - Core components (Flux, CRDs, Helm repos)
- **[Infrastructure Layer](./flux/manifests/02-infrastructure/README.md)** - Networking, storage, monitoring
- **[Services Layer](./flux/manifests/03-services/README.md)** - Platform services and middleware
- **[Apps Layer](./flux/manifests/04-apps/README.md)** - User-facing applications

### 📋 Component Documentation

Each major component has detailed documentation:

- **Authentik** - Identity and access management
- **Longhorn** - Distributed storage
- **Cilium** - Networking and security
- **Kube Prometheus Stack** - Monitoring and observability
- **Generic App Chart** - Reusable Helm chart for application deployment
- **Demo App** - Example application using the generic chart

## Current Status

🟢 **Live Cluster** - Actively running and managed by Flux

The cluster is production-ready for home use and currently hosts:

- Authentication and authorization services
- Monitoring and observability stack
- Storage and backup systems
- Development and testing applications

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

## Getting Started

### For New Users

1. **Understand the Architecture** - Read through the layer documentation
2. **Check Prerequisites** - Ensure you have a Proxmox environment ready
3. **Follow the Bootstrap Guide** - Start with [Talos setup](./talos/README.md)
4. **Explore Components** - Navigate through the documentation layers

### For Learning

- Each component README explains **why** decisions were made
- Look for troubleshooting sections in component docs
- Check the demo app and generic Helm chart for deployment patterns
- Use simple `helm install` commands for application deployments

### For Similar Setups

- Use this as a reference architecture
- Adapt components to your own needs
- Follow the established patterns and conventions

## Support

- **Documentation**: Comprehensive guides in each component directory
- **Issues**: GitHub issues for questions and discussions
- **Community**: Useful for other homelab enthusiasts learning Kubernetes

---

_Built with AI for learning Kubernetes and hosting home services robustly_
