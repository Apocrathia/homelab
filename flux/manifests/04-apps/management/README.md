# Management Applications

This directory contains management and administrative applications for the homelab infrastructure.

> **Navigation**: [← Back to Apps README](../README.md)

## Applications

### [ChangeDetection.io](./changedetection-io/README.md)

Website change detection and monitoring service with notification support and Browserless Chrome integration.

### [Companion](./companion/README.md)

Stream Deck control software for broadcast and live production environments.

### [FluentBit](./fluentbit/README.md)

Log collection and forwarding service configured for syslog ingestion to Loki.

### [Grocy](./grocy/README.md)

Web-based groceries and household management solution for inventory tracking and meal planning.

### [JetKVM](./jetkvm/README.md)

Self-hosted JetKVM Cloud API and Dashboard for KVM-over-IP device management.

### [Kiwix](./kiwix/README.md)

Offline Wikipedia and content library server for serving ZIM files with automated updates.

### [Kuber](./kuber/README.md)

iOS Kubernetes dashboard token management for mobile cluster access.

### [Logseq](./logseq/README.md)

Privacy-first knowledge management platform with block-based note-taking and bidirectional linking.

### [Mealie](./mealie/README.md)

Self-hosted recipe manager and meal planning application with Authentik SSO integration.

### [n8n](./n8n/README.md)

Workflow automation platform for connecting different services and APIs.

### [SearXNG](./searxng/README.md)

Privacy-respecting metasearch engine that aggregates results from multiple search providers without tracking users.

### [Transmission](./transmission/README.md)

Torrent client with integrated VPN routing via Gluetun for secure downloads.

### [UnPoller](./unpoller/README.md)

UniFi network monitoring and metrics collection system that exports data to Prometheus and Loki with Grafana dashboards.

### [Uptime Kuma](./uptime-kuma/README.md)

Self-hosted monitoring tool for tracking service uptime and performance across multiple protocols.

## Overview

Management applications provide tools for:

- **Device Control**: Stream Deck integration and automation
- **Mobile Access**: Secure Kubernetes cluster management from iOS devices
- **Workflow Automation**: API integrations and data processing pipelines
- **Search**: Privacy-respecting metasearch engine aggregation
- **Household Management**: Recipe management, meal planning, and inventory tracking
- **Network Monitoring**: UniFi infrastructure metrics collection and visualization
- **Website Monitoring**: Change detection, uptime tracking, and service health
- **Log Management**: Centralized log collection and forwarding
- **Knowledge Management**: Note-taking and personal wiki systems
- **Infrastructure Control**: KVM-over-IP device management and offline content serving
- **Downloads**: Secure torrent client with VPN integration

All applications are deployed via Flux GitOps and integrate with the homelab's authentication and monitoring infrastructure.
