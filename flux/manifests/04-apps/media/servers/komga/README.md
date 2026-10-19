# Komga

Self-hosted media server for comics, manga, magazines, and eBooks.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Supports CBZ, CBR, CB7, RAR, ZIP, 7Z, TAR, PDF, EPUB formats
- Web-based reader with progress tracking
- OPDS v1.2/v2.0 feed for e-reader apps
- Kobo Sync and KOReader Sync for native e-reader support
- Automatic metadata detection from ComicInfo.xml and EPUB metadata
- Collections and read lists for organizing content
- Authentik SSO integration

## Access

- **URL**: `https://komga.gateway.services.apocrathia.com`

## Configuration

Komga uses environment variables for configuration. Key settings in the helmrelease:

- `KOMGA_CONFIGDIR`: Configuration and database directory
- `TZ`: Timezone

Additional configuration can be done through the web UI after first login.

See `helmrelease.yaml` for complete deployment configuration.

### Storage

- **Config**: Longhorn volume for SQLite database and Lucene search index
- **Media**: SMB shares for comic/manga/ebook libraries

## Authentication

Uses Authentik SSO (OIDC). The Authentik app/provider stack is owned by the chart-rendered provider-opentofu Workspace (`komga-authentik`) with **chart-generated inline HCL** (the file-pair pattern, same shape as the gatus/immich/jetkvm exemplars): `authentik.managedBy: terraform` in `helmrelease.yaml` renders the OnePasswordItem + ProviderConfig + Workspace docs — `source: Inline`, no module refs, no varmap in git. The OIDC client_id rides the file lane (`authentik.oidc.clientIdFromSecret`): the ProviderConfig materializes the same `komga-secrets`/`oidc-client-id` key the app consumes as a tofu workdir file (`client_id = trimspace(file("oidc-client-id"))`). Adoption ids never enter git — the one-time W0 re-adopt gate (legacy state discard + fresh import) rides a gate-time varmap on the live Workspace, per the flip MR body.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n komga

# Application logs
kubectl logs -n komga deployment/komga -f

# Check Authentik outpost
kubectl get pods -n authentik | grep komga
```

## References

- **[Komga Documentation](https://komga.org/docs/)** - Primary documentation source
- **[GitHub Repository](https://github.com/gotson/komga)** - Source code and issues
