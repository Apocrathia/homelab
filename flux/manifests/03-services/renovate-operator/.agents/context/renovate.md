# Renovate in this homelab

Renovate is Mend's automated dependency-update bot: it scans a repo's
dependency files, checks registries for newer versions, and opens/updates MRs.
It supports 90+ package managers and multiple platforms (here: GitLab).

## Two hats

- **Host** — the `renovate-operator` (mogenius, Apache-2.0, CRD-driven) runs
  Renovate against every `Apocrathia/*` repo on a schedule. It replaced the
  license-bound Mend CE deployment (see the "Renovate operator: shadow,
  then replace Renovate CE" plan, delete-on-ship'd; git history).
  One `RenovateJob` (`homelab`) drives discovery, then a job per repo.
- **Consumer** — each repo opts in with a repo-root `renovate.json`. The
  operator reads that file and turns it into MRs. The homelab's own
  [`renovate.json`](../../../../../../renovate.json) is both a consumer and the
  reference config for the regex-manager conventions.

## What runs today

- Schedule `0 */4 * * *` (every 4 hours), `parallelism: 1`, GitLab provider
  (default `https://gitlab.com/api/v4`), `discoveryFilters: ["Apocrathia/*"]`.
- Image `ghcr.io/renovatebot/renovate` (pinned, digest-locked).
- Docker Hub + GHCR registry creds flow into Jobs via
  `detectHostRulesFromEnv` from `DOCKER_*` env vars on the job secret.
- Onboarding off (`onboarding: false`, `requireConfig: optional`) — a repo
  with no `renovate.json` is skipped, not onboarded.
