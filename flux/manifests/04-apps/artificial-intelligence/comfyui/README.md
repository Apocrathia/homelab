# ComfyUI

[ComfyUI](https://github.com/Comfy-Org/ComfyUI) is a node-graph interface for diffusion model workflows — image, video, and audio generation with a visual editor and HTTP/WebSocket API.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

This deployment bootstraps ComfyUI from the official GitHub release tarball onto a stock `python:3.13` image (same pattern as [Promptfoo](../promptfoo/README.md)). An init container installs CPU PyTorch and ComfyUI dependencies into a Longhorn-backed venv at `/data/app`. Runtime data (output, input, user settings, custom nodes) lives under `/data/comfyui` on Longhorn. Models mount from SMB at `/models` (`Library/AI Models/ComfyUI`) via `extra_model_paths.yaml` — not nested under the Longhorn base path, because a nested SMB mount makes `/data/comfyui` root-owned and breaks init.

CPU-only — inference is slow. Useful for workflow editing, API integration testing, and light generation. Add a GPU node and swap the bootstrap to a CUDA/ROCm wheel index when you want real throughput.

## Access

- **URL**: `https://comfyui.gateway.services.apocrathia.com`
- **Internal**: `http://comfyui.comfyui.svc.cluster.local:80`

## Authentication

ComfyUI has no built-in auth. Authentik proxy provider sits in front of the web UI and API — anyone who reaches the app URL without going through Authentik is trusted by ComfyUI itself, so don't bypass the proxy.

## Configuration

All workflow and model configuration happens through the web UI after deployment. Place model files on the NAS under `Library/AI Models/ComfyUI/` in the standard subdirectories (`checkpoints/`, `loras/`, `vae/`, etc.). The init container creates those folders on the share; ComfyUI lists models from whatever files you put there — an empty share means no models in the UI.

The SQLite database is stored at `/data/comfyui/user/comfyui.db` on Longhorn via `--database-url`. ComfyUI's default path points at the read-only app tree under `/data/app/ComfyUI/user/`, which does not exist after bootstrap.

The init container pins a ComfyUI release tag via Renovate. Bumping the tag triggers a reinstall on next pod start.

## Storage layout

| Mount                | Volume                            | Purpose                                                |
| -------------------- | --------------------------------- | ------------------------------------------------------ |
| `/data`              | Longhorn (25Gi)                   | App venv, output, input, custom nodes                  |
| `/data/comfyui/user` | Longhorn                          | Workflows, settings, SQLite database (`comfyui.db`)    |
| `/models`            | SMB (`Library/AI Models/ComfyUI`) | Checkpoints, LoRAs, VAEs, embeddings                   |
| `/config`            | ConfigMap                         | `extra_model_paths.yaml` — maps `/models` into ComfyUI |

## Bootstrap (init container)

On first boot (or after a version bump):

1. Downloads the pinned ComfyUI release tarball from GitHub.
2. Creates a venv at `/data/app/venv`.
3. Installs CPU PyTorch from the official wheel index.
4. Installs `requirements.txt`.
5. Creates standard model subdirectories on the SMB share at `/models`.

Subsequent pod restarts skip bootstrap when the installed version matches the pin.

Cold start on a fresh PVC: expect 10–20 minutes for PyTorch + deps. Upgrades that change the ComfyUI pin reinstall into the same PVC.

## Privacy

ComfyUI sets `HF_HUB_DISABLE_TELEMETRY` and `DO_NOT_TRACK` on startup. This deployment also passes `--disable-api-nodes` to block the optional paid cloud inference nodes.

## Troubleshooting

```bash
kubectl get pods -n comfyui
kubectl logs -n comfyui deployment/comfyui -c install
kubectl logs -n comfyui deployment/comfyui -c comfyui -f
kubectl get pvc -n comfyui
```

If the init container fails mid-bootstrap, delete the pod and check whether `/data/app` on the Longhorn PVC is in a half-finished state. Wiping the PVC and letting it reinstall is the blunt fix.

If the main container crashes with `OSError: No username set in the environment`, the pod is missing `USER`/`HOME` for PyTorch cache resolution — see `helmrelease.yaml` env block.

## References

- **[ComfyUI GitHub](https://github.com/Comfy-Org/ComfyUI)** — source and release tags
- **[ComfyUI docs](https://docs.comfy.org/)** — workflow and model path reference
