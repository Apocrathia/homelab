# UniFi WAN IP sync

`CronJob` that reads the site gateway's WAN1/WAN2 addresses from the UniFi Network API and keeps the
`DNSEndpoint` CR (`wan-ips`) in sync with them. The [external-dns-wan](../../../../../03-services/wan-dns/README.md)
instance consumes that CR and writes the public Cloudflare A records
(`conexon.apocrathia.com` -> WAN1, `stratusiq.apocrathia.com` -> WAN2).

If either WAN IP is missing or empty the job exits 1 without touching the CR
(never patch empty or partial state). The `DNSEndpoint` CR itself is
**runtime state owned by this job** - not in git, not edited by hand - like
the UniFi firewall-group content the sibling job manages out-of-git.

## What gets deployed

- Namespace: `unifi-scripts` (from the parent kustomization)
- `CronJob`: `unifi-wan-ip-sync` (every 5 minutes, America/Denver)
- `ServiceAccount` + `Role`/`RoleBinding`: create/patch `dnsendpoints` (`externaldns.k8s.io`) in `unifi-scripts`
- `ConfigMap`: script, `pyproject.toml`, and `uv.lock` (from `src/`)

Unlike [uptime-robot-ip-sync](../uptime-robot-ip-sync/README.md), this job
patches a Kubernetes CR, so the pod mounts its ServiceAccount token
(`automountServiceAccountToken: true`).

The init container installs [uv](https://docs.astral.sh/uv/), exports a frozen
requirements file from the lock, and installs dependencies into `/deps` with
`uv pip install` (same idea as local `uv sync`, without relying on
`pip install -r requirements.txt` in Git).

## Shared secret `unifi-secrets`

Reuses the existing `unifi-secrets` 1Password item (same as the sibling job -
no new secret is created). Fields map to these Kubernetes secret keys:

| Key          | Role                   |
| ------------ | ---------------------- |
| `username`   | UniFi local user       |
| `credential` | Password for that user |

## Environment variables

Set in `cronjob.yaml`:

| Variable           | Role                                                  |
| ------------------ | ----------------------------------------------------- |
| `UNIFI_URL`        | UniFi controller base URL                             |
| `UNIFI_SITE`       | Site name (`default`)                                 |
| `UNIFI_VERIFY_SSL` | TLS verification (`false` for the self-signed cert)   |
| `WAN1_HOSTNAME`    | DNS name for the WAN1 IP (`conexon.apocrathia.com`)   |
| `WAN2_HOSTNAME`    | DNS name for the WAN2 IP (`stratusiq.apocrathia.com`) |
| `DNSENDPOINT_NAME` | Name of the CR to maintain (`wan-ips`)                |
| `DRY_RUN`          | `true` = log the intended patch, touch nothing        |

## Gateway selection

The gateway is picked by device type (`uxg`, `ugw`, `udm`, `udm-pro` - this
site is a UXG-PRO), not by MAC. Zero or more than one gateway aborts the run.

## Local development

Uses [uv](https://docs.astral.sh/uv/) like the sibling job:

```bash
cd src

uv venv
source .venv/bin/activate

uv sync

cp env.example .env
# edit .env with UNIFI_URL, UNIFI_USERNAME, UNIFI_PASSWORD, hostnames, etc.

python wan_ip_sync.py
```

Use `DRY_RUN=true` in `.env` until you are happy with the logged actions -
the dry run never calls the Kubernetes API (no ServiceAccount needed locally).

UniFi OS rate-limits logins (~6 per 25 s); the job logs in once per run, so
space out manual runs when testing.

### Format / lint

```bash
cd src
uv run ruff format .
uv run ruff format --check .
uv run ruff check .
```

## Kustomize check

```bash
kubectl kustomize flux/manifests/04-apps/management/scripts/unifi
```

## References

- **[uv](https://docs.astral.sh/uv/)** - dependency management
- **[Art-of-WiFi UniFi-API-client](https://github.com/Art-of-WiFi/UniFi-API-client)** - API path and UniFi OS behavior reference
- **[external-dns-wan](../../../../../03-services/wan-dns/README.md)** - the CR consumer
