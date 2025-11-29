# Renovate CE

Mend Renovate Community Edition for automated dependency updates across GitLab repositories.

## Overview

Renovate CE automatically scans repositories for outdated dependencies and creates pull requests to update them. This deployment provides:

- **Automated Dependency Updates**: Scans and updates dependencies across all configured repositories
- **Global Configuration**: Uses `renovate.json` from the repository root for Renovate settings
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

## Configuration File

The `renovate.json` file in the repository root configures Renovate's behavior. It includes:

- **Preset Configurations**: Extends recommended presets and security scanning
- **Manager Support**: Enables managers for Kubernetes, Flux, Helm, Docker, and more
- **Update Policies**: Configures automerge, grouping, and dependency dashboard settings
- **Onboarding**: Disabled to prevent automatic config file creation

The configuration file is read directly from the repository root by Renovate CE.

## API Access

Renovate CE exposes REST APIs on port 8080 for monitoring and administration. Authentication uses Bearer tokens with the configured API secret.

## Monitoring

Health checks and logs are available through standard Kubernetes tooling. The service integrates with the cluster's monitoring stack for metrics collection.
