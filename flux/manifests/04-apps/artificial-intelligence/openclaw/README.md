# OpenClaw

Personal AI assistant that runs on your own devices, providing AI agent capabilities through various messaging platforms like WhatsApp, Telegram, and Discord.

> **Navigation**: [<- Back to AI Applications README](../README.md)

## Overview

This deployment includes:

- OpenClaw Gateway server for AI agent control plane
- WebSocket + HTTP endpoints on port 18789
- Control UI and WebChat interfaces
- Authentik proxy for secure access

## Configuration

### 1Password Secrets

Create a 1Password item:

#### openclaw-secrets (`vaults/Secrets/items/openclaw-secrets`)

- `gateway-token`: Authentication token for Gateway access
- `litellm-api-key`: API key for LiteLLM proxy

Optional secrets for channel integrations:

- `discord-bot-token`: Discord bot token (if using Discord channel)
- `telegram-bot-token`: Telegram bot token (if using Telegram channel)
- `slack-bot-token`: Slack bot token (if using Slack channel)

### Storage

- **State Volume**: Longhorn volume for `~/.openclaw` (config, credentials, sessions, workspace)

### Access

- **External URL**: `https://openclaw.gateway.services.apocrathia.com`
- **Internal Service**: `http://openclaw.openclaw.svc.cluster.local:80`
- **Gateway Port**: 18789 (WebSocket + HTTP)

## Configuration Method

OpenClaw can be configured through:

- **Environment Variables**: Gateway settings, directory paths, channel tokens
- **Config File**: `~/.openclaw/openclaw.json` for detailed configuration
- **CLI**: `openclaw onboard` wizard for initial setup (run inside pod)
- **Web UI**: Control UI for runtime configuration

## Post-Deployment Setup

After initial deployment, complete these steps to access the Control UI:

### 1. Get the Gateway Token

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.gateway-token}' | base64 -d
```

### 2. Access the Control UI

Navigate to `https://openclaw.gateway.services.apocrathia.com` and authenticate via Authentik.

The Control UI will show "gateway token missing" - paste the token from step 1 into the settings (gear icon) or use a tokenized URL:

```
https://openclaw.gateway.services.apocrathia.com/?token=YOUR_TOKEN
```

Device pairing is disabled via config (`controlUi.dangerouslyDisableDeviceAuth: true`).

## Security Considerations

- **Gateway Token**: Required for WebSocket access, stored in 1Password
- **Authentik Proxy**: Network-layer authentication before reaching Gateway
- **Non-root User**: Runs as node user (uid 1000)
- **Device Auth Disabled**: Control UI device pairing disabled for ease of use behind Authentik
- **DM Pairing**: Default DM policy requires pairing codes for unknown senders

## Troubleshooting

### Common Issues

1. **Gateway Connection Issues**

   ```bash
   # Check pod logs
   kubectl logs -n openclaw -l app=openclaw

   # Verify Gateway is listening
   kubectl port-forward -n openclaw svc/openclaw 18789:80
   curl http://localhost:18789
   ```

2. **Storage Permission Issues**

   ```bash
   # Check volume mounts
   kubectl exec -n openclaw -it deploy/openclaw -- ls -la /home/node/.openclaw
   ```

3. **Channel Integration Issues**

   ```bash
   # Check channel status via CLI
   kubectl exec -n openclaw -it deploy/openclaw -- openclaw channels status
   ```

### Health Checks

```bash
# Overall status
kubectl get pods,svc,pvc -n openclaw

# Pod status
kubectl get pods -n openclaw -l app=openclaw

# Gateway logs
kubectl logs -n openclaw -l app=openclaw --tail=100
```

## References

- **[OpenClaw Documentation](https://docs.openclaw.ai)** - Primary documentation source
- **[OpenClaw GitHub Repository](https://github.com/openclaw/openclaw)** - Source code and issues
- **[OpenClaw DeepWiki](https://deepwiki.com/openclaw/openclaw)** - In-depth repository documentation
