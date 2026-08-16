---
title: "Defer Trivy noise: gitignored secrets and .scratch"
kind: spec
status: open
severity: low
source: agent
found_at: 2026-07-24
found_by: launch-3-trivy-ledger
area: security
slice: hitl
---

# Defer Trivy noise: gitignored secrets and .scratch

## Problem / desired state

Full-tree Trivy batch `7c5f1d25-bff3-4a6f-8eb6-651a069002a5` mixed actionable
tracked findings with expected local noise. This issue records what is
explicitly out of scope for fix-now work so later scans do not re-file the same
buckets.

### Deferred / noise

| Bucket                             | Paths / signals                                                                              | Why deferred                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Gitignored local secrets           | `terraform/.env`, `secrets/**`, `**/.terragrunt-cache/**`, `.scratch/**` (PAT-class hits)    | Not tracked in Git. Hits are local workstation or cache noise. Never paste secret values into issues or commits. |
| Ephemeral scratch CVEs / misconfig | `.scratch/**` (for example scrapegoat `go.mod`, scrauper `Cargo.lock`, and fleet-dm renders) | Not shipping GitOps; delete or refresh scratch as needed rather than recording it as application debt.           |

### Actionable siblings

- Tracked `uv.lock` HIGH CVEs → `trivy-uv-lock-high-cves.md`

### Also seen

HIGH misconfigurations on other tracked paths appeared in the same batch,
including readonly root filesystems, LiteLLM `pods/exec`, bitmagnet
`externalIPs`, and default security contexts. File focused issues when taking
those on; this deferral is not their backlog.

## Repro

N/A — scoping record for scan triage.

## Acceptance

- Secret findings from gitignored paths are not copied into documentation or
  Git.
- Future full-tree Trivy triage treats the buckets above as known local noise
  unless scan policy changes.

## Feedback loop

- Optionally add scan exclusions for `.scratch`, `.terragrunt-cache`, and
  `secrets/`, then verify the HIGH/CRITICAL count drops without hiding tracked
  findings.

## Implementation hint

Prefer scan-config exclusions for gitignored trees over chasing local PATs.

## Notes

No secret values, tokens, or `.env` contents belong in this file or related
merge requests; record path classes only.
