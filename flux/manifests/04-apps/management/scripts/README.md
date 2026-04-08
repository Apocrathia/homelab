# Management scripts

Small automation that runs in-cluster (typically `CronJob`) and supports day-two operations for the management app bundle.

## Contents

| Directory                  | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| [unifi](./unifi/README.md) | UniFi-related jobs (firewall objects, etc.); see subdirectories per script |

## Conventions

- **Secrets:** use `OnePasswordItem` CRs; do not commit raw `Secret` manifests with credentials.
- **Images:** pin Python base images with Renovate comments where used.
- **Layout:** each job lives in a subdirectory (e.g. `unifi/<name>/`) with `src/` for Python, `uv` + `uv.lock` for dependencies, and Kustomize mounting `pyproject.toml` / lock / script via `configMapGenerator` (same pattern as media [arrsync](../../media/management/scripts/arrsync/README.md)).
