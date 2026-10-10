# harness-groomer

Suspended weekly CronJob that sends **one self-contained A2A message into the
deployed prime-agent** (direct in-cluster Service, not the kagent broker)
telling it to groom its own continual-harness store: seed missing hygiene and
operator prompt notes, apply mechanical fixes, classify memories, compact the
refinement ledger, and write a report.

```text
Monday 03:00 America/Denver (09:00 UTC)  ->  POST message/send
  prime-agent pod: fresh `prime-agent -p "<task.md>"` one-shot session
  server.mjs answers `working` after 120s  ->  runner polls tasks/get (~30s)
  report -> /opt/data/harness-groomer/reports/<date>.md on the prime-agent PVC
```

The runner (`src/invoke.py`) is the family template minus multi-turn, plus
bearer auth and long-poll — prime-agent's webhook runs a **fresh one-shot
session per message** (`contextId` resumes nothing), so re-sends would launch
duplicate groomer runs; the send itself is capped at 120s server-side, so a
groomer run always needs the `tasks/get` poll loop.

## Enable

`spec.suspend: true` ships by default. To enable after review:

```bash
# GitOps: flip suspend in this file, commit, let Flux reconcile
kubectl create job --from=cronjob/harness-groomer harness-groomer-smoke -n agent-tasks  # manual smoke
```

Flip `suspend: false` in `cronjob.yaml`, commit, and Flux rolls it out; a
manual smoke Job can run the same image first without waiting for Monday.

## What the groomer does (one pass, in order)

1. **Backup** the store (`harness_state.json.bak-<timestamp>`) before any
   modification, then load global-scope entries.
2. **Gate**: under 10 memories AND under 5 refinement events → reply
   `groom skipped: store lean`, change nothing.
3. **Seed** the hygiene + 6 operator prompt notes (embedded in
   `prompts/task.md`): create-if-missing, never overwrite.
4. **Mechanical pass**: strip `(path, vN)` title suffixes, fix version-drift
   titles, compact over-long refinement events (pointer-style, originals
   archived to `/opt/data/harness-groomer/archive/`), collapse update-chains
   and dead-provenance events into one dated rollup.
5. **Judgment pass**: classify memories keep/merge/move/delete. Auto-applies
   only exact duplicates and superseded twins fully carried by a prompt note;
   everything else becomes a proposal in the report. MOVE-grade memories
   (one-off repo lap facts) are **reported, not moved** — the groomer is
   headless and must not edit other repos.
6. **One compact refinement event** for the pass (trigger ≤180 chars,
   pointer-line changes, outcome ≤180) and a full report at
   `/opt/data/harness-groomer/reports/<date>.md`; the reply ends with a
   3-line summary.

## Secrets

`secret.yaml` is a OnePasswordItem CR (family pattern) pointing at the
existing `vaults/Secrets/items/prime-agent-secrets` item; the
`a2a-webhook-token` field (same token the LiteLLM broker sends as
`prime-a2a-authorization`) becomes `harness-groomer-secrets/a2a-webhook-token`
in `agent-tasks`, wired as the `Authorization: Bearer` header on every runner
request. The webhook is fail-closed: missing or wrong token → 401 → job exit 1.

## Rollback

The groomer never edits anything but its own store; the prime-agent pod owns
no other state here. If a pass misjudges:

```bash
kubectl exec deploy/prime-agent -n prime-agent -- \
  cp /opt/data/.prime/agent/harness/harness_state.json.bak-<timestamp> \
     /opt/data/.prime/agent/harness/harness_state.json
```

The store reloads on next access; pick the `.bak-<timestamp>` from the run's
report header. No cluster-wide blast radius: the job holds no RBAC beyond a
token-less ServiceAccount.

## Configuration

| env               | default                                                 | notes                                              |
| ----------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `A2A_URL`         | `http://prime-agent.prime-agent.svc.cluster.local:8080` | direct webhook, no broker                          |
| `PROMPT_PATH`     | `/scripts/task.md`                                      | the self-contained groomer instruction             |
| `HTTP_TIMEOUT_S`  | `300`                                                   | per-request timeout (send cap is 120s server-side) |
| `POLL_INTERVAL_S` | `30`                                                    | tasks/get backoff                                  |
| `POLL_DEADLINE_S` | `2100`                                                  | 35 min poll ceiling, under the 3600s job cap       |

Runner dev checks (mock of the server.mjs wire):

```bash
cd src
uv sync
uv run python selfcheck.py   # completed/failed/deadline/401 round-trips
uv run ruff format . && uv run ruff check .
```
