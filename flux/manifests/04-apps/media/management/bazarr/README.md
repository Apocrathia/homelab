# Bazarr

Subtitle management companion for Sonarr and Radarr with automated subtitle downloads and AI-powered transcription via Whisper.

> **Navigation**: [← Back to Media README](../../README.md)

## Documentation

- **[Bazarr Documentation](https://wiki.bazarr.media/)** - Primary documentation source
- **[Whisper Provider Setup](https://wiki.bazarr.media/Additional-Configuration/Whisper-Provider/)** - SubGen/Whisper configuration guide
- **[LinuxServer.io Bazarr](https://docs.linuxserver.io/images/docker-bazarr)** - Container documentation
- **[Bazarr GitHub](https://github.com/morpheus65535/bazarr)** - Source code and issues

## Overview

This deployment includes:

- Bazarr subtitle management with automated downloads
- SubGen (Whisper ASR webservice) sidecar for AI-powered subtitle generation
- LinuxServer.io container with standard configuration pattern
- Authentik SSO integration for secure access
- Read-only SMB mounts for media library access
- Longhorn persistent storage for configuration and Whisper models

## Configuration

### Security Configuration

The deployment follows the LinuxServer.io standard pattern:

- Starts as root to initialize user/group mappings
- Switches to PUID/PGID (1000:1000) after initialization
- Privilege escalation enabled for s6-overlay init system
- Required capabilities: SETUID, SETGID, CHOWN, DAC_OVERRIDE
- Writable root filesystem for LinuxServer.io container compatibility

### Storage

- **Configuration Volume**: 10GB Longhorn persistent volume for application configuration
- **Models Volume**: 5GB Longhorn persistent volume for Whisper model storage
- **Anime Volume**: SMB mount for anime library access (read-only)
- **TV Volume**: SMB mount for TV shows library access (read-only)
- **Movies Volume**: SMB mount for movies library access (read-only)

### Access

- **External URL**: `https://bazarr.gateway.services.apocrathia.com`
- **Internal Service**: `http://bazarr.bazarr.svc.cluster.local:6767`
- **SubGen Service**: `http://localhost:9000` (sidecar, accessible from Bazarr container)

## SubGen (Whisper Provider)

SubGen provides AI-powered subtitle transcription using OpenAI Whisper. It runs as a sidecar container alongside Bazarr.

### Configuration

SubGen is pre-configured with:

- **Model**: `base` (balanced accuracy and performance)
- **Device**: CPU (for GPU support, change `TRANSCRIBE_DEVICE` to `cuda` and use GPU image)
- **Concurrent Transcriptions**: 2
- **Port**: 9000 (internal to pod)
- **Model Storage**: Persistent volume for downloaded Whisper models

### Bazarr Whisper Provider Setup

Configure Bazarr to use SubGen:

1. Navigate to **Settings** → **Providers** → **Whisper**
2. Set **Endpoint** to: `http://localhost:9000`
   - Must start with `http://` (not `https://`)
   - Use `localhost` since SubGen runs as a sidecar in the same pod
3. Adjust **Timeout** if needed (default should work for most content)
4. Enable **Deep analyze media file to get audio tracks language** for best results
5. Set **Minimum score** lower if you want auto-download:
   - Episodes: Lower to ~67% (241/360) or below
   - Movies: Lower to ~51% (61/120) or below
   - Whisper-generated subtitles have fixed scores, so auto-download requires lower thresholds

### Model Selection

Available models (configured via `WHISPER_MODEL`):

- `tiny` - Fastest, least accurate
- `base` - Balanced (default)
- `small` - Better accuracy
- `medium` - High accuracy
- `large-v3` - Best accuracy (slowest)

Larger models require more CPU/memory and take longer to process.

### Language Support

- **Transcription**: Supports many languages
- **Translation**: Only supports translation to English (not other languages)
- **Language Detection**: Uses first 30 seconds of audio if language unknown
- **Best Results**: Ensure media files have language metadata and enable deep analysis

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **SSO Integration**: Complete authentication through Authentik proxy
- **Read-only Access**: Media libraries mounted as read-only for security
- **LinuxServer.io Pattern**: Standard security context for container compatibility
- **Network Policies**: Cilium NetworkPolicy for traffic control

## Troubleshooting

### Common Issues

1. **Media Library Access**

   ```bash
   # Check anime library access
   kubectl -n bazarr exec -it deployment/bazarr -c bazarr -- ls -la /anime

   # Check TV library access
   kubectl -n bazarr exec -it deployment/bazarr -c bazarr -- ls -la /tv

   # Check movies library access
   kubectl -n bazarr exec -it deployment/bazarr -c bazarr -- ls -la /movies
   ```

2. **Sonarr/Radarr Integration**

   ```bash
   # Check Bazarr logs for integration issues
   kubectl -n bazarr logs deployment/bazarr -c bazarr --tail=50
   ```

3. **SubGen/Whisper Issues**

   ```bash
   # Check SubGen logs
   kubectl -n bazarr logs deployment/bazarr -c subgen --tail=50

   # Verify SubGen is accessible from Bazarr container
   kubectl -n bazarr exec -it deployment/bazarr -c bazarr -- curl http://localhost:9000/health

   # Check model storage
   kubectl -n bazarr exec -it deployment/bazarr -c subgen -- ls -la /subgen/models
   ```

4. **Language Detection**
   - Ensure "Deep analyze media file to get audio tracks language" is enabled
   - Whisper only uses first 30 seconds for language detection if unknown
   - Best results when media files have language metadata

### Health Checks

```bash
# Overall status
kubectl -n bazarr get pods,svc,pvc

# Bazarr application status
kubectl -n bazarr get pods -l app.kubernetes.io/name=bazarr

# Check both containers in pod
kubectl -n bazarr get pods -o jsonpath='{.items[*].spec.containers[*].name}'

# Check Authentik outpost
kubectl -n authentik get pods -l app.kubernetes.io/name=authentik-outpost
```
