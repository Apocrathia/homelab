# Storyteller

Self-hosted platform that synchronizes ebooks and audiobooks into synced read-along books, so you can read, listen, or both at once.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Read-along alignment between ebook (epub) and audiobook (m4b) versions of the same title, with a built-in web reader for synced reading and listening
- Whisper.cpp transcription during alignment (bursty CPU work) with SQLite storage under `/data`
- Authentik OIDC integration

## Access

- **URL**: `https://storyteller.gateway.services.apocrathia.com`

## Configuration

Storyteller configures through the web UI; the helmrelease sets the required environment (`STORYTELLER_SECRET_KEY`, `AUTH_URL`) plus `TZ`/`PUID`/`PGID`.

### Storage

- **Data**: Longhorn volume for the SQLite database, uploaded books, and alignment output

### Library mounts

Read-only mounts for import-from-server and watch folders: Storyteller writes
metadata edits back into imported files, so the CWA/chaptarr trees stay safe;
metadata edits made in the Storyteller UI fail instead.

| Mount                 | Source                                                          |
| --------------------- | --------------------------------------------------------------- |
| `/library/ebooks`     | `//storage.services.apocrathia.com/Library` (subDir `Books`)    |
| `/library/audiobooks` | `//storage.services.apocrathia.com/Audio` (subDir `Audiobooks`) |

## Authentication

Uses Authentik OIDC for web login. Password login stays enabled for the mobile apps and OPDS feed.

## Required 1Password item

`vaults/Secrets/items/storyteller-secrets` with fields:

| Field                    | Used for                                                  |
| ------------------------ | --------------------------------------------------------- |
| `storyteller-secret-key` | `STORYTELLER_SECRET_KEY` (random 32+ chars)               |
| `oidc-client-id`         | Authentik OIDC client id (random minted string)           |
| `oidc-client-secret`     | Authentik OIDC client secret (operator fills post-deploy) |

The pod stays pending until the item exists (OnePasswordItem sync).

## Initial Setup

1. Create the admin account on first visit; the web UI walks you through it
2. Upload the first book pair to align: the Dungeon Crawler Carl 1 epub + m4b
3. Wire OIDC after Authentik creates the provider:
   1. Copy the client secret Authentik minted into the `oidc-client-secret` field (Authentik mints it server-side)
   2. In the web UI: **Settings -> Authentication Providers** -> add the BUILT-IN Authentik provider with the same client id/secret and issuer `https://auth.gateway.services.apocrathia.com`
   3. Link your existing account to the provider, or enable registration

## Troubleshooting

```bash
# Pod status
kubectl get pods -n storyteller

# Application logs
kubectl logs -n storyteller deployment/storyteller -f

# Authentik provider workspace
kubectl get workspace -A | grep storyteller
```

## References

- **[Storyteller Documentation](https://storyteller-platform.dev/docs/welcome)** - Primary documentation source
- **[GitLab Repository](https://gitlab.com/storyteller-platform/storyteller)** - Source code and issues
