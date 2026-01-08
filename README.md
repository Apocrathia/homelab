# Homelab Kubernetes Cluster

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Apocrathia/homelab) [![pipeline status](https://gitlab.com/Apocrathia/homelab/badges/main/pipeline.svg)](https://gitlab.com/Apocrathia/homelab/-/commits/main)

This repository contains the configuration for my home Kubernetes cluster managed through GitOps.

> **Navigation**: [Next: Cluster Bootstrap →](./talos/README.md)

## Overview

A production-like Kubernetes cluster built on Talos Linux, managed entirely through Flux GitOps. The cluster provides a robust platform for hosting home services while providing a platform for learning Kubernetes concepts through hands-on experimentation.

## Why This Repository?

My background is in security (see my [resume](https://gitlab.com/apocrathia/resume)), and I run my homelab with the same rigor I apply professionally: infrastructure as code, GitOps workflows, comprehensive monitoring, and defense-in-depth security practices.

This repository is public because I believe in **transparent engineering**. By exposing my infrastructure decisions to scrutiny, I demonstrate practical security architecture, invite feedback from the community, and maintain accountability to best practices. If you're evaluating my work, you're seeing real-world implementation of enterprise security patterns at scale, and I actively encourage you to call out anything you think could be improved.

Yes, there are risks to publishing infrastructure configurations. Much of that has been mitigated through proper secrets management and continuous security scanning. However, the benefits of collaboration, learning, and demonstrating competency far outweigh the theoretical attack surface. It's just a homelab.

## Architecture

#### Level 1: System Context

```mermaid
C4Context
    title System Context - Homelab

    Enterprise_Boundary(homenet, "Home Network") {
        Person(user, "User")

        System(homelab, "Homelab")
        System(internal, "Internal Services")
    }

    System_Ext(external, "External Services")

    Rel_Right(user, homelab, "Accesses apps")
    Rel_Down(homelab, internal, "Stuff", "and things")
    Rel_Down(homelab, external, "Stuff", "and things")
```

#### Level 2: Container

```mermaid
C4Container
    title Container - Virtualization Infrastructure

    System_Ext(gitlab, "GitLab")

    Enterprise_Boundary(homenet, "Home Network") {
        Person(admin, "Administrator")
        Person(user, "User")

        System_Boundary(proxmox, "Proxmox PVE Cluster") {
            Container(pve1, "node-01", "Proxmox Node", "Physical server")
            Container(pve2, "node-02", "Proxmox Node", "Physical server")
            Container(pve3, "node-03", "Proxmox Node", "Physical server")
            Container(pve4, "node-04", "Proxmox Node", "Physical server")

            System_Boundary(talos, "Talos VM Cluster") {
            Container(k8s1, "talos-01", "Talos VM", "Control plane / worker")
            Container(k8s2, "talos-02", "Talos VM", "Control plane / worker")
            Container(k8s3, "talos-03", "Talos VM", "Control plane / worker")
            Container(k8s4, "talos-04", "Talos VM", "Control plane / worker")

            Component(K8sCluster, "K8s Cluster", "Kubernetes Cluster")
            }
        }
    }

    Rel_Down(pve1, k8s1, "Hosts")
    Rel_Down(pve2, k8s2, "Hosts")
    Rel_Down(pve3, k8s3, "Hosts")
    Rel_Down(pve4, k8s4, "Hosts")

    BiRel(pve1, pve2, "Cluster")
    BiRel(pve2, pve3, "Cluster")
    BiRel(pve3, pve4, "Cluster")

    BiRel(k8s1, k8s2, "etcd")
    BiRel(k8s2, k8s3, "etcd")
    BiRel(k8s3, k8s4, "etcd")

    BiRel(k8s1, K8sCluster, "")
    BiRel(k8s2, K8sCluster, "")
    BiRel(k8s3, K8sCluster, "")
    BiRel(k8s4, K8sCluster, "")

    Rel_Up(admin, gitlab, "Pushes manifests", "Git")
    Rel_Down(gitlab, K8sCluster, "Pulls manifests", "Flux")
    Rel_Down(user, K8sCluster, "Accesses apps", "HTTPS")

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")

    UpdateRelStyle(pve1, pve2, $offsetY="10")
    UpdateRelStyle(pve2, pve3, $offsetY="-10")
    UpdateRelStyle(k8s1, k8s2, $offsetY="10")
    UpdateRelStyle(k8s2, k8s3, $offsetY="-10")
```

#### Level 3: Component

```mermaid
C4Component
    title Component - Kubernetes Cluster Configuration

    System_Ext(gitlab, "GitLab")
    System_Ext(onepassword, "1Password")

    System_Boundary(K8sCluster, "K8s Cluster") {
        Container_Boundary(bootstrap, "Bootstrap Layer") {
            Component(flux, "Flux CD", "GitOps", "Continuous deployment")
            Component(eso, "External Secrets", "Secret sync", "1Password integration")
        }

        Container_Boundary(infra, "Infrastructure Layer") {
            Component(cilium, "Cilium", "CNI", "Networking + Gateway API")
            Component(longhorn, "Longhorn", "Storage", "Distributed block storage")
            Component(prometheus, "Prometheus", "Metrics", "Time-series DB")
        }

        Container_Boundary(platform, "Platform Services") {
            Component(authentik, "Authentik", "SSO", "OIDC/SAML provider")
            Component(kyverno, "Kyverno", "Policy", "Admission controller")
            Component(trivy, "Trivy", "Security", "Vulnerability scanner")
            Component(cnpg, "CloudNativePG", "Database", "Postgres operator")
            Component(certmgr, "Cert Manager", "TLS", "Certificate automation")
        }

        Container_Boundary(apps, "Application Layer") {
            Component(userApps, "Applications", "Workloads", "50+ services")
        }
    }

    Rel_Up(flux, gitlab, "Pulls manifests", "HTTPS")
    Rel_Up(eso, onepassword, "Fetches secrets", "API")
    Rel_Up(certmgr, cilium, "Issues certs", "Gateway TLS")
    Rel_Down(cilium, userApps, "Routes traffic", "Gateway API")
    Rel_Down(longhorn, userApps, "Provides storage", "PVC")
    Rel_Down(authentik, userApps, "Protects", "OIDC")
    Rel_Down(kyverno, userApps, "Enforces policy", "Admission")

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
```

#### Level 4: Code (GitOps Structure)

Go look at the [flux/manifests](./flux/manifests) directory for the GitOps structure.

### Core Infrastructure

- **Kubernetes Distribution**: Talos Linux (vanilla k8s)
- **GitOps**: Flux CD for continuous deployment
- **Secrets Management**: 1Password Connect
- **Storage**: Longhorn distributed storage with SMB integration
- **Networking**: Cilium CNI with Gateway API
- **Authentication**: Authentik SSO with automated outpost deployment

### Cluster Topology

- **Control Plane**: 4 nodes for high availability (Quorum + 1 Failure)
- **Worker Nodes**: Same 4 nodes as control plane
- **Virtualization**: Proxmox PVE
- **Storage**: Longhorn distributed block storage
- **Networking**: Cilium with Gateway API

## Key Technologies

- **GitOps**: Flux CD for continuous deployment
- **Secrets Management**: 1Password Connect
- **CI/CD**: GitLab Agent + Runner
- **Storage**: Longhorn + SMB integration
- **Networking**: Cilium CNI with Gateway API
- **Authentication**: Authentik SSO
- **Monitoring**: Prometheus + Grafana LGTM (Loki, Grafana, Tempo, Mimir)
- **Security**: Kyverno policies + Trivy scanning
- **Database**: CloudNativePG operator
- **Automation**: Renovate + n8n + kyverno

## Application Deployment

Applications are deployed using the `generic-app` Helm chart with built-in patterns for:

- **Authentik SSO Integration**: Automatic outpost deployment
- **Gateway API Routing**: External access management
- **Storage Integration**: Longhorn or SMB network storage
- **Secrets Management**: 1Password Connect integration
- **Security**: RBAC, network policies, and security contexts

## Documentation Navigation

### 🏗️ Getting Started

- **[Cluster Bootstrap](./talos/README.md)** - Complete Talos Linux cluster setup
- **[1Password Connect Setup](./flux/manifests/01-bootstrap/1password/README.md)** - 1Password Connect setup
- **[Flux Setup](./flux/README.md)** - GitOps deployment configuration
- **[Generic App Chart](./helm/generic-app/README.md)** - Reusable Helm chart

### 🏢 Layer Navigation

- **[Bootstrap Layer](./flux/manifests/01-bootstrap/README.md)** - Core components
- **[Infrastructure Layer](./flux/manifests/02-infrastructure/README.md)** - Networking, storage, monitoring
- **[Services Layer](./flux/manifests/03-services/README.md)** - Platform services and security
- **[Apps Layer](./flux/manifests/04-apps/README.md)** - User-facing applications

## Security

- **Policy Enforcement**: Kyverno policies for namespace isolation and resource cleanup
- **Vulnerability Scanning**: Trivy operator with continuous security scanning
- **Secret Management**: 1Password Connect with External Secrets Operator
- **Network Security**: Cilium network policies and Gateway API with TLS termination
- **Pod Security**: Talos Linux with minimal attack surface and security contexts

## External Resources

- [Talos Linux Documentation](https://talos.dev/)
- [Flux Documentation](https://fluxcd.io/)
- [Cilium Documentation](https://docs.cilium.io/)
- [Longhorn Documentation](https://longhorn.io/docs/)
- [Authentik Documentation](https://docs.goauthentik.io/)
