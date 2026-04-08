# UniFi Uptime Robot IP sync

`CronJob` that pulls [Uptime Robot’s published checker IPs](https://api.uptimerobot.com/meta/ips) and updates two UniFi Network **firewall group** objects (IPv4 and IPv6 address groups) when the member lists change.

## What gets deployed

- Namespace: `unifi-scripts`
- `CronJob`: `unifi-uptime-robot-ip-sync` (daily 04:00 America/Denver)
- `OnePasswordItem`: `unifi-secrets` → Kubernetes `Secret` `unifi-secrets`
- `ConfigMap`: script, `pyproject.toml`, and `uv.lock` (from `src/`)

The init container installs [uv](https://docs.astral.sh/uv/), exports a frozen requirements file from the lock, and installs dependencies into `/deps` with `uv pip install` (same idea as local `uv sync`, without relying on `pip install -r requirements.txt` in Git).

## 1Password item `unifi-secrets`

Create or reuse vault item `unifi-secrets` (path must match `secret.yaml`). Fields must map to these Kubernetes secret keys:

| Key          | Role                   |
| ------------ | ---------------------- |
| `username`   | UniFi local user       |
| `credential` | Password for that user |

## Tunables (manifests only)

Controller URL, site name, TLS verification, firewall group IDs, and schedule live in `cronjob.yaml`.

## Local development

Uses [uv](https://docs.astral.sh/uv/) like [arrsync](../../../../media/management/scripts/arrsync/README.md):

```bash
cd src

uv venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

uv sync

cp env.example .env
# edit .env with UNIFI_URL, UNIFI_USERNAME, UNIFI_PASSWORD, group IDs, etc.

python sync_uptime_robot_firewall_groups.py
```

Use `DRY_RUN=true` in `.env` until you are happy with the logged actions.

### Format / lint

```bash
cd src
uv run ruff format .
uv run ruff format --check .
uv run ruff check .
```

## Script behavior

See [sync_uptime_robot_firewall_groups.py](./src/sync_uptime_robot_firewall_groups.py). On startup, if `src/.env` exists it is loaded (ignored in-cluster).

Environment variables are documented in [`.env.example`](./src/.env.example).

## Kustomize check

```bash
kubectl kustomize flux/manifests/04-apps/management/scripts/unifi
```

## References

- **[uv](https://docs.astral.sh/uv/)** — dependency management
- **[Art-of-WiFi UniFi-API-client](https://github.com/Art-of-WiFi/UniFi-API-client)** — API path and UniFi OS behavior reference
