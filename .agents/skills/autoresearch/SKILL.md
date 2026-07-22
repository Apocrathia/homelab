---
name: autoresearch
description: >-
  Idle-only tier-8 research lap: run bounded, metric-driven experiments from an
  operator-approved contract; ship writeups under docs/research/ only.
  Experimental code does not enter GitOps. Use when the operator says
  autoresearch, or find-work surfaces a tier-8 Launch brief with a complete
  research contract and tiers 1–7 are empty.
disable-model-invocation: true
---

# Autoresearch

Prove or disprove an **operator-approved** hypothesis with a metric-driven
experiment loop, then ship **findings as docs**. Experimental code is disposable
and never merges into GitOps manifests.

Loop contract:
[`.agents/context/development-loop.md`](../../context/development-loop.md).
Research store: [`docs/research/README.md`](../../../docs/research/README.md).

## What this is and is not

| Is                                                | Is not                                              |
| ------------------------------------------------- | --------------------------------------------------- |
| Metric-driven experiment loop                     | `implement-change` (that ships behavior)            |
| Docs-only ship under `docs/research/`             | Experimental code into `flux/` / `helm/` / `talos/` |
| Idle-only tier 8 (tiers 1–7 empty)                | Invented busywork when the queue has real work      |
| Operator-approved / seeded hypothesis             | Free invention of research topics                   |
| Hard budgets (experiments, wall-clock, allowlist) | Unbounded overnight runs                            |

Recommendations become [`file-issue`](../file-issue/SKILL.md) candidates
**later** — not in the same unattended lap.

## When to use

| Trigger                                    | Gate                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| Launch `Invoke: autoresearch`              | find-work ranked tier 8; tiers 1–7 empty; complete contract |
| Operator says autoresearch / /autoresearch | Agree contract first (or use pre-authorized brief)          |

**Skip when:**

- Any eligible tier 1–7 brief exists
- Research contract incomplete (missing metric / eval / budgets / approval)
- Mode is `scout` (Cron heartbeat) — report seed candidates only; do not loop
- Eval needs cluster mutate or protected-path edits without confirmation
- Slug already exists as `docs/research/<slug>.md` on the default branch

## CRITICAL — never ship experimental code

| Action                                   | Allowed?                                     |
| ---------------------------------------- | -------------------------------------------- |
| Edit `.scratch/research/<slug>/` sandbox | Yes (default in-scope)                       |
| Edit operator-scoped non-protected paths | Yes during loop; **discard** before ship     |
| Edit protected paths                     | Only with explicit operator confirm this lap |
| Cluster mutate / Flux reconcile          | **Never** without explicit ask               |
| `git commit` / push / merge              | **Never** — `draft-commit` handoff only      |
| Stage experimental code in docs ship     | **Never** — docs + experiment JSON only      |

## Budgets (defaults)

Persist in `meta.json` `budgets`. Operator may tighten; do not loosen past these
defaults without explicit ask.

| Budget                  | Default                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| Max experiments         | **12**                                                                 |
| Total wall-clock        | **90 minutes**                                                         |
| Max consecutive crashes | **3** (stop-loss)                                                      |
| Per-eval timeout        | **2×** measured baseline duration (min 10s)                            |
| Eval allowlist          | Grafana MCP reads + local/read-only — see below                        |
| Eval denylist           | `kubectl apply/delete`, `flux reconcile`, mutating MCP, live prod data |

**Eval allowlist:**

| Class                               | Allowed                                                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Grafana (preferred for runtime)** | MCP `query_prometheus`, `query_prometheus_histogram`, `query_loki_logs` / `query_loki_stats` (metric samples), label/metric discovery — **read-only**                                         |
| Local / static                      | `kustomize build`, `kubectl kustomize`, `helm template`, `helm lint`, `yamllint`, `prettier --check`, `trivy fs` / Trivy MCP, Flux MCP **read-only**, `check_links.py` / `check_discovery.py` |

Prefer **Grafana** whenever the hypothesis is about live system behavior
(latency, error rate, CPU, WAL growth, rebuild time, scan cost). Use local
render/scan evals only for static shape claims (manifest size, lint, link
health) where Prom/Loki has nothing useful to say.

**Default in-scope paths:** `.scratch/research/<slug>/` (copy fixtures here).
Never scope the repo root. Never include protected paths unless the operator
confirmed them for this lap.

## Three-phase structure

