# Nitter

Alternative Twitter/X front-end focused on privacy: no JavaScript, no ads, all
requests proxied through the backend.

> **Navigation**: [← Back to Social README](../README.md)

## Overview

This deployment includes:

- Nitter web UI behind Authentik proxy authentication
- RSS feeds and the `/pic/` media proxy exempted from auth (external readers work)
- Ephemeral Valkey cache (no persistence — it is a cache, not a datastore)
- Real X account sessions from 1Password (see below)

## Access

- **URL**: `https://nitter.gateway.services.apocrathia.com`

## How it works

X killed guest accounts in 2024, so nitter authenticates to X's unofficial API
with real account cookies. Sessions are loaded from `/src/sessions.jsonl`,
mounted from the `nitter-secrets` 1Password item. The pod stays **pending**
until that item exists.

Config lives in `nitter.conf` (ConfigMap) with one exception: `hmacKey` is a
`__NITTER_HMAC_KEY__` placeholder rendered into `/tmp/nitter.conf` at boot from
the same secret — nitter reads config only from a file, and the key should not
live in git.

## Required 1Password item

Create `vaults/Secrets/items/nitter-secrets` with two fields:

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| `hmac-key`       | `openssl rand -hex 32` output                  |
| `sessions-jsonl` | JSONL content from `create_session_browser.py` |

### Harvesting sessions

Use a **burner** X account — nitter drives X's unofficial API with these
cookies and accounts do get suspended for it. 2FA is supported (TOTP secret).

```bash
git clone https://github.com/zedeus/nitter /tmp/nitter && cd /tmp/nitter/tools
pip install -r requirements.txt
python3 create_session_browser.py <burner-user> <burner-pass> [totp-secret] --append ../sessions.jsonl
```

Paste the `sessions.jsonl` content into the `sessions-jsonl` field, then:

```bash
kubectl rollout restart deployment/nitter -n nitter
```

(subPath secret mounts never hot-reload — restart the deployment on every
session rotation.)

## Configuration

Edit `nitter.conf` in this directory. After changes:

```bash
kubectl rollout restart deployment/nitter -n nitter
```

## Troubleshooting

```bash
# Pod status (pending = nitter-secrets item missing)
kubectl get pods -n nitter

# Session loading (look for "successfully added N valid account sessions")
kubectl logs deployment/nitter -n nitter

# Timeline errors with sessions loaded = session suspended/rate-limited;
# re-harvest with a fresh burner account
```

## References

- **[Nitter repository](https://github.com/zedeus/nitter)** - Source code
- **[Self-hosting guide](https://github.com/sekai-soft/guide-nitter-self-hosting)** - Session harvesting walkthrough
- **[Creating session tokens](https://github.com/zedeus/nitter/wiki/Creating-session-tokens)** - Upstream wiki
