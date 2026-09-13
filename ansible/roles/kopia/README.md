# kopia

Kopia backups for non-Kubernetes hosts: package install from the official
kopia repos, per-path retention policy, and a systemd-timer snapshot
schedule. Hosts connect to the **shared repository** the cluster's kopiur
pilot uses (`ClusterRepository/nas-rustfs`, bucket `kopia` on NAS RustFS), so
every backup — cluster and hosts — is visible in the one kopia web UI at
`kopia.gateway.services.apocrathia.com`.

## What it does

1. **Install** — kopia from the official apt (Debian) / dnf (Fedora) repo,
   version pinned by `kopia_package_version` (keep aligned with, not newer
   than, the version kopiur bundles — a newer client would auto-upgrade the
   shared repo format and break the cluster side).
2. **Repository** — connects to the shared repo on
   `storage.services.apocrathia.com:9009` (plain HTTP on the LAN), config in
   `/root/.config/kopia`. Hosts use their own RustFS user (bucket-scoped to
   `kopia`), distinct from kopiur's, so host-key rotation never touches the
   cluster. Credentials pass via environment, never argv.
3. **Policy** — retention per backup path (defaults 7 daily / 4 weekly /
   6 monthly). The global policy belongs to the cluster side; hosts never
   touch `--global`.
4. **Schedule** — `kopia-snapshot.timer` runs a one-shot service with the
   explicit path list (bootstrap-safe; `--all` only finds sources that
   already have snapshots) nightly at 02:00 + 30m randomized delay,
   Persistent. Maintenance is kopiur-owned; hosts never run maintenance.

Snapshot sources are scoped by kopia's user@host identity — each host
snapshots only its own paths (verified against kopia source:
`shouldSnapshotSource` filters on hostname + username).

## Variables

Secrets have **no defaults** and fail the run when missing. The playbook
supplies them via 1Password lookup (`playbooks/kopia.yml`):

| Variable              | Source                                | Notes                                                    |
| --------------------- | ------------------------------------- | -------------------------------------------------------- |
| `kopia_repo_password` | `kopia-secrets` / `repo-password`     | Shared repository encryption (same repo as the cluster). |
| `kopia_s3_access_key` | `kopia-secrets` / `access-key-id`     | Hosts' RustFS user, scoped to the `kopia` bucket.        |
| `kopia_s3_secret_key` | `kopia-secrets` / `access-key-secret` |                                                          |

Non-secret defaults live in `defaults/main.yml`. Per-host backup paths go in
`inventory/host_vars/<host>.yml`.

## Usage

```bash
# Check (read-only; kopia shell tasks skip in check mode)
ansible-playbook playbooks/kopia.yml --limit game --check --diff

# Apply
ansible-playbook playbooks/kopia.yml --limit game

# Inspect on the host
kopia repository status
kopia snapshot list
systemctl list-timers kopia-*
journalctl -u kopia-snapshot.service
```

## Notes

- Shared-repo trade-off (operator decision 2026-09-13): any host (or the
  cluster) can read and delete the whole repository. Confidentiality rides on
  the repo password; blast-radius separation would require separate buckets
  and users per trust domain.
- `kopia_package_version` must not exceed the cluster's kopia version
  (kopiur bundles 0.23.1); newer formats would break the cluster client.
- unifi-os is an appliance OS — unverified as a kopia target; check before
  adding it to the inventory.
- KopiaUI (desktop tray app) manages its own per-user repository config and
  is out of scope; this role's repository is the root/system one.
