---
name: review-loop
description: >-
  Local verify loop before draft-commit: format, lint, link/discovery checks,
  helm/kustomize renders, Trivy on changed paths. Cap ~5 iterations. Use after
  implement and reconcile, before proposing a commit.
disable-model-invocation: true
---

# Review loop

Local verify before draft-commit. Run what applies to the diff; skip irrelevant
checks. Cap **~5** review iterations total, then surface blockers.

Deeper evidence when manifests are non-trivial: hand off to
[`manifest-verifier`](../../agents/manifest-verifier/agent.md).

Loop context:
[`.agents/context/development-loop.md`](../../context/development-loop.md).

## Non-Cursor / optional reviewers

Homelab SoT for this skill is the **local GitOps gate table** below (Prettier,
yamllint, helm/kustomize → `.scratch/`, Trivy, context checks). That is enough
for a clean pass.

For a deeper read-only review after local gates are green, run the lens skills
[`review-correctness`](../review-correctness/SKILL.md),
[`review-security`](../review-security/SKILL.md), and
[`review-fit`](../review-fit/SKILL.md) in parallel (fresh context each), then
triage findings per [`subagents.md`](../../rules/subagents.md).

If Macroscope, Codex CLI, or Cursor Bugbot are available, you may run them as
**extra** reviewers after local gates are green. They are optional. Without them,
do not invent a Macroscope/Bugbot/Codex loop — hand off to
[`draft-commit`](../draft-commit/SKILL.md). Non-Cursor harnesses run the local
checks directly in the shell (no Task orchestration required).

## Hard rules

- **This skill does not ship.** Never `git commit` / push here — hand off to
  [`draft-commit`](../draft-commit/SKILL.md) (ships only when authorized; see
  [`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship)).
- **Never** cluster-mutate (`kubectl apply` / `delete`, `flux reconcile`,
  mutating MCP, etc.). Read-only cluster queries are fine when useful.
- **Stop-loss:** after **3 identical failures** of the same approach, stop and
  surface (repo stop-loss). Do not burn the 5-iter budget on the same broken
  command.
- Cap **5** review iterations (fix → re-check cycles). On the 5th miss, stop
  with blockers — do not invent a 6th pass.

## When to run

- After implement (+ usually after `reconcile-docs` / `reconcile-context`).
- Before `draft-commit` (when that skill exists).
- When the operator asks "is this green locally?"

Skip when the operator already handed verify evidence and only wants a ship
proposal.

## Workflow

```
- [ ] 1. Diff scope — git status / diff; list paths that matter
- [ ] 2. Run applicable checks below (skip N/A)
- [ ] 3. Fix only failures caused by this change (ponytail: no drive-by)
- [ ] 4. Re-run failed checks; count iterations
- [ ] 5. Pass → brief Evidence report; Fail after stop-loss/5 → Blockers
```

## Checks (run what applies)

| When                                         | Check                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Touched formatted sources (md/yml/…)         | Prettier / project formatters (`prettier -w` on changed files; then `--check`)                        |
| Touched YAML                                 | yamllint on touched YAML                                                                              |
| Touched `AGENTS.md` / `.agents/` / discovery | `python3 .agents/skills/reconcile-context/scripts/check_links.py` + `check_discovery.py`              |
| Touched Helm / Flux / Kustomize manifests    | `helm template` and/or `kustomize build` (or `kubectl kustomize`) into `.scratch/`                    |
| Touched manifests or package deps            | Trivy (or project scanner) on **changed paths** — fix only scanner-desired versions for _this_ change |

Skip rows that do not match the diff. Tool missing / unavailable → note skip;
do not invent green.

Put bulky render output under [`.scratch/`](../../../.scratch/README.md), not
in chat.

For a heavier manifest pass (multi-chart, unclear breakage), invoke
`manifest-verifier` instead of re-deriving its process here.

## Iteration / stop-loss

| Limit                           | Action                                                               |
| ------------------------------- | -------------------------------------------------------------------- |
| Same check fails 3× identically | Stop that approach; report verbatim errors; propose next tactic only |
| 5 review iterations total       | Stop; list remaining blockers; do not start iteration 6              |

Cosmetic flag tweaks on the same failing command count as the same approach.

## Output format

```markdown
## Review loop

**Scope:** <paths / change summary>

**Checks run:**

- <check> — pass | fail | skipped (<why>)

**Iterations:** <n> / 5

**Evidence:** <commands + outcomes; bulky logs → .scratch/ paths>

**Blockers:** <none | list>

**Ready for draft-commit:** yes | no
```

## Homelab constraints

- This skill does not ship (no commit/push). Ship via `draft-commit` when
  authorized — [`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship).
- Never cluster-mutate as part of review-loop.
- Fail loud on scanner/tool errors or timeouts — do not assume success.
- Security: after dep/manifest changes, scan changed paths; apply only
  scanner-recommended fixes scoped to this change; re-scan after fixes.
