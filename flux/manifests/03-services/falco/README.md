# Falco Runtime Security

Falco provides comprehensive runtime security monitoring for Kubernetes clusters through kernel-level event analysis and behavioral detection.

## Architecture

This unified deployment includes all Falco ecosystem components:

- **Falco Core**: Main runtime security engine for system call monitoring and rule execution
- **Falcosidekick**: Event forwarding hub for notifications and external integrations
- **K8s Metacollector**: Kubernetes metadata enrichment service
- **Falco Talon**: Automated threat response and remediation engine

## Configuration

The deployment uses the modern eBPF driver for efficient kernel-level monitoring with:

- Container engine metadata collection (Docker, containerd, CRI)
- Kubernetes audit log processing
- Event forwarding to Loki for log aggregation
- Automated response actions via Talon
- Prometheus metrics exposure

## Authentication

The Falco dashboard is behind an Authentik proxy outpost, and authentication is handled by Authentik.

## Monitoring

A Grafana dashboard is automatically deployed for visualizing Falco events and metrics.
