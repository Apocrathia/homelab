# ollama

Ollama LLM server on managed hosts, deployed the official way: this role
runs ollama.com's `install.sh` and keeps the installed version pinned to
what `ollama_version` asks for. The script owns the whole install — the
`ollama` user/groups, `/usr/local/bin/ollama`, the library tree under
`/usr/local/lib/ollama` (CPU + CUDA + Vulkan, plus the ROCm overlay when
`lspci` sees an AMD GPU), and `/etc/systemd/system/ollama.service`. The
role never templates or drops into that unit; service defaults
(`OLLAMA_HOST=127.0.0.1:11434`, models under
`/usr/share/ollama/.ollama/models`) come from ollama's code defaults and
stay that way.

## Nightly self-update

The GitLab `ansible-drift` schedule applies `playbooks/site.yml` every
night. On each apply the role compares the installed version
(`/usr/local/bin/ollama --version`) against GitHub's `releases/latest`
tag — when they differ, it re-runs `install.sh`. No-op nights touch
nothing; the host tracks upstream releases without a repo pin bump.
After the script restarts the service the role probes `127.0.0.1:11434`
and fails the run if the API never comes up, so a broken upgrade cannot
pass silently in an unattended job.

## Rollback brake

`ollama_version` defaults to `"latest"` (tracks GitHub `releases/latest`
at apply time). Set a bare concrete version (e.g. `"0.32.13"`) to hold the
host on one release or roll it back — the value is passed to `install.sh`
as `OLLAMA_VERSION` in bare form only; a `"v"` prefix 404s the script's
pin.

## RPM consolidation (operator decision 2026-09-26)

Fedora ships a community ollama RPM (`ollama`, `ollama-base`,
`ollama-rocm`, `ollama-vulkan`) that goes stale in the distro repo and
shadows `/usr/local/bin/ollama` on PATH. The role removes all four
subpackages on every apply; dnf no-ops on names that are absent, so the
task is idempotent and leaves exactly one install.

## Models are off-limits

The role never writes inside `/usr/share/ollama`, never sets
`OLLAMA_MODELS`, and never pulls or deletes models — the 137 GB store on
`ians-gaming-pc` is operator-owned. A pre/post stat pair asserts the
models directory survives every run.

## Prereqs

`zstd` (unpack the `.tar.zst` bundles) and `pciutils` (`lspci`, the
script's AMD GPU detection). Fedora gotcha: never add `curl` to this list
— full curl conflicts with `curl-minimal` on Fedora 36+, and curl is
already present.

## Env overrides (not implemented)

The extension channel for environment overrides (e.g. `OLLAMA_HOST`) is
the docs.ollama.com systemd drop-in pattern
(`/etc/systemd/system/ollama.service.d/override.conf`) — this role
deliberately does not implement it; defaults are current behavior.
