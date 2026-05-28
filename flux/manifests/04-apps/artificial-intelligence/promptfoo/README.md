# Promptfoo

[Promptfoo](https://promptfoo.dev/) is an LLM eval framework and red-teaming platform — declarative configs to compare model outputs, score with assertions, and probe LLM apps for vulnerabilities (prompt injection, PII leakage, jailbreaks, etc.).

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

This deployment runs `promptfoo` from the official npm package on top of the official `python:3.13` debian image, behind Authentik, with the SQLite database, eval results, and blob outputs persisted on Longhorn at `/data/.promptfoo`. The server is a Node.js Express app on port 3000 with a built-in `/health` endpoint.

The deployment uses our `helm/generic-app` chart rather than the upstream Helm chart at `promptfoo/promptfoo:helm/chart/promptfoo` — that chart pins `image.tag: v1.0.0` (the real latest is two orders of magnitude ahead), bakes in a Traefik Ingress with cert-manager annotations, requires a placeholder `imagePullSecrets`, and undersizes resources at 100m/128Mi.

### Why not the upstream `ghcr.io/promptfoo/promptfoo` image

Promptfoo's red-team workflows shell out to the Python-based [`modelaudit`](https://pypi.org/project/modelaudit/) CLI to scan ML model files. The upstream image is alpine (musl libc) and modelaudit's required `modelaudit-picklescan` dependency is a Rust+PyO3 wheel with no `musllinux` build, which forces a source build that fails on alpine without a full C+Rust toolchain. Two ways to fix that:

1. **Build a custom image** that bakes in modelaudit + a debian base. Avoided here — we don't want to maintain a custom registry image.
2. **Install everything declaratively at boot** on top of stock images. Picked.

The init container fetches the official Node binary tarball from `nodejs.org`, npm-installs `promptfoo`, creates a Python venv, and pip-installs `modelaudit` — all into an `emptyDir` at `/opt/promptfoo`. Cold start is ~3-5 minutes; nothing is third-party, nothing is custom-built.

## Access

- **External URL**: `https://promptfoo.gateway.services.apocrathia.com`
- **Internal Service**: `http://promptfoo.promptfoo.svc.cluster.local:80`

## Authentication

Authentik proxy provider — promptfoo OSS has no native auth (SSO is Enterprise-only), so the proxy is the only line of defense. The web UI and MCP endpoints are upstream-designed as single-user developer tools; do not expose without the proxy in front.

## Configuration

All configuration happens through the web UI (or by uploading `promptfooconfig.yaml` files). Bring your own LLM provider — point promptfoo at LiteLLM (`http://litellm.litellm.svc.cluster.local:4000`) for in-cluster access to every model the proxy exposes. API keys you paste into the UI live in the SQLite db on the PVC, not in 1Password.

## Privacy & lockdown

The deployment disables every outbound call promptfoo makes by default:

| Variable                                           | Effect                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| `PROMPTFOO_SELF_HOSTED=1`                          | Suppresses telemetry, hides host env vars from prompt templates   |
| `PROMPTFOO_DISABLE_TELEMETRY=1`                    | No product analytics, no session replay                           |
| `PROMPTFOO_DISABLE_UPDATE=1`                       | No version-check call to NPM                                      |
| `PROMPTFOO_DISABLE_SHARING=true`                   | Disables the "Share" button entirely                              |
| `PROMPTFOO_DISABLE_REMOTE_GENERATION=true`         | No fallback to `api.promptfoo.app` for grading or test generation |
| `PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION=true` | Same, specifically for red-team payload generation                |

**Trade-off:** with remote generation disabled, the red-team helpers will not auto-generate adversarial payloads from `api.promptfoo.app`. You must supply your own LLM provider for that — point promptfoo's red-team config at LiteLLM. See the [self-hosting docs](https://www.promptfoo.dev/docs/usage/self-hosting/) for the env var reference.

## Storage & runtime layout

| Mount            | Volume                  | Purpose                                                                              |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `/data`          | Longhorn PVC (10Gi, 1×) | `$HOME` for promptfoo — sqlite db, blobs, eval results. Persists across restarts.    |
| `/opt/promptfoo` | `emptyDir`              | Bootstrap install — `node/`, `npm/`, `venv/`. Re-populated by the init on every pod. |
| `/tmp`           | `emptyDir`              | Scratch space (root FS is read-only).                                                |

## Bootstrap (init container)

Both the init and main containers use the same image — `public.ecr.aws/docker/library/python:3.13` (the AWS ECR mirror of Docker library `python:3.13`). The init container runs as uid 1000 with a read-only root FS and dropped capabilities, then:

1. Downloads the pinned Node.js binary tarball from `nodejs.org` and extracts it to `/opt/promptfoo/node`.
2. `npm install --omit=dev --ignore-scripts` of `promptfoo@<version>` into `/opt/promptfoo/npm` (25m timeout; scripts skipped to avoid hung native postinstalls).
3. Creates a Python venv at `/opt/promptfoo/venv`.
4. `pip install modelaudit==<version>` into the venv.
5. Smoke-tests each binary and the promptfoo server entry path.

Three Renovate datasources keep the pins fresh:

| Component  | Pin via                                                       |
| ---------- | ------------------------------------------------------------- |
| python     | `datasource=docker depName=docker/library/python` (image tag) |
| node       | `datasource=node-version depName=node`                        |
| promptfoo  | `datasource=npm depName=promptfoo`                            |
| modelaudit | `datasource=pypi depName=modelaudit`                          |

The main container then runs the same entry point as the upstream Dockerfile:

```text
node /opt/promptfoo/npm/lib/node_modules/promptfoo/dist/src/server/index.js
```

`PATH` includes `/opt/promptfoo/node/bin`, `/opt/promptfoo/npm/bin`, and `/opt/promptfoo/venv/bin`, so promptfoo finds `modelaudit` (and any other CLI helpers) via plain shell lookup when the red-team UI shells out.

### Cold start

Every pod restart re-runs the init (emptyDir is gone with the pod). On a warm node:

- Node tarball download + extract: ~10s
- npm install promptfoo: ~60-120s
- pip install modelaudit: ~30-60s

Total: 2–4 minutes before the main container starts. This is intentional — emptyDir keeps `/opt` clean and reproducible, no PVC growth, no install-state drift across upgrades. The `startupProbe` allows up to 5 minutes (`failureThreshold: 30 × periodSeconds: 5`) for promptfoo's own boot after the init finishes.

### ModelAudit coverage

We install base `modelaudit` only (no `[all]` extras). Heavy extras like `torch` and `scikit-learn` aren't needed for the highest-value scanners — pickle/picklescan catches malicious opcodes in `.pkl`/`.bin`/`.pt`/`.pth` (PyTorch model files are pickles at the wire level), and HuggingFace Hub + cloud storage fetchers cover remote scanning. Formats that need the heavy extras (Keras `.h5`, deep torch-aware analysis) will surface as "unsupported format" in the UI — bump to `modelaudit[all]` in the init script if/when needed; debian + a venv handles the source-build fine.

### Maintenance

Re-bootstrap is automatic on any pod restart. To force one:

```bash
kubectl rollout restart -n promptfoo deploy/promptfoo
```

To check what versions the running pod actually loaded:

```bash
kubectl exec -n promptfoo deploy/promptfoo -- /opt/promptfoo/node/bin/node --version
kubectl exec -n promptfoo deploy/promptfoo -- /opt/promptfoo/venv/bin/modelaudit --version
kubectl exec -n promptfoo deploy/promptfoo -- cat /opt/promptfoo/npm/lib/node_modules/promptfoo/package.json | jq -r .version
```

## Troubleshooting

```bash
# Pod status
kubectl get pods -n promptfoo

# Application logs (look for "Server listening on http://0.0.0.0:3000")
kubectl logs -n promptfoo deploy/promptfoo -f

# Hit the health endpoint from inside the cluster
kubectl run -n promptfoo --rm -it --image=curlimages/curl debug -- \
  curl -s http://promptfoo.promptfoo.svc.cluster.local/health

# Authentik outpost for this app
kubectl get pods -n authentik -l app.kubernetes.io/name=ak-outpost-promptfoo

# Inspect the persistent volume contents
kubectl exec -n promptfoo deploy/promptfoo -- ls -la /data/.promptfoo
```

## References

- **[Promptfoo Documentation](https://www.promptfoo.dev/docs/)** - Eval and red-teaming guides
- **[Self-Hosting Guide](https://www.promptfoo.dev/docs/usage/self-hosting/)** - Env var reference and deployment options
- **[GitHub Repository](https://github.com/promptfoo/promptfoo)** - Source code and issues
