# Applications

This directory contains user-facing applications and workloads deployed in the cluster.

## Structure

- Each application should have its own directory
- Use Kustomize bases and overlays where appropriate
- Include Helm releases and values
- Define application-specific configurations

## Guidelines

- Group related applications together
- Define resource requirements
- Set up appropriate monitoring
- Configure backups where needed
- Use 1Password for application secrets
- Document dependencies and configurations
