# Recyclarr

Recyclarr automatically synchronizes recommended settings from the TRaSH Guides to your Sonarr and Radarr instances.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Recyclarr Documentation](https://recyclarr.dev/wiki/)** - Official documentation
- **[TRaSH Guides](https://trash-guides.info/)** - Community configuration recommendations
- **[GitHub Repository](https://github.com/recyclarr/recyclarr)** - Source code and issues

## Overview

Recyclarr is a command-line utility that runs periodically to keep your media management services configured with optimal settings from the community-maintained TRaSH Guides.

## Configuration

Recyclarr configuration is managed via GitOps using the same pattern as authentik blueprints:

- **ConfigMap**: `recyclarr.yml` is generated from source files via Kustomize with `k8s-sidecar-target-directory` annotation
- **k8s-sidecar**: Continuously syncs ConfigMaps with `recyclarr_config: "true"` label directly to `/config/recyclarr.yml`
- **Environment variables**: Sensitive data (API keys) sourced from 1Password

### Quality Profiles Configured

**Sonarr (TV Series):**

- WEB-1080p: Standard 1080p web releases
- WEB-2160p: 4K web releases
- Anime: Anime-specific quality profile

**Radarr (Movies):**

- HD Bluray + WEB: HD Bluray and web releases
- UHD Bluray + WEB: 4K Bluray and web releases
- Remux + WEB 1080p: Remux and web 1080p releases
- Remux + WEB 2160p: Remux and web 4K releases
- Anime: Anime-specific quality profile

### Key Features

- **Automated Synchronization**: Runs daily via cron to sync TRaSH Guides settings
- **Multiple Services**: Supports both Sonarr and Radarr instances
- **Custom Formats**: Synchronizes custom format definitions and scores
- **Quality Profiles**: Updates quality profiles with recommended settings
- **Quality Definitions**: Applies recommended file size limits
- **Template Includes**: Uses pre-built TRaSH Guides templates for consistency

## Accessing Configuration

To modify the Recyclarr configuration:

1. Access the pod: `kubectl exec -it deployment/recyclarr -n recyclarr -- /bin/sh`
2. Edit the configuration: `vi /config/recyclarr.yml`
3. Test the configuration: `recyclarr sync --preview`

## Manual Execution

You can manually trigger Recyclarr synchronization:

```bash
kubectl exec -it deployment/recyclarr -n recyclarr -- recyclarr sync
```

## Troubleshooting

```bash
# Pod status
kubectl get pods -n recyclarr

# Application logs
kubectl logs -n recyclarr deployment/recyclarr -f

# Test configuration
kubectl exec -it deployment/recyclarr -n recyclarr -- recyclarr sync --preview
```