```
Phase 1: Setup
  → research contract (+ budgets)
  → slug unused on default branch
  → baseline eval (2× timeout)
  → meta.json + writeup stub

Phase 2: Experiment loop (until stop)
  → hypothesis-driven change in-scope only
  → eval → keep / discard / crash
  → log exp-NNN.json; update writeup
  → check proven / disproven / exhausted / budget / interrupt

Phase 3: Ship (docs only)
  → finalize docs/research/<slug>.md + experiments/<slug>/
  → review-loop → reconcile-context (if links) → draft-commit
  → operator commits; recommendations → future file-issue
```

## Phase 1: Setup

Interactive unless a Launch brief carries a **complete pre-authorized**
contract (then skip second confirmation).

### Research contract

| Field                 | What it is                                                                    |
| --------------------- | ----------------------------------------------------------------------------- |
| **Hypothesis**        | Testable claim                                                                |
| **Slug**              | 2–3 kebab-case words; names the topic                                         |
| **In-scope paths**    | Paths experimental edits may touch (sandbox preferred)                        |
| **Eval command**      | How to produce / observe the sample (shell → `run.log`, **or** Grafana MCP)   |
| **Metric name**       | Numeric metric to optimize                                                    |
| **Metric direction**  | `lower` or `higher`                                                           |
| **Expected runtime**  | Approx one eval (e.g. `30s`, `5m`) → drives 2× timeout                        |
| **Metric extract**    | How to get a single number (shell from `run.log`, **or** PromQL/LogQL result) |
| **Grafana** (runtime) | Datasource uid/name, query, range, step — required when metric is live        |
| **Budgets**           | max experiments, wall-clock seconds, allowlist confirmation                   |
| **Approved by**       | Operator (or Launch brief that names approval)                                |

Do **not** change the contract mid-run. Evolve hypothesis → stop, ship partial,
new run.

### Grafana as the metric source

Homelab default for **runtime / perf / capacity** hypotheses. Prefer the
`user-grafana` MCP over scraping Prometheus URLs by hand
([`tools.md`](../../context/tools.md)).

**Workflow per sample:**

1. Discover if needed: `list_prometheus_metric_names` →
   `list_prometheus_label_values` (or Loki stream/stats tools).
2. Query with an explicit time range (never unbounded). Prefer a fixed window
   relative to the experiment (e.g. `now-15m` … `now`, or the soak window in
   the contract).
3. Extract **one number** (instant vector, `avg_over_time`, `histogram_quantile`,
   Loki metric sample count, etc.). Record the query + range in `meta.json` /
   the writeup so the run is reproducible.
4. Optional: `generate_deeplink` Explore URL in the writeup for the operator.

**Contract extras when using Grafana:**

| Field                | Example                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `grafana.datasource` | Prometheus / Loki uid or name                                       |
| `grafana.query`      | PromQL or LogQL that yields a scalar (or extract rule)              |
| `grafana.range`      | e.g. `now-15m` → `now`, step `30s`                                  |
| `grafana.extract`    | Which series / aggregation is the metric if the query returns a set |

**Live cluster caveat:** Grafana only sees what is **running**. Manifest edits
in a sandbox or unapplied working tree do **not** move Prom/Loki numbers.

| Experiment shape                       | How Grafana eval works                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Observational (no config change)       | Query live signals; keep/discard is about interpretation / follow-up issues                                            |
| Config change that needs runtime proof | Operator must **apply** (or approve a mutate) between baseline and each keep candidate; agent still never auto-applies |
| Static / docs / render-only            | Skip Grafana; use local allowlist evals                                                                                |

If Grafana MCP is down or the metric series is missing at baseline → **stop**
and ask the operator (same as a failed local baseline). Do not invent a fake
metric from logs in chat.

### Baseline

1. Resolve GNU `timeout` / `gtimeout` for shell evals (Grafana MCP queries use
   the contract range instead of shell timeout, but still respect wall-clock
   budget).
2. Run eval / Grafana query; record metric + duration (or query wall time).
3. Baseline failure / timeout / unreadable metric → **stop** and ask operator.

Initialize:

```text
docs/research/<slug>.md                  # writeup stub (uncommitted until ship)
docs/research/experiments/<slug>/meta.json
```

Sandbox (optional but preferred):

```text
.scratch/research/<slug>/                # experimental fixtures / throwaway code
```

### `meta.json` schema

