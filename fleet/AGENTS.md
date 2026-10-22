# AGENTS.md — Fleet

Folder-scoped router for agents working on the FleetDM MDM GitOps tree.
Repo-wide routing starts at the root [AGENTS.md](../AGENTS.md); this file
scopes only this folder. Module context lives under
[`.agents/`](./.agents/README.md) — start at
[.agents/skills/fleet-gitops/SKILL.md](./.agents/skills/fleet-gitops/SKILL.md)
for non-trivial Fleet work. The human-facing doc is
[`README.md`](./README.md).

## What lives here

`fleetctl gitops` config-as-code: `default.yml` (org settings), `fleets/home.yml`
(the Home fleet), and the `platforms/**` artifacts tree (policies, scripts,
software, configuration-profiles, declaration-profiles, reports, icons).
CI applies it: [`gitops.sh`](./gitops.sh) plus
[`.gitlab-ci.yml`](./.gitlab-ci.yml) — MR pipelines dry-run only; a
default-branch push and the hourly schedule apply.

## Rules for agents working here

- **GitOps source of truth:** the YAML in this tree wins. Live Fleet state is
  downstream of it; mutating live state away from the manifests is not.
- **Never apply.** Agents never run `fleetctl gitops` without `--dry-run`.
  Applying is CI's job, after a human merges.
- **Secrets stay out of git.** They enter only as `$VARIABLE` placeholders
  that CI substitutes (GitLab CI/CD variables sourced from 1Password) — never
  committed.
- **`--delete-other-fleets` is on by default:** any fleet not defined under
  `fleets/` is deleted on apply.
- Read the
  [fleet-gitops skill](./.agents/skills/fleet-gitops/SKILL.md) before
  non-trivial changes.
