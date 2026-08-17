# Prime Agent

[Prime Intellect](https://primeintellect.ai/) coding agent CLI (RLM-native,
IPython-backed tools) running as a persistent in-cluster agent box. Model
traffic goes through cluster LiteLLM.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

This deployment includes:

- Stock `node` image + bootstrap (`generic-app`); no upstream OCI image exists,
  so the pinned npm tarball installs into the Longhorn-backed `HOME` on boot
- Longhorn-backed state at `/opt/data` (agent config, sessions, kernels, npm
  prefix)
- `agent/` payload (extensions, seeded settings) reconciled from a ConfigMap
  on every pod start; mirrors `~/.prime/agent/`
- `agent/extensions/litellm.ts` registers the in-cluster LiteLLM gateway as
  the model provider and discovers the catalog from it; auth via
  `LITELLM_API_KEY` (or `/login` interactively)
- `agent/settings.json` seeded once (delete from the PVC to re-seed); runtime
  keys accumulate afterwards

## Access

No web UI — attach a TUI session over exec:

```bash
kubectl exec -it deploy/prime-agent -n prime-agent -- prime-agent
```

The daemon supervisor and session workers spawn in-pod on first attach and
keep running after you detach (close the TUI; the worker persists). Reconnect
with the same command; `prime-agent list` shows active agents.

## Configuration

- **Upgrade**: Renovate tracks `PRIME_AGENT_VERSION` in `helmrelease.yaml`
  (upstream git tags, semver); the new tarball installs on pod restart
- **Models**: `/model` inside the TUI. Default is seeded in
  `agent/settings.json`; the extension re-reads the gateway catalog on start
  (`/litellm-refresh` to re-poll)
- **Inject more agent files**: drop them under `agent/` and add one
  `configMapGenerator` entry in `kustomization.yaml` (kustomize cannot glob a
  directory); `*.ts` files land in `~/.prime/agent/extensions/` on boot
- **Skills/MCP servers**: not shipped in git — install into the PVC at runtime
  (`~/.prime/agent/`) per upstream docs

### Secrets

Create the 1Password item at `vaults/Secrets/items/prime-agent-secrets`:

- `litellm-api-key` — LiteLLM virtual key for the custom provider endpoint

## Initial setup

1. Mint a LiteLLM virtual key for prime-agent
2. Create the 1Password item above; wait for the secret to sync
3. Reconcile Flux (or apply locally)
4. `kubectl exec -it deploy/prime-agent -n prime-agent -- prime-agent` and
   confirm the default model with `/model`

## Troubleshooting

```bash
kubectl logs -n prime-agent deploy/prime-agent        # bootstrap output
kubectl exec -it deploy/prime-agent -n prime-agent -- bash
prime-agent status                                    # daemon/worker state (inside pod)
```

- Pod crashloops on bootstrap: check egress to the R2 release bucket and npm
- `/model` shows only `login-required`: the `prime-agent-secrets` item is
  missing or the key lacks model access on the gateway
- Kernel bootstrap fails on first tool call: check egress for the Python
  runtime download; `~/.prime/agent/logs/` has details