```json
{
  "meta": {
    "run_tag": "<slug>",
    "hypothesis": "<claim>",
    "in_scope_paths": [".scratch/research/<slug>/"],
    "eval_command": "<shell or grafana>",
    "expected_runtime": "30s",
    "metric_name": "<name>",
    "metric_direction": "lower",
    "metric_extract": "<shell or grafana.extract>",
    "grafana": {
      "datasource": "<uid or name>",
      "query": "<PromQL or LogQL>",
      "range": "now-15m..now",
      "step": "30s",
      "extract": "<scalar rule>"
    },
    "started_at": "<ISO>"
  },
  "budgets": {
    "max_experiments": 12,
    "wall_clock_seconds": 5400,
    "max_consecutive_crashes": 3
  },
  "baseline": {
    "metric_value": 0,
    "duration_seconds": 0,
    "timestamp": "<ISO>"
  },
  "best": {
    "experiment_id": 0,
    "metric_value": 0,
    "description": "baseline"
  },
  "status": "running",
  "conclusion": null,
  "ended_at": null
}
```

## Phase 2: Experiment loop

One iteration:

1. Read `meta.json` + prior `exp-*.json`.
2. Generate a **hypothesis-driven** change (not random tweaking).
3. Edit **in-scope paths only**.
4. Run eval (shell under 2× baseline-duration timeout, **or** Grafana query
   with the contracted range); extract one metric number.
5. Classify **keep** / **discard** / **crash** (simplicity matters — not metric alone).
6. On discard/crash: revert experimental edits (path-scoped clean; **never**
   `git reset --hard` — that can wipe untracked writeup/logs).
7. Append `exp-NNN.json`; update `best` on improvement.
8. Update the running writeup (still uncommitted).
9. Check stop conditions + budget counters.

**No commits during the loop.** Homelab agents never `git commit`. Keep
experimental diffs local; discard by restoring files.

### `exp-NNN.json` schema

```json
{
  "id": 1,
  "timestamp": "<ISO>",
  "description": "<what this tried>",
  "metric_value": 0,
  "delta_from_baseline": 0,
  "delta_from_best": 0,
  "status": "keep",
  "duration_seconds": 0,
  "error": null
}
```

Redact secrets in `error`. Never paste raw `run.log` into JSON or chat.

### Stop conditions

| Status        | When                                                            |
| ------------- | --------------------------------------------------------------- |
| `proven`      | Hypothesis holds; kept state re-runs ≥2 times with same timeout |
| `disproven`   | Evidence against; no plausible keep path left                   |
| `exhausted`   | Max experiments hit without prove/disprove                      |
| `budget`      | Wall-clock or consecutive-crash budget hit                      |
| `interrupted` | Operator interrupt                                              |

## Phase 3: Ship (docs only)

1. Finalize [`docs/research/<slug>.md`](../../../docs/research/_template.md)
   - `experiments/<slug>/` JSON.
2. Mark seed row `status: complete` in the research README seed table when
   applicable.
3. [`review-loop`](../review-loop/SKILL.md) on the **docs** diff.
4. [`reconcile-context`](../reconcile-context/SKILL.md) if links/routing moved.
5. [`draft-commit`](../draft-commit/SKILL.md) — stage docs only; propose
   `docs(research): <slug> — <one-line conclusion>`.
6. **Stop.** Operator commits. Do not file issues in the same unattended lap
   unless the operator asked.

Cleanup: delete or leave `.scratch/research/<slug>/` (gitignored). Do not leave
experimental GitOps edits in the working tree.

## find-work / run-loop fork

| Surface   | Rule                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------- |
| find-work | Tier 8 only when 1–7 empty + approved seed / open contract + budgets                                |
| run-loop  | `scout` → never invoke; `unattended` → only pre-authorized brief; `attended` → may confirm contract |
| G1 empty  | Empty + **no** approved seed → stop (do not invent research)                                        |

## What not to do

- Invent hypotheses without operator approval / seeded contract
- Run when tiers 1–7 have eligible work
- Mutate the cluster as an “eval” (Grafana reads are fine; apply is not)
- Treat unapplied manifest diffs as if Grafana already observed them
- Commit, push, or merge
- Ship experimental code alongside the writeup
- Change the research contract mid-run
- Tight-loop after budget / stop-loss
- Use Discord as the research archive

## Related

| Path                                                                                  | Role                         |
| ------------------------------------------------------------------------------------- | ---------------------------- |
| [`docs/research/README.md`](../../../docs/research/README.md)                         | Research ledger + seeds      |
| [`tools.md`](../../context/tools.md)                                                  | Grafana MCP vs CLI           |
| [`find-work`](../find-work/SKILL.md)                                                  | Tier-8 briefs                |
| [`run-loop`](../run-loop/SKILL.md)                                                    | Idle fork; scout never loops |
| [`review-loop`](../review-loop/SKILL.md) / [`draft-commit`](../draft-commit/SKILL.md) | Docs ship handoff            |
| [`file-issue`](../file-issue/SKILL.md)                                                | Later recommendations        |
| [`development-loop.md`](../../context/development-loop.md)                            | Loop contract                |
