---
title: "Defer Trivy noise: gotk vendor, gitignored secrets, .scratch"
kind: spec
status: open
severity: low
source: agent
found_at: 2026-07-24
found_by: launch-3-trivy-ledger
area: security
slice: hitl
---

# Defer Trivy noise: gotk vendor, gitignored secrets, .scratch

## Problem / desired state

Full-tree Trivy batch `7c5f1d25-bff3-4a6f-8eb6-651a069002a5` mixed actionable
tracked findings with expected noise. This issue records what is explicitly
**out of scope** for fix-now work so later scanners do not re-file the same
buckets.

### Deferred / noise (do not "fix" without new intent)

| Bucket                             | Paths / signals                                                                                                                              | Why deferred                                                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flux gotk vendor                   | `flux/manifests/01-bootstrap/flux-system/gotk-components.yaml` — CRITICAL AVD-KSV-0046 (manage all resources), AVD-KSV-0041 (manage secrets) | Protected bootstrap path. Upstream Flux install artifact; in-repo edits need explicit operator confirm and usually come from regenerating gotk, not hand patches. |
| Gitignored local secrets           | `terraform/.env`, `secrets/**`, `**/.terragrunt-cache/**`, `.scratch/**` (PAT-class hits)                                                    | Not tracked in git (see `.gitignore`). Hits are local workstation / cache noise. **Never paste secret values into issues or commits.**                            |
| Ephemeral scratch CVEs / misconfig | `.scratch/**` (e.g. scrapegoat go.mod, scrauper Cargo.lock, fleet-dm renders)                                                                | Not shipping GitOps; delete or refresh scratch as needed, do not ledger as app debt.                                                                              |

### Actionable siblings (filed separately)

- Tracked `uv.lock` HIGH CVEs → `trivy-uv-lock-high-cves.md`
- Kyverno + gateway AVD-KSV-0041 → `trivy-kyverno-gateway-secrets-rbac.md`

### Also seen (not owned by this ledger wave)

HIGH misconfigs on other tracked paths appeared in the same batch (e.g.
readonly rootfs on skyscraper/tdarr/kiwix cronjobs, litellm `pods/exec`,
bitmagnet `externalIPs`, node-labeler / io-benchmark default securityContext).
File focused issues when picking those up; do not treat this deferral file as
their backlog.

## Repro

N/A — scoping record for scan triage.

## Acceptance

- Gotk CRITICAL findings are not "fixed" by editing
  `01-bootstrap/flux-system/gotk-components.yaml` without explicit operator
  confirm.
- Secret findings from gitignored paths are not copied into docs or git.
- Future Trivy full-tree triage treats the deferred buckets above as known
  noise unless policy changes (e.g. Trivy skip paths for `.scratch`,
  `.terragrunt-cache`, `secrets/`).

## Feedback loop

- Optional: re-run Trivy on `flux/manifests/01-bootstrap/flux-system/` and
  confirm AVD-KSV-0046/0041 still only on `gotk-components.yaml`.
- Optional: add Trivy skip/exclude for gitignored noise paths in whatever
  scan wrapper the lab uses — verify full-tree HIGH/CRITICAL count drops
  without hiding the two actionable issue paths.

## Implementation hint

Prefer scan-config excludes for gitignored trees over chasing local PATs.
For gotk: bump via upstream Flux regenerate when the operator schedules a
bootstrap refresh; do not surgically strip ClusterRole rules.

## Notes

- No secret values, tokens, or `.env` contents belong in this file or related
  MRs — path classes only.
- Related protected-path rule: `.agents/rules/protected-paths.md` /
  `.cursor/rules/protected-paths.mdc` (`flux/manifests/01-bootstrap/**`).
