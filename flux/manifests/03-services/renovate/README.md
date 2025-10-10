# Renovate CE

Mend Renovate Community Edition for automated dependency updates across GitLab repositories.

## Overview

Renovate CE automatically scans repositories for outdated dependencies and creates pull requests to update them. This deployment provides:

- **Automated Dependency Updates**: Scans and updates dependencies across all configured repositories
- **Custom Configuration**: Uses repository-specific `renovate.json` configuration
- **GitLab Integration**: Native GitLab bot integration with webhook support
- **PostgreSQL Backend**: Persistent storage for job state and configuration
- **REST API**: Admin and system APIs for monitoring and management

## Configuration

The deployment uses a 1Password item called `renovate-secrets` containing:

- License key for Mend Renovate Community Edition
- GitLab Personal Access Token for repository access
- GitHub token for public repository changelog access
- Webhook secret for incoming GitLab events
- Admin API secret for authentication
- PostgreSQL database password

## Custom Managers

The `renovate.json` configuration includes custom managers for:

- **Talos Linux**: Automated Talos version updates
- **Flux Dependencies**: Flux and Kubernetes API version tracking
- **Generic App Charts**: Custom application chart version management
- **Docker Images**: Container image version updates

## API Access

Renovate CE exposes REST APIs on port 8080 for monitoring and administration. Authentication uses Bearer tokens with the configured API secret.

## Monitoring

Health checks and logs are available through standard Kubernetes tooling. The service integrates with the cluster's monitoring stack for metrics collection.
