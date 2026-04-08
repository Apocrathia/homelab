# UniFi scripts

Scheduled jobs and one-off tools that talk to UniFi Network (API session flow, firewall objects, etc.).

## Layout

Namespace **`unifi-scripts`** is defined in [`namespace.yaml`](./namespace.yaml) at this level; per-job manifests target that namespace.

Each tool lives in its own subdirectory with a `CronJob` (or other workload), `src/` for Python, and `uv` for dependencies.

| Subdirectory                                             | Role                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| [uptime-robot-ip-sync](./uptime-robot-ip-sync/README.md) | Sync firewall address groups from Uptime Robot’s published checker IP list |

## Shared secrets

Where a job needs UniFi credentials, use the `unifi-secrets` 1Password item (see per-job READMEs for which keys apply).
