# Logseq

Privacy-first, open-source platform for knowledge management and collaboration with block-based note-taking, bidirectional linking, and whiteboard features.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Official Documentation](https://docs.logseq.com/)** - Primary documentation source
- **[GitHub Repository](https://github.com/logseq/logseq)** - Source code and issues
- **[Logseq Guide](https://github.com/dustinlacewell/logseq-guide)** - Community deployment guide

## Overview

This deployment includes:

- Web-based knowledge management interface
- Block-based note-taking with Markdown and Org-mode support
- Bidirectional linking and graph visualization
- Whiteboard feature for visual knowledge organization
- Browser-based file access using File System Access API

## Configuration

### Data Access

The Logseq webapp uses the browser's File System Access API to read and write graph data directly from the user's local machine. Users select their graph directory through the browser interface, and all file operations occur client-side. No server-side storage is required.

### Access

- **External URL**: `https://notes.gateway.services.apocrathia.com`
- **Internal Service**: `http://logseq.logseq.svc.cluster.local:80`
- **Container Port**: 80

## Authentication

Authentication is handled through Authentik proxy provider:

1. **Proxy Provider**: Authentik outpost proxies requests to Logseq
2. **SSO Integration**: Users authenticate through Authentik before accessing Logseq
3. **No Application Auth**: Logseq webapp has no built-in authentication

## Security Considerations

- **Proxy Authentication**: All access is gated through Authentik SSO
- **No Direct Access**: HTTPRoute is disabled; Authentik manages routing
- **Client-Side Storage**: Notes are stored locally on the user's machine via browser File System Access API

## Troubleshooting

### Common Issues

1. **Application Not Accessible**

   ```bash
   # Check pod status
   kubectl -n logseq get pods

   # View logs
   kubectl -n logseq logs -l app.kubernetes.io/name=logseq
   ```

2. **File Access**

   - The webapp requires browser support for File System Access API
   - Users must grant browser permissions to access their graph directory
   - Graph directory must contain Logseq structure: `pages/`, `journals/`, `whiteboards/`, `assets/`, and `logseq/config.edn`

3. **Authentication Issues**

   ```bash
   # Check Authentik outpost
   kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost

   # Check Authentik proxy provider
   kubectl get authentikprovider proxyprovider logseq-proxy-provider -n logseq
   ```

### Health Checks

```bash
# Overall status
kubectl -n logseq get pods,svc

# Check service endpoints
kubectl -n logseq get endpoints logseq

# Check Authentik application
kubectl get authentikapplication -n logseq
```
