# Plex Media Server

Media server for streaming content from SMB storage shares with transcoding capabilities.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Plex Media Server with transcoding capabilities
- HTTPS (and HTTP→HTTPS redirect) via a dedicated Gateway (`plex-gateway` in `cilium-system`) on the same LAN VIP as before; chart LoadBalancer disabled
- HTTPRoute for `plex.services.apocrathia.com`
- SMB mounts for media library access
- Longhorn persistent storage for configuration
- Resource optimization for transcoding workloads

## Configuration

### Storage

- **Configuration Volume**: Longhorn volume at `/config`
- **Transcoding Volume**: EmptyDir at `/transcode` for temporary files
- **Media Libraries**: SMB mounts for content access

### Media Libraries

- **TV Shows**: `/tv` → `//storage.services.apocrathia.com/Video/TV Shows`
- **Movies**: `/movies` → `//storage.services.apocrathia.com/Video/Movies`
- **Anime**: `/anime` → `//storage.services.apocrathia.com/Video/Anime`
- **Educational**: `/educational` → `//storage.services.apocrathia.com/Video/Educational`
- **Music**: `/music` → `//storage.services.apocrathia.com/Audio/Music`
- **Music Videos**: `/music-videos` → `//storage.services.apocrathia.com/Video/Music Videos`

### Access

- **Public URL**: `https://plex.services.apocrathia.com` — DNS should resolve to the Gateway LoadBalancer IP (same VIP the chart LoadBalancer used previously).
- **Cluster DNS**: `http://plex.plex.svc.cluster.local:80`

TLS is cert-manager-managed secret `plex-services-apocrathia-com-tls` in namespace `plex` (defined in `gateway.yaml`), SAN `plex.services.apocrathia.com`.

NAT: forward to **443** (and optionally **80** for redirect) on that VIP, not only legacy plain HTTP to Plex directly.

## Authentication

Authentik bookmark only (no proxy). The generic-app chart emits `authentik-blueprint-plex` from `authentik.mode: bookmark` and the `authentik.*` values in `helmrelease.yaml` (launch URL, icon, meta fields).

## Security Considerations

- **No proxy auth**: Plex is reached directly after TLS termination at the Gateway.
- **Resource Limits**: tuned for transcoding.
- **Storage**: configuration on Longhorn.

## Troubleshooting

### Common Issues

1. **Transcoding Issues**

   ```bash
   # Check pod resource usage
   kubectl -n plex top pod

   # Check transcoding volume
   kubectl -n plex exec -it deployment/plex -- df -h /transcode
   ```

2. **Media Library Access**

   ```bash
   # Check SMB mounts
   kubectl -n plex exec -it deployment/plex -- mount | grep storage

   # Test SMB connectivity
   kubectl -n plex exec -it deployment/plex -- ls -la /tv
   ```

### Health Checks

```bash
# Overall status
kubectl -n plex get pods,svc,pvc

# Plex application status
kubectl -n plex get pods -l app.kubernetes.io/name=plex

# Gateway / app Service
kubectl get gateway plex-gateway -n cilium-system
kubectl get svc plex -n plex
```

## References

- **[Plex Documentation](https://support.plex.tv/)** - Primary documentation source
- **[LinuxServer.io Plex](https://docs.linuxserver.io/images/docker-plex)** - Container documentation
- **[Plex Docker Image](https://hub.docker.com/r/linuxserver/plex)** - Container registry
