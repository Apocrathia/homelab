# dependency-review-sweep

Hourly agent sweep over open Renovate MRs. Replaces manual triage:

- deterministic runner (`src/facts.py`) collects upstream facts: release age
  (GitHub releases → tags → PyPI → Docker Hub/ghcr config dates), superseded
  check, OSV vulnerabilities, upstream issue scan since the release
- hard gates (`src/invoke.py`): cooldown anchored on the **upstream release
  date** (not MR age), so same-day patched versions never merge stale —
  Renovate retargets the MR and the gate restarts on the new version
- A2A judgment turn via git-agent (`prompts/task.md`): bug storms,
  version-specific regressions, release-note signals, source validation
- posts a verdict note + `agent-review:pass|hold|block` labels on every MR
  and approves passes. **Merge stays with the operator.**

## Classes

| Update                                                              | Cooldown                  | Notes                                                                                |
| ------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| digest refresh                                                      | none                      | same tag, rebuilt image (CVE-rebuild class); Trivy pre-merge scan is the phase-2 gap |
| patch/minor                                                         | 24h from upstream release | superseded → hold; OSV hit → block                                                   |
| major                                                               | 24h + human review        | DB-migration risk, `agent-review:major` label                                        |
| infra majors (talos, authentik, tailscale, litellm, cnpg, longhorn) | 72h                       | `agent-review:infra` label on every infra bump                                       |

## Idempotency

MRs already carrying a verdict label and untouched for 90 minutes are skipped.
Retargets (new Renovate push) bump `updated_at` and trigger a re-review.

## Known upstream gotchas (baked in)

- Renovate's declared `[source]` links can be wrong (ghcr.io/trueforge-org/kubectl
  claims a Jackett source via the image's own mislabeled
  `org.opencontainers.image.source`). The runner cross-checks image labels
  and flags mismatches; the agent is told to trust neither on conflict.
- Some apps have dead/renamed GitHub sources (tdarr); release age falls back
  to ghcr manifest config `created` or Docker Hub `last_updated`.
- Helm chart sources point at chart repos (goauthentik/helm, tailscale/k8s);
  the agent resolves the app repo and returns `release_at_corrected`, which
  the runner re-checks against the cooldown gate.

## Secrets

Reuses the existing 1Password vault items (no new secrets):
`vaults/Secrets/items/gitlab-mcp-secrets` (key `gitlab-token` — same token
gitlab-mcp uses for MR notes/approvals) and `vaults/Secrets/items/github-mcp-secrets`
(key `authorization`, may carry a Bearer prefix — normalized by the runner).

## Local run

```sh
cd src && uv run python invoke.py   # needs GITLAB_TOKEN, GITHUB_TOKEN, A2A_URL
```
