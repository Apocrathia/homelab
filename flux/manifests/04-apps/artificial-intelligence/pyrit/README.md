# PyRIT

[PyRIT](https://microsoft.github.io/PyRIT/) is the Python Risk Identification Tool from Microsoft's AI Red Team — a framework for probing generative AI systems for jailbreaks, harm categories, prompt injection, and PII leakage. This deployment runs the CoPyRIT web UI (`pyrit_backend` GUI mode) behind Authentik.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

There is no published PyRIT container image. The deployment installs `pyrit` from PyPI into a venv on pod start via an init container, then runs `pyrit_backend` against a SQLite memory store on Longhorn. The PyPI wheel ships the prebuilt React/Fluent UI as static assets, so no Node toolchain is involved.

Pod restarts re-run the pip install (the venv lives on an `emptyDir`). The SQLite database, attack history, and uploaded artifacts persist on Longhorn at `/data/.local/share/pyrit/dbdata/pyrit.db`. Pinning Python to 3.13 — PyRIT's PyPI wheel requires `<3.14,>=3.10` until upstream publishes cp314 wheels for `transformers`, `pyodbc`, and `av`.

## Access

- **External URL**: `https://pyrit.gateway.services.apocrathia.com`
- **Internal Service**: `http://pyrit.pyrit.svc.cluster.local:80`

## Authentication

Authentik proxy provider. The upstream `pyrit_backend` ships with zero authentication — the Azure-hosted reference deployment bolts on Entra ID via Container Apps, which is not applicable here. Proxy is the only line of defense; do not expose without it.

## Configuration

Two layers of config beyond the chart values:

- **`pyrit_conf.yaml`** — edited as a standalone YAML file, rendered into the `pyrit-config` ConfigMap by the kustomize `configMapGenerator` in `kustomization.yaml`, mounted at `/config/pyrit_conf.yaml`, and loaded via `pyrit_backend --config-file`. Registers the `load_default_datasets`, `scorer`, and `target` initializers so the UI's Target Configuration page comes up populated. The `simple` initializer is omitted because targets/scorers are registered by the `target` and `scorer` initializers instead. No default `operator` / `operation` labels — set them per-attack in the ribbon.
- **`OPENAI_CHAT_*` env vars** — `OPENAI_CHAT_ENDPOINT` points at LiteLLM (`http://litellm.litellm.svc.cluster.local:4000`), `OPENAI_CHAT_MODEL` is pinned to `qwen3.5-abliterated-medium` (a jailbroken local model — frontier models refuse most adversarial inputs and make red-teaming pointless), `OPENAI_CHAT_KEY` comes from the 1Password item. The `target` and `scorer` initializers _require_ all three at startup or they crash with "Environment variable OPENAI_CHAT_MODEL is required". PyRIT's `OpenAIChatTarget` falls back to these when not given explicit args, and the GUI's Target Configuration page lets you override per-target.

Editing the config: change `pyrit_conf.yaml` in this directory — _not_ the rendered ConfigMap. Flux re-reconciles the kustomization on push; `disableNameSuffixHash: true` keeps the ConfigMap name stable, so you'll need to `kubectl rollout restart deploy/pyrit -n pyrit` (or `flux reconcile helmrelease pyrit -n pyrit`) to pick up the new content.

### Secrets

1Password item at `vaults/Secrets/items/pyrit-secrets`:

| Field             | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `openai-chat-key` | LiteLLM virtual key — mint one in the LiteLLM UI, paste it into 1Password |

Without this field populated, the `pyrit-secrets` K8s Secret will be missing the `openai-chat-key` data key, and any `OpenAIChatTarget` instantiation that relies on the env-var fallback will fail. Targets configured fully in the CoPyRIT UI (endpoint + key + model pasted in the form) ignore the env vars entirely and work without the 1Password item.

## Initial Setup

1. Mint a LiteLLM virtual key (LiteLLM UI → New Key, scoped to `qwen3.5-abliterated-medium` at minimum, plus any other models you want PyRIT to be able to attack).
2. Create the 1Password item at `vaults/Secrets/items/pyrit-secrets` with field `openai-chat-key` = that virtual key.
3. Apply the manifests (or let Flux reconcile). The 1Password operator materializes the K8s Secret; the deployment picks up the env vars on next pod start.
4. Hit `https://pyrit.gateway.services.apocrathia.com`, authenticate via Authentik, land in CoPyRIT. The `target` and `scorer` initializers will have pre-registered `OpenAIChatTarget` against `qwen3.5-abliterated-medium` so you can fire attacks immediately.
5. To attack a different model, add another `OpenAIChatTarget` in the UI's Target Configuration page — endpoint `http://litellm.litellm.svc.cluster.local:4000`, model whatever you want, key blank (falls back to env) or pasted inline.

## Storage

- `/data` — Longhorn PVC, holds `$HOME/.pyrit/` (config) and `$HOME/.local/share/pyrit/dbdata/pyrit.db` (memory store). Survives restarts.
- `/opt/venv` — emptyDir, holds the pip install. Rebuilt on every pod start (~2-3 minutes).

## Troubleshooting

```bash
# Pod status — install container runs before the main container
kubectl get pods -n pyrit

# Watch the pip install
kubectl logs -n pyrit deploy/pyrit -c install -f

# Application logs (look for "Uvicorn running on http://0.0.0.0:8000")
kubectl logs -n pyrit deploy/pyrit -f

# Health endpoint from inside the cluster
kubectl run -n pyrit --rm -it --image=curlimages/curl debug -- \
  curl -s http://pyrit.pyrit.svc.cluster.local/api/health

# Authentik outpost for this app
kubectl get pods -n authentik -l app.kubernetes.io/name=ak-outpost-pyrit

# Inspect the persistent SQLite db
kubectl exec -n pyrit deploy/pyrit -- ls -la /data/.local/share/pyrit/dbdata
```

## References

- **[PyRIT Documentation](https://microsoft.github.io/PyRIT/)** — Framework docs, attack patterns, target reference
- **[CoPyRIT GUI Guide](https://microsoft.github.io/PyRIT/gui/gui/)** — Web UI walkthrough
- **[GitHub Repository](https://github.com/microsoft/PyRIT)** — Source code and issues
- **[arXiv:2410.02828](https://arxiv.org/abs/2410.02828)** — Original PyRIT paper
