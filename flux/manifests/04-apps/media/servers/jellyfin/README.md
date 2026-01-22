# Jellyfin

> **Navigation**: [← Back to Media Servers](../README.md)

## Overview

[Jellyfin](https://jellyfin.org/) is a free and open-source media server for streaming movies, TV shows, music, and more. It's a fork of Emby with no premium features locked behind paywalls.

## Access

- **URL**: <https://jellyfin.gateway.services.apocrathia.com>

## Configuration

Jellyfin is configured entirely through its web UI after initial deployment. On first access, you'll be guided through the setup wizard to:

1. Create an admin account
2. Configure media libraries
3. Set up remote access preferences

## SSO Authentication

Jellyfin uses the [SSO-Auth plugin](https://github.com/9p4/jellyfin-plugin-sso) for Authentik OIDC integration. The Authentik OIDC provider is created automatically via blueprint, but the plugin requires manual setup.

### Plugin Installation

1. Go to **Admin → Plugins → Repositories** (or click "Manage Repositories")
2. Add repository: `https://raw.githubusercontent.com/9p4/jellyfin-plugin-sso/manifest-release/manifest.json`
3. Go to **Catalog → Authentication** and install **SSO-Auth**
4. Restart Jellyfin

### OIDC Configuration

1. Go to **Admin → Plugins → SSO-Auth → Settings**
2. In the "Name of OpenID Provider" field, enter: `Authentik`
3. Fill in:
   - **OpenID Endpoint**: `https://auth.gateway.services.apocrathia.com/application/o/jellyfin/`
   - **OpenID Client ID**: Copy from Authentik → Applications → Providers → `jellyfin-oidc-provider`
   - **OpenID Client Secret**: Same location in Authentik
   - **Scheme Override**: `https` (required when behind a reverse proxy)
   - **Enable Authorization by Plugin**: OFF (preserves existing Jellyfin permissions)
4. Enable the provider and save
5. Restart Jellyfin

### Login Button

The SSO plugin doesn't add a login button automatically. Add it via **Admin → General → Branding**:

**Login disclaimer** field:

```html
<form
  action="https://jellyfin.gateway.services.apocrathia.com/sso/OID/start/Authentik"
>
  <button class="raised block emby-button button-submit">
    Sign in with Authentik
  </button>
</form>
```

**Custom CSS** field:

```css
.disclaimerContainer {
  display: block;
}
```

The provider name in the URL must match exactly what was configured in the plugin (case-sensitive).

### Account Linking

SSO login creates a new Jellyfin user. To link SSO to an existing account (e.g., admin):

1. Log in with your local Jellyfin credentials
2. Visit `/sso/linking` to link your Authentik identity to the existing account
3. Future SSO logins will use the linked account with its existing permissions

## Media Libraries

Media is mounted read-only from the NAS:

| Mount Point     | Content      |
| --------------- | ------------ |
| `/tv`           | TV Shows     |
| `/movies`       | Movies       |
| `/anime`        | Anime        |
| `/educational`  | Educational  |
| `/music`        | Music        |
| `/music-videos` | Music Videos |

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n jellyfin

# View logs
kubectl logs -n jellyfin deployment/jellyfin

# Describe deployment
kubectl describe deployment -n jellyfin jellyfin
```

## References

- **[Jellyfin Documentation](https://jellyfin.org/docs/)** - Official documentation
- **[Jellyfin GitHub](https://github.com/jellyfin/jellyfin)** - Source code and issues
