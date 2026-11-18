# AGENTS.md — Renovate

Folder-scoped router for the Renovate dependency-automation module. This tree
**hosts** the renovate-operator; the Renovate **consumer** contract (the
`renovate.json` conventions every `Apocrathia/*` repo uses) lives here too, so
agents on any repo under the operator load it from one place. Repo-wide
routing starts at the root [AGENTS.md](../../../../AGENTS.md); module context:
[`.agents/`](./.agents/README.md). The human-facing doc is
[`README.md`](./README.md).

## What lives here

Two hats, one module:

- **Host** — the mogenius `renovate-operator` (CRD-driven, job-per-repo) that
  runs Renovate against every `Apocrathia/*` repo on a `0 */4 * * *` schedule.
  Manifests: [`config/renovatejob.yaml`](./config/renovatejob.yaml),
  [`helmrelease.yaml`](./helmrelease.yaml).
- **Consumer** — the repo-root `renovate.json` contract (presets,
  `packageRules`, `customManagers` regex managers, the dependency dashboard)
  that any repo under the operator uses. The homelab's own reference config:
  [`renovate.json`](../../../../renovate.json); the standing rule for that
  file: [`.agents/rules/renovate.md`](../../../../.agents/rules/renovate.md).

## Routing

Start at the [context hub](./.agents/context/README.md), then the module the
task needs:

| If you're…                          | Then read                                                |
| ----------------------------------- | -------------------------------------------------------- |
| New to Renovate in this homelab     | [`renovate.md`](./.agents/context/renovate.md)           |
| Touching the operator / hosting     | [`architecture.md`](./.agents/context/architecture.md)   |
| Writing or fixing a `renovate.json` | [`configuration.md`](./.agents/context/configuration.md) |
| Debugging a run / MR / update       | [`traps.md`](./.agents/context/traps.md)                 |

## Rules for agents working here

- **Never run Renovate against the live platform.** The operator opens real
  MRs. Validate config against the schema, and dry-run only
  ([`scripts/run-renovate.sh`](../../../../scripts/run-renovate.sh) runs
  `RENOVATE_PLATFORM=local`).
- **The regex comment is the contract.** A helm/image/version pin only updates
  if its `# renovate: datasource=… depName=…` comment matches the manager's
  `matchStrings` exactly. Drift = silent non-update. See
  [`configuration.md`](./.agents/context/configuration.md).
- **Secrets stay in 1Password.** `renovate-operator-secret` holds
  `RENOVATE_TOKEN` / `GITHUB_COM_TOKEN` and Docker Hub + GHCR creds; never
  commit a bare token.

## Upstream

Canonical Renovate docs: `github.com/renovatebot/renovate` —
[`AGENTS.md`](https://github.com/renovatebot/renovate/blob/main/AGENTS.md),
[`docs/usage/`](https://github.com/renovatebot/renovate/tree/main/docs/usage),
and the live [docs site](https://docs.renovatebot.com/). This module distills
the host/consumer facts; the upstream pages are the source of truth for
config-option details.
