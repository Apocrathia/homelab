# Meshery

Service mesh management platform providing observability, configuration management, and performance testing for Kubernetes clusters and service meshes.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

Meshery is a cloud native management plane that provides lifecycle management for service meshes, cloud native applications, and infrastructure. It offers:

- **Multi-mesh support**: Manage multiple service meshes from a single interface
- **Performance testing**: Benchmark applications and infrastructure
- **Configuration management**: Visual configuration and validation
- **Observability**: Monitor service mesh performance and health
- **Cloud native patterns**: Deploy and manage cloud native design patterns

## Configuration

### Core Features

- **Service mesh adapters**: Cilium adapter enabled for cluster integration
- **Authentication**: Secured with Authentik SSO integration
- **Resource limits**: Configured for production workloads
- **External access**: Available via Gateway API routing

### Network Access

- **Internal**: `http://meshery.meshery.svc.cluster.local:9081`
- **External**: `https://meshery.gateway.services.apocrathia.com`
- **Protocol**: HTTP/HTTPS with TLS termination at gateway

### Adapters

The deployment includes:

- **Cilium**: Enabled for network policy and observability

## Security

- Authenticated access through Authentik
- Network policies via Cilium
- Pod security contexts enforced
- Role-based access control for cluster resources

## Usage

Access the Meshery dashboard to:

1. Analyze cluster topology and performance
2. Configure and validate service mesh settings
3. Deploy cloud native application patterns
4. Monitor service mesh health and metrics
5. Benchmark application performance
