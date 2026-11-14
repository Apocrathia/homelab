# Renovate architecture

## Run pipeline

Every Renovate run does: clone → extract (manager) → lookup (datasource) →
compare (versioning) → update → finalize (prune branches). From the upstream
[`AGENTS.md`](https://github.com/renovatebot/renovate/blob/main/AGENTS.md).

## Four module types

| Module       | Job                                                                                   |
| ------------ | ------------------------------------------------------------------------------------- |
| `manager`    | Detects/updates dependency files (npm, maven, docker, helm, …)                        |
| `datasource` | Fetches version/release info (npm registry, Docker Hub, GitHub releases, git-tags, …) |
| `versioning` | Parses/compares version schemes (semver, docker, pep440, …)                           |
| `platform`   | Git host API (GitHub, GitLab, …) for MRs/issues/comments                              |

The homelab leans hard on **custom regex managers**: `customManagers` entries
pair a `# renovate:` comment with the field on the next line and feed a
specific `datasource`/`versioning`. See
[`configuration.md`](./configuration.md).

## Host topology

- `renovate-operator` HelmRelease (namespace `renovate-operator`) installs the
  CRD + controller; [`config/renovatejob.yaml`](../../config/renovatejob.yaml)
  is the `RenovateJob` `homelab`.
- Operator discovery (filter `Apocrathia/*`) → one executor Job per repo →
  Renovate runs that repo's `renovate.json`.
- `config/` has its own Flux Kustomization depending on the operator one — the
  `RenovateJob` CR and the CRD-installing HelmRelease must not apply from the
  same Kustomization (CR dry-run deadlocks the apply).
- Secrets: `renovate-operator-secret` 1Password item; `extraEnv` carries
  Docker Hub + GHCR creds into Jobs via `detectHostRulesFromEnv`.
