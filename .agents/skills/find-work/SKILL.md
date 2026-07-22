---
name: find-work
description: >-
  Rank read-only work from the local backlog and live signals; emit Launch
  briefs. Use when finding, prioritizing, or picking the next agent lap.
disable-model-invocation: true
---

# Find work

Rank candidate work from the local backlog and live signals. Emit a ranked
report plus pasteable Launch briefs. Parent/operator picks; this skill does
not execute.

Loop context: [`.agents/context/development-loop.md`](../../context/development-loop.md).

## Read-only

- Never edit files, stage, commit, or push.
- Never cluster-mutate (`kubectl apply` / `delete`, `flux reconcile`, mutating
  MCP, etc.). Scouts are **get / list / query** only.
- Never invent work to fill an empty queue. Report and stop.

## When to run

| Trigger          | Examples                                              |
| ---------------- | ----------------------------------------------------- |
| Start of a lap   | Constant-loop / session preamble needs a ranked queue |
| Operator asks    | "what's next", prioritize, pick a lap                 |
| Unattended scout | Cron / scheduled find — report only, no implement     |

Skip when the operator already handed you a single scoped brief. Do not re-scout
tightly in a loop after an empty-queue stop.

## Workflow

```
- [ ] 1. Run available scouts (skip if MCP/kube/CLI unavailable; continue others)
- [ ] 2. Normalize candidates (source, evidence, severity, found_at, constraints)
- [ ] 3. Apply autonomous gates (drop ineligible)
- [ ] 4. Rank by tier → severity → FIFO by found_at
- [ ] 5. Emit ranked report + Launch briefs for eligible rows
- [ ] 6. Stop — operator/parent selects; do not auto-implement
```

Partial scout failure ≠ invent work. Omit implement-oriented briefs from failed
scouts; mark `Dedupe: unverified` when identity is uncertain.

## Tiers (debt-first)

| Tier | Class                    | Homelab examples                                                                        |
| ---- | ------------------------ | --------------------------------------------------------------------------------------- |
| 1    | Production / correctness | Flux NotReady, firing critical alerts, red CI on default branch, security CRITICAL      |
| 2    | Tech debt / architecture | Ready bugs/arch issues, clustered `ponytail:`, context drift markers, stale plans       |
| 3    | MR maintenance           | Maintain-eligible open MRs (threads, failing CI, conflicts) — `watch-mr` when it exists |
| 4    | Issues                   | Ready implement / plan / plan-refresh (not 1–3)                                         |
| 5    | Features                 | Ready feature / roadmap work                                                            |
| 6    | Scoping                  | Needs alignment; feature plan stubs                                                     |
| 7    | Authoring tail           | New gaps / low-priority plans when 1–6 empty                                            |
| 8    | Autoresearch             | Only when 1–7 empty + complete research contract + budgets (Wave 6)                     |

**Within tier:** severity (`blocker` > `high` > `medium` > `low`) → **FIFO by
`found_at`**. Queue, not stack.

## Autonomous gates

- Tiers 1–2 outrank `watch-mr` / MR maintenance.
- Tiers 4–5 require zero eligible `watch-mr` (finish in-flight MRs first).
- Skip `slice: hitl`, protected-path edits, and `alignment` when unattended.
- Skip `status: blocked` / `in-flight` for new implement briefs.
- Partial scout failure → omit implement briefs; mark `dedupe unverified`.
- If all briefs ineligible or queue empty → one-line empty-queue report and
  **stop** (do not invent busywork).

Protected paths (confirm before any future edit; find-work never edits):
`.agents/**`, `.cursor/**`, `.claude/**`, `AGENTS.md`/`CLAUDE.md`, `talos/**`,
`helm/generic-app/**`, `flux/manifests/01-bootstrap/**`.

## Launch brief

Each actionable row must emit a pasteable brief:

```text
## Launch N — <title>
- Source: <issue path | alert | Flux object | MR>
- Evidence: <paths / queries / links>
- Acceptance: <observable done>
- Feedback loop: <verify command(s)>
- Worktree / branch: <optional>
- Dedupe: <not in flight | skip:… | unverified>
- Constraints: <protected | HITL | no cluster mutate | …>
- Invoke: <skill or persona>
```

Discover is read-only. Build only after the brief is selected.

### Invoke targets (Wave 3)

Honest mapping until Wave 4 ship-path skills land:

| Situation                          | Invoke                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| File/update a gap                  | [`file-issue`](../file-issue/SKILL.md)                                                                 |
| Scope fuzzy / HITL                 | [`alignment`](../alignment/SKILL.md) (skip unattended)                                                 |
| Context / link drift               | [`reconcile-context`](../reconcile-context/SKILL.md) / `context-steward`                               |
| Plan authoring                     | [`project-planner`](../../agents/project-planner/agent.md)                                             |
| Ops / prod signal triage           | [`site-reliability-engineer`](../../agents/site-reliability-engineer/agent.md)                         |
| Security signal triage             | [`security-analyst`](../../agents/security-analyst/agent.md)                                           |
| Manifest implement                 | Manual under operator, or `manifest-implementer` — **Wave 4:** prefer `implement-change` when it lands |
| Ship / propose commit / MR babysit | **Wave 4+** (`propose-ship`, `watch-mr`, `review-loop`) — do not fake those skills                     |

Do not invent `implement-change` / `propose-ship` bodies. Point parent to Wave 4
for the closed ship path.

## Scout adapters (read-only)

