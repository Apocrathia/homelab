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
not execute. [`run-loop`](../run-loop/SKILL.md) is the usual unattended parent
that selects a brief and forks.

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
| Operator asks    | "what's next", "find something to do", prioritize     |
| Unattended scout | Cron / scheduled find — report only, no implement     |

For **"what's next" / "find something to do"**: load this skill plus the thin
loop context it points at ([`development-loop.md`](../../context/development-loop.md)).
Do **not** preload SRE / debug / implement skills until a Launch brief is
selected. See [`loading.md`](../../context/loading.md).

Skip when the operator already handed you a single scoped brief. Do not re-scout
tightly in a loop after an empty-queue stop.

## Workflow

```
- [ ] 1. Run available scouts (skip if MCP/kube/CLI unavailable; continue others)
- [ ] 2. Normalize candidates (source, evidence, severity, found_at, constraints)
- [ ] 3. Merge results; note scout skips / dedupe gaps
- [ ] 4. Apply autonomous gates (drop ineligible)
- [ ] 5. Rank by tier → (tier-3 sub-sort) → severity → FIFO by found_at
- [ ] 6. Emit ranked report + Launch briefs for eligible rows
- [ ] 7. Stop — operator/parent selects; do not auto-implement
```

### Scout failure and dedupe

Partial scout failure ≠ invent work. Rules:

- **Skip unavailable scouts** (no MCP, kube, or GitLab auth); continue others;
  list skips in the report.
- **Omit implement-oriented briefs** whose identity or open-MR overlap you
  could not verify. Prefer `Dedupe: unverified` over a confident false
  `not in flight`.
- **MR maintenance (`watch-mr`)** needs GitLab scout data only. When GitLab
  succeeded, maintain-eligible MRs still rank even if Flux/Grafana/Trivy/etc.
  failed.
- When **GitLab failed**, omit `watch-mr` briefs and mark implement / plan /
  `file-issue` rows that need "no open MR on this slice" as
  `Dedupe: unverified` (or omit those briefs).
- Do not invent busywork to replace a failed scout's surface.

## Tiers (debt-first)

