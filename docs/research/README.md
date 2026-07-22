# Homelab research ledger

In-repo research writeups and experiment logs. Chat is not the archive.
Research **persists** after ship (unlike issues/plans). Experimental code does
not.

Skill: [`autoresearch`](../../.agents/skills/autoresearch/SKILL.md).
Loop: [`development-loop.md`](../../.agents/context/development-loop.md).

## Research vs issues vs plans

| Surface          | Holds                                                             |
| ---------------- | ----------------------------------------------------------------- |
| `docs/issues/`   | **What** — desired state; delete-on-ship                          |
| `docs/plans/`    | **How** — steps; delete-on-ship                                   |
| `docs/research/` | **Findings** — assessments + experiment logs; **keep** after ship |

Recommendations in a writeup become [`file-issue`](../../.agents/skills/file-issue/SKILL.md)
candidates later — not silent GitOps changes.

## Layout

```
docs/research/
  README.md              # this file
  _template.md           # copy for new writeups
  <slug>.md              # durable writeup (kebab-case)
  experiments/
    <slug>/
      meta.json          # contract, baseline, best, status
      exp-001.json       # one file per iteration
      ...
```

Skip `README.md` and `_template.md` when enumerating writeups.

## Kinds

| Kind         | When                                    | Ships                           |
| ------------ | --------------------------------------- | ------------------------------- |
| `assessment` | External survey / spike; no metric loop | Writeup only                    |
| `experiment` | Metric-driven autoresearch loop         | Writeup + `experiments/<slug>/` |

## Lifecycle

```
operator-approved seed / Launch brief with full contract
  → setup (baseline + meta.json + writeup stub)
  → experiment loop (bounded)
  → proven | disproven | exhausted | budget | interrupted
  → finalize writeup + JSON logs
  → review-loop → draft-commit (docs only) → operator commit
  → recommendations → future file-issue (separate lap)
```

**Not delete-on-ship.** Writeups and experiment JSON stay on the default branch
as the durable record. Only derived issues/plans delete when implemented.

## Idle-only (tier 8)

[`find-work`](../../.agents/skills/find-work/SKILL.md) may emit an
`Invoke: autoresearch` brief **only** when:

1. Tiers 1–7 have **zero** eligible rows
2. A seed is `status: approved` (or a Launch brief carries a complete contract)
3. Budgets are present (defaults in the skill)

Empty queue **and** no approved seed → empty-queue stop. Do not invent
research.

`run-loop` mode=`scout` never runs the experiment loop — it may only surface
seed candidates in the Discord/lap report.

## Seed backlog (operator approval required)

Hypotheses start as `seed`. Agents do **not** promote them. Operator sets
`approved` (and optional `approved_by`) before find-work may emit tier 8.

| Title                                                      | Slug (proposed)         | Status | Approved by | Metric hint    |
| ---------------------------------------------------------- | ----------------------- | ------ | ----------- | -------------- |
| Flux dependency ordering vs HelmRelease install latency    | `flux-hr-latency`       | seed   |             | Grafana PromQL |
| Longhorn replica count vs rebuild time on single-node loss | `longhorn-rebuild`      | seed   |             | Grafana PromQL |
| Gateway API HTTPRoute timeout vs SSE/long-poll apps        | `httproute-sse-timeout` | seed   |             | Grafana + Loki |
| CNPG logical backup window vs WAL disk growth              | `cnpg-wal-growth`       | seed   |             | Grafana PromQL |
| Trivy Operator scan interval vs control-plane CPU          | `trivy-scan-cpu`        | seed   |             | Grafana PromQL |

Statuses: `seed` | `approved` | `running` | `complete` | `dropped`.

## Authoring rules

| Situation                        | Action                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| New assessment (no metric loop)  | Copy `_template.md` → `docs/research/<slug>.md`; `kind: assessment` |
| New autoresearch run             | Need approved seed + contract; follow `autoresearch` skill          |
| Duplicate slug on default branch | Pick a new slug; do not overwrite a shipped writeup                 |
| Secrets                          | Never — redact eval errors; no tokens in JSON or prose              |

## Metrics

Prefer **Grafana** (PromQL / LogQL via Grafana MCP) for runtime hypotheses —
latency, error rate, CPU, WAL growth, rebuild time, scan cost. Local render /
scan evals are for static claims only. Grafana only sees the **live** cluster;
unapplied manifest edits do not move metrics (operator apply between keeps when
needed). Details: [`autoresearch`](../../.agents/skills/autoresearch/SKILL.md).

## Homelab constraints

- Agents never `git commit`. Ship stops at `draft-commit`.
- No cluster mutate without explicit ask; Grafana evals are **read-only** MCP.
- Protected paths need confirmation before experimental edits.
- Experimental code lives under `.scratch/research/<slug>/` by default and
  is discarded; it must not land in the docs ship.

## Related

- [`autoresearch`](../../.agents/skills/autoresearch/SKILL.md)
- [`find-work`](../../.agents/skills/find-work/SKILL.md)
- [`file-issue`](../../.agents/skills/file-issue/SKILL.md)
- [`docs/issues/README.md`](../issues/README.md)
- [`docs/plans/README.md`](../plans/README.md)