Run what you can. **Skip if unavailable** (no MCP, no kube context, no GitLab
auth) and continue. Note skips in the report.

### Issues ledger

- **Look at:** `docs/issues/*.md` (skip `README.md`, `_template.md`); open /
  ready rows from frontmatter.
- **How:** Read files; use `status`, `severity`, `found_at`, `slice`, `kind`.
- **Default tier:** 4 (bugs/arch ready); 5 (features); 6 if needs alignment /
  `slice: hitl`; promote to 1–2 when severity/source screams prod/security.
- **On failure:** Omit; do not invent issues.

### Plans ledger

- **Look at:** `.cursor/plans/` unchecked boxes / stubs. `docs/plans/` may not
  exist yet — skip that path if absent.
- **How:** Glob + read; note linked issue severity when present.
- **Default tier:** 2 if stale / refresh debt; 6 for feature stubs; 7 for
  low-priority authoring when higher tiers empty.
- **On failure:** Omit plan briefs.

### Flux

- **Look at:** NotReady Kustomization / HelmRelease.
- **How:** Flux MCP read-only (`get_kubernetes_resources` / Flux status tools);
  or `flux get kustomizations` / `flux get helmreleases` (read-only). Prefer MCP
  when configured ([`tools.md`](../../context/tools.md)).
- **Default tier:** 1 (blocker/high if prod app).
- **On failure:** Skip if unavailable; mark related backlog `dedupe unverified`.

### Grafana

- **Look at:** Firing alerts.
- **How:** Grafana MCP (`list_alert_groups` / alert tooling); severity from the
  alert. Deeplink evidence when useful.
- **Default tier:** 1 for critical/firing prod; otherwise from alert severity.
- **On failure:** Skip if unavailable.

### Scheduled health

- **Look at:** Failed pods / crash loops / restart storms.
- **How:** `kubectl get pods -A --field-selector=status.phase=Failed` (and
  related read-only `kubectl get` / `describe`). Namespace flag **after** the
  resource verb so allowlists work: `kubectl get pods -n <ns>`, not
  `kubectl -n <ns> get …`.
- **Default tier:** 1 if critical namespace; else high → tier 1–2.
- **On failure:** Skip if no kube access.

### CI

- **Look at:** Failed pipeline on the **default branch**.
- **How:** GitLab MCP (`list_pipelines` / `get_pipeline` / job logs) filtered to
  default branch failures.
- **Default tier:** 1.
- **On failure:** Skip if unavailable; omit implement briefs.

### Trivy

- **Look at:** CRITICAL / HIGH findings (changed paths, image, or cluster scan
  surfaces this session can reach).
- **How:** Trivy MCP (`scan_filesystem` / `findings_list` / etc.) or project CI
  artifacts — read-only.
- **Default tier:** 1 (CRITICAL → blocker; HIGH → high).
- **On failure:** Skip; mark `dedupe unverified` if a ledger row already claims
  the same CVE without fresh evidence.

### Renovate

- **Look at:** Stale or vulnerability-related MRs (deps ≠ the whole work queue).
- **How:** GitLab MCP merge-request list/filter; Renovate titles/labels.
- **Default tier:** 3 (maintain) / medium unless the vuln is actively exploitable
  in a exposed surface → escalate severity/tier.
- **On failure:** Skip.

### OpenTofu drift

- **Look at:** Drift detected by scheduled OpenTofu / Terragrunt jobs or reports
  under known infra paths (`terraform/` context).
- **How:** Read job logs / reports if present; do not apply. Skip if no signal.
- **Default tier:** medium → 2; high if prod-facing infra drift.
- **On failure:** Skip.

### Context

- **Look at:** `<!-- drift: -->` markers, broken links, discovery parity.
- **How:**
  `python3 .agents/skills/reconcile-context/scripts/check_links.py`;
  `python3 .agents/skills/reconcile-context/scripts/check_discovery.py`.
- **Default tier:** 2.
- **On failure:** If scripts error, report the error; omit fabricated drift
  briefs.

### Open MRs

- **Look at:** Threads, failing CI, conflicts on open MRs.
- **How:** GitLab MCP MR list / discussions / pipeline status.
- **Default tier:** 3. Gate: clear these before tier 4–5 feature work.
- **On failure:** Skip; do not invent `watch-mr` skill calls (Wave 5). Suggest
  manual MR triage or SRE/parent until `watch-mr` exists.

### k8sgpt

- **Look at:** Analysis findings from the in-cluster analyzer.
- **How:** k8sgpt MCP (`analyze`, `list-*`) read-only; triage → prefer
  `file-issue` over silent implement.
- **Default tier:** After triage — often 2/4; promote to 1 if prod breakage.
- **On failure:** Skip if unavailable.

## Output format

1. **Ranked list** — tier, severity, one-line title, source, gate notes /
   scout skips.
2. **Launch briefs** — pasteable blocks for eligible rows (template above).
3. **Empty queue** — if nothing eligible:

```text
find-work: empty queue — no eligible Launch briefs; stopping.
```

Then stop.

## Homelab constraints

- Never `git commit` / push (operator commits).
- Never cluster-mutate as part of find-work.
- Never put secrets in briefs or reports.
- GitOps manifests remain SoT for tunable config; Gateway API only; 1Password
  Item CRs for secrets — flag violations as candidates, do not "fix" them here.
- Advice ≠ implement: consultative operator language → options only until they
  pick a brief.
- Stop-loss still applies to scout retries (3 identical failures → surface and
  skip that scout).