| Tier | Class                    | Homelab examples                                                                                                              |
| ---- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1    | Production / correctness | Flux NotReady, firing critical alerts, red CI on default branch, security CRITICAL                                            |
| 2    | Tech debt / architecture | Ready bugs/arch issues, clustered `ponytail:`, context drift markers, stale plans                                             |
| 3    | MR maintenance           | **Maintain-eligible** open MRs only — [`watch-mr`](../watch-mr/SKILL.md); see [Maintain-eligible MRs](#maintain-eligible-mrs) |
| 4    | Issues                   | Ready implement / plan / plan-refresh (not 1–3)                                                                               |
| 5    | Features                 | Ready feature / roadmap work                                                                                                  |
| 6    | Scoping                  | Needs alignment; feature plan stubs                                                                                           |
| 7    | Authoring tail           | New gaps / low-priority plans when 1–6 empty                                                                                  |
| 8    | Autoresearch             | Only when 1–7 empty + approved seed / complete contract + budgets ([`autoresearch`](../autoresearch/SKILL.md))                |

### FIFO within tier

Backlog rows are a **queue**, not a stack. Within the same tier (and, when
severity is an explicit sub-sort, within the same `severity` band), pick
**oldest eligible work first**. Do not prefer the newest issue or the most
recently scouted path.

Order: **tier → (tier-3 sub-sort when applicable) → severity
(`blocker` > `high` > `medium` > `low`) → FIFO by age**.

| Work type              | Primary age                            | Fallback when missing                              |
| ---------------------- | -------------------------------------- | -------------------------------------------------- |
| Issue (plan/implement) | `found_at:` frontmatter (`YYYY-MM-DD`) | First commit that added the file on default branch |
| Plan (no issue link)   | Linked issue `found_at`                | First commit of the plan file on default branch    |
| Open MR (`watch-mr`)   | Oldest head activity / created         | Note `age: unknown` if unavailable                 |
| Alert / Flux / CI      | Signal time from scout                 | Tier + severity only                               |

Sort ascending by resolved age (oldest → rank 1). Rows with `age: unknown`
sort **after** dated rows in the same tier/severity band; note unknown in the
report. After age ties: prefer named paths in the plan; smaller scope last.

### Maintain-eligible MRs

Rank **maintain-eligible** open MRs only under tier 3. Emit `watch-mr` Launch
briefs only for those rows.

**Maintain-eligible** (any one is enough):

- Unresolved discussion threads
- Failing pipeline / required checks on HEAD
- Merge conflicts / non-mergeable state
- Explicit changes-requested / blocking review state (when GitLab surfaces it)

**Not maintain-eligible (merge-ready-only):** clean CI, no conflicts, no
unresolved threads, no blocking review — still list under Open MRs for
visibility, but they do **not** occupy a tier-3 ranking slot, do **not** gate
tiers 4–5, and do **not** get a `watch-mr` brief.

**Tier-3 sub-sort** (then FIFO by oldest head activity within each band):

1. Unresolved threads (higher count first; bot/review threads outrank nit-only
   when counts tie)
2. Blocking review / changes-requested
3. Failing CI on HEAD
4. Merge conflicts / non-mergeable

Record thread count and CI/merge state in **Evidence** for Launch briefs.

## Autonomous gates

Apply after tier sort, severity, and FIFO:

- Tiers 1–2 outrank `watch-mr` / MR maintenance.
- Tiers 4–5 require **zero maintain-eligible** `watch-mr` rows (finish
  in-flight MRs first). Merge-ready-only MRs do **not** count toward this gate.
- When any maintain-eligible MR exists, reserve at least one Launch slot for
  `watch-mr` before tier-4 implement briefs.
- Skip `slice: hitl`, protected-path edits, and `alignment` when unattended
  (fall through to the next eligible brief).
- Skip `status: blocked` / `in-flight` for new implement briefs.
- Cap unattended plan-authoring and `file-issue` briefs at **one each** per
  report; zero when any tier-3 maintain-eligible or tier-4 implement row is
  eligible.
- Partial scout failure → omit unverified implement briefs; mark
  `Dedupe: unverified` (see [Scout failure and dedupe](#scout-failure-and-dedupe)).
- If all briefs ineligible or queue empty → one-line empty-queue report and
  **stop** (do not invent busywork).
- Tier 8 (`autoresearch`) only when tiers 1–7 are empty **and** an approved
  seed / complete research contract exists — never invent hypotheses.

Protected paths (confirm before any future edit; find-work never edits):
`.agents/**`, `.cursor/**`, `.claude/**`, `AGENTS.md`/`CLAUDE.md`, `talos/**`,
`helm/generic-app/**`, `flux/manifests/01-bootstrap/**`.

## Launch brief

Each actionable row must emit a pasteable brief. Discover is read-only; build
only after the brief is selected. Find-work does not create worktrees; the
`Branch:` field is the intended worktree branch for the implement lap.

```text
## Launch N — <title>
- Source: <issue path | alert | Flux object | MR !N>
- Evidence: <paths / queries / links; for MRs include threads/CI/merge>
- Acceptance: <observable done>  (alignment: use Open questions instead)
- Open questions: <bullets; alignment briefs only>
- Feedback loop: <verify command(s); required for implement>
- Research contract: <hypothesis, paths, eval, metric, runtime; autoresearch only>
- Likely paths: <when known from plan/issue>
- Branch: <type/slug | MR source branch | n/a>
- Dedupe: <not in flight | skip:… | unverified>
- Constraints: <protected | HITL | no cluster mutate | …>
- Invoke: <skill or persona>
```

If you cannot name a feedback loop for implement work (`kustomize build`,
`helm template`, Trivy, Flux MCP read, yamllint, …), the work is not scoped →
`alignment` (skip when unattended). Prefer thin slices; one implement lap =
one MR.

### Vertical slices

Scout laps **find** work; they do not own remediation end-to-end. Ranked Launch
briefs are agent-sized vertical slices — docs, review, authoring, plan,
implement, research, reconcile — not implement-only. Sizing contract:
[`.agents/context/vertical-slices.md`](../../context/vertical-slices.md).

**Broad findings default to document:** e.g. whole-repo Trivy CRITICAL/HIGH →
`Invoke: file-issue` (findings ledger). Plan and implement are later laps once
ledger rows exist. Direct `implement-change` only when the finding is already
one slice: named feedback loop + single-PR-sized. Soft heuristic; no hard
numeric cost thresholds.

### Invoke targets

| Situation                    | Invoke                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| File/update a gap            | [`file-issue`](../file-issue/SKILL.md)                                                |
| Scope fuzzy / HITL           | [`alignment`](../alignment/SKILL.md) (skip unattended)                                |
| Context / link drift         | [`reconcile-context`](../reconcile-context/SKILL.md) / `context-steward`              |
| Plan authoring               | [`project-planner`](../../agents/project-planner/agent.md)                            |
| One Launch-brief lap         | [`implement-change`](../implement-change/SKILL.md)                                    |
| Babysit open MR              | [`watch-mr`](../watch-mr/SKILL.md)                                                    |
| Idle research (tier 8)       | [`autoresearch`](../autoresearch/SKILL.md) — only when 1–7 empty + approved contract  |
| Constant / unattended parent | [`run-loop`](../run-loop/SKILL.md) (selects briefs; do not invent busywork)           |
| Local verify / ship handoff  | [`review-loop`](../review-loop/SKILL.md) → [`draft-commit`](../draft-commit/SKILL.md) |
| Ops / prod signal triage     | [`site-reliability-engineer`](../../agents/site-reliability-engineer/agent.md)        |
| Security signal triage       | [`security-analyst`](../../agents/security-analyst/agent.md)                          |
| Manifest implement (domain)  | `manifest-implementer` (usually via `implement-change`)                               |

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

- **Look at:** [`docs/plans/`](../../../docs/plans/README.md) unchecked boxes /
  stubs; also `.cursor/plans/` for IDE drafts.
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

- **Look at:** CRITICAL / HIGH findings (changed paths, image, whole-repo, or
  cluster scan surfaces this session can reach). Keep the full scout catalog,
  including whole-repo scans.
- **How:** Trivy MCP (`scan_filesystem` / `findings_list` / etc.) or project CI
  artifacts — read-only. Prefer cheaper/scoped scans first; whole-repo as an
  explicit escalate when hunting debt.
- **Default tier:** 1 (CRITICAL → blocker; HIGH → high).
- **Default Invoke:** [`file-issue`](../file-issue/SKILL.md) for broad/multi-finding
  results. `implement-change` only when already one vertical slice (named
  feedback loop + single-PR-sized).
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

- **Look at:** Open MRs; classify per [Maintain-eligible MRs](#maintain-eligible-mrs)
  (threads, failing CI, conflicts, blocking review vs merge-ready-only).
- **How:** GitLab MCP MR list / discussions / pipeline status — **light list
  only**; do not deep-dive here (`watch-mr` owns the babysit lap).
- **Default tier:** 3 for maintain-eligible only. Merge-ready-only: visibility
  note, no tier-3 slot, no gate on tiers 4–5, no `watch-mr` brief.
- **Gate:** Clear maintain-eligible MRs before tier 4–5 feature work.
- **Invoke:** [`watch-mr`](../watch-mr/SKILL.md) for maintain-eligible rows.
- **On failure:** Skip; omit `watch-mr` briefs; mark implement / plan /
  `file-issue` overlap checks `Dedupe: unverified` when GitLab was required.
  Do not invent MR triage work.

### k8sgpt

- **Look at:** Analysis findings from the in-cluster analyzer.
- **How:** k8sgpt MCP (`analyze`, `list-*`) read-only; triage → prefer
  `file-issue` over silent implement.
- **Default tier:** After triage — often 2/4; promote to 1 if prod breakage.
- **On failure:** Skip if unavailable.

### Research ledger

- **Look at:** [`docs/research/README.md`](../../../docs/research/README.md)
  seed table (`status: approved`) and open questions in shipped writeups that
  already carry a complete research contract.
- **How:** Read seeds + writeups; emit tier **8** only when tiers 1–7 have
  **zero** eligible rows. Brief must include the full research contract +
  budgets. `Invoke: autoresearch`. Do **not** invent hypotheses or promote
  `status: seed` rows.
- **Default tier:** 8 (idle-only).
- **On failure / no approved seed:** Omit; empty queue if nothing else
  eligible — do not fabricate research work.

## Output format

1. **Ranked list** — tier, severity, age/`found_at`, one-line title, source,
   gate notes / scout skips / `Dedupe` gaps.
2. **Open MRs (visibility)** — maintain-eligible vs merge-ready-only; thread
   counts and CI/merge when known.
3. **Launch briefs** — pasteable blocks for eligible rows (template above).
   Default a few top rows; when maintain-eligible MRs exist, reserve at least
   one `watch-mr` brief before tier-4 implement.
4. **Empty queue** — if nothing eligible:

```text
find-work: empty queue — no eligible Launch briefs; stopping.
```

Then stop.

## Homelab constraints

- **Non-shipping by design:** this skill never commits/pushes, even if soft
  ship language appears in the parent chat. Rank and brief only.
- Never cluster-mutate as part of find-work.
- Never put secrets in briefs or reports.
- GitOps manifests remain SoT for tunable config; Gateway API only; 1Password
  Item CRs for secrets — flag violations as candidates, do not "fix" them here.
- Advice ≠ implement: consultative operator language → options only until they
  pick a brief.
- Stop-loss still applies to scout retries (3 identical failures → surface and
  skip that scout).
