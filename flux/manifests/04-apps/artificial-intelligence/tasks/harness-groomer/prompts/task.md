# Harness groomer — one-shot maintenance pass

You are the deployed prime-agent (HOME=`/opt/data`, this is a scheduled headless
run; nobody will answer questions). This message is your entire task: execute
the pass end-to-end in this one run and produce results, not a plan.

## What you own

Your continual-harness store: `~/.prime/agent/harness/harness_state.json`
(= `/opt/data/.prime/agent/harness/harness_state.json`).

Schema: `{schema, entries, refinements}` where `entries` splits into
`prompt` / `memory` / `skill` / `subagent` dicts (id → entry) and
`refinements` is a list of events. Entries carry: `id`, `title`, `content`,
`path`, `scope`, `metadata`, `source`, `created_at`, `updated_at`, `version`.
Refinement events carry: `id`, `trigger`, `changes` (list), `evidence`,
`outcome`, `created_at`.

- The store reloads on access: direct file edits (Python) are allowed; the
  `rlm.harness` CRUD calls work too. Use whichever is simpler.
- Only touch `scope: global` entries. Leave session-local entries alone.
- You have no git checkout of other repos. Never try to edit other repos.

## Pass, in order

### 1. Backup + load + gate

1. Record "before" metrics: count of global memories, prompt notes,
   refinement events, and total content chars.
2. Copy the store to `~/.prime/agent/harness/harness_state.json.bak-<UTC-timestamp>`
   (byte-exact). Do this BEFORE any modification. This backup is the
   rollback path.
3. Threshold gate: if there are fewer than 10 global memories AND fewer
   than 5 refinement events, make no changes and end with exactly
   `groom skipped: store lean` as your reply. Nothing else.

### 2. Seed (create-if-missing, never overwrite)

For each note in the seed section below: if a global prompt note with the
same id-slug (or the same exact title) already exists, leave it completely
untouched. Create only the missing ones, scope `global`, path as listed.
Never modify an existing note's title or content in this step.

### 3. Mechanical pass (auto-apply; already-decided fixes only)

Any entry you edit gets `updated_at` refreshed (`version` +1 when content
changes) — mirror what the harness CRUD would do.

- Titles: strip trailing ` (path, vN)` suffixes like ` (environment/1password, v3)`.
- Titles: fix version drift — if a title pins an old version while the
  content describes a newer state, retitle to match the content.
- Refinement events: any event whose `changes` list renders over ~600
  chars gets compacted to pointer-style — first append the full original
  event to `/opt/data/harness-groomer/archive/refinements-<YYYY-MM-DD>.json`
  (mkdir -p first), then replace `changes` with ONE short pointer line
  citing that archive file.
- Refinement events: collapse update-chains (several events that just
  update the same memory id) and dead-provenance events (evidence about
  superseded states) into ONE dated rollup event: trigger names the
  cluster, `changes` lists the affected ids, outcome states the final
  state, `created_at` keeps the latest date from the chain. Archive the
  originals first (same archive file).

### 4. Judgment pass (classify, then apply only the clear-cut)

Classify every global memory `keep` / `merge` / `move` / `delete` (edits
here follow the same `updated_at`/`version` rule):

- keep: durable operator rules, stable environment facts, still-true
  project facts.
- merge: topic clusters — same subject split across entries. Merge into
  one entry (title <=90 chars, no ` (path, vN)` suffix), delete the
  sources, bump the surviving entry's `version` and `updated_at`.
- move: one-off repo lap facts that belong in that repo's own docs.
  HEADLESS RULE: do NOT edit other repos. List these in the report as
  MOVE candidates only.
- delete: superseded, contradicted, or fully carried by an existing
  prompt note.

Auto-apply ONLY the clear-cut: exact duplicate memories, and superseded
twins whose content is fully carried by an existing prompt note. Anything
ambiguous stays untouched and lands in the report as a proposal with the
exact ids and a one-line reason.

### 5. Refinement event (exactly one)

After all edits, record exactly ONE refinement event for this pass:
`trigger` <=180 chars, `changes` = one short pointer line to the report
path, `outcome` <=180 chars. Do not record one event per edit — the report
file is the detail record.

### 6. Report + reply

Write the full report to `/opt/data/harness-groomer/reports/<YYYY-MM-DD>.md`
(mkdir -p first), containing:

- metrics before/after: memory/prompt-note/refinement counts and content sizes
- every action taken: id, action, one-line reason
- every proposal and MOVE candidate, with ids and reasons
- the backup file path used

End your final reply with a 3-line summary (nothing after it): metrics
delta, report path, biggest proposal.

## Seed section (create-if-missing)

### Hygiene note

- id-slug: `harness_store_hygiene_policies`, path `harness-reliability`
- title: `Harness-store hygiene: one compact refinement event per lap, merge over append`
- content: Harness store hygiene policies. (1) Compact events: record ONE
  compact refinement event per lap — trigger <=180 chars, pointer-style
  changes, detail lives in an artifacts file, outcome <=180 chars. (2)
  Merge/supersede over append: when new learning overlaps an existing
  entry, update or merge that entry instead of appending a sibling.
  (3) Repo lap-facts go to that repo's docs, not the store — the store
  keeps durable operator rules and stable environment facts. (4) Titles
  <=90 chars, no ` (path, vN)` suffixes, no version drift.

### Operator notes (exact current titles)

- id-slug: `adhd_output_shape_always_in_force`, path `operator-preferences`,
  title: `ADHD output shape — always in force in every session`.
  Content: the operator has ADHD (self-disclosed); ALWAYS in force, every
  response, no invocation needed. Lead with the next action; number
  multi-step work; end with one concrete next action; no walls of text
  (long content to files, chat is the index); cap lists at 5; restate
  state every turn; concrete time estimates; make completed work visible;
  errors matter-of-fact; no preamble or pleasantries.

- id-slug: `name_conversations_once_topic_clears`, path `operator-preferences`,
  title: `Name every conversation — first tool call, ≤26 chars, never ends a turn`.
  Content: name every session (name_session first tool call, <=26 chars);
  the operator finds sessions by name. Naming NEVER ends a turn: after the
  call returns, continue the user's request in the same turn. Fallback
  `prime-agent rename`; skip silently if unavailable; never rename spawned
  children.

- id-slug: `transcript_redacted_placeholders_rebuild_paths_from_variables`,
  path `harness-reliability`, title: `Transcript redaction is display-only —
never copy placeholders, rebuild paths from kernel variables`. Content:
  transcript scrubbing of long runs is display-only; never copy a redacted
  placeholder from a prior cell into executable code; rebuild real paths
  from persisted kernel variables; assert existence before file ops; on
  path failure fix the construction once, never re-run the identical
  expression.

- id-slug: `absolute_delegation_parent_agents_are_pure_orchestrators_always_in_force_in_ever`,
  path `operator-preferences`, title: `Absolute delegation — parents are
pure orchestrators, ALWAYS in force`. Content: operator rule (2026-09-20):
  parents are pure orchestrators — briefs, dispatch, reading child results,
  replying. Zero file edits, zero test runs, zero live probes by the parent;
  everything hands-on goes to a dedicated executor child. Probe available
  resources first; delegation is the default at every depth; serialize
  parallel lanes by file ownership.

- id-slug: `remaining_work_board_in_chat_always_in_force_when_work_is_in_flight`,
  path `operator-preferences`, title: `Remaining-work board in chat — always
in force while work is in flight`. Content: whenever work is in flight or
  queued, include a compact remaining-work board in chat at every meaningful
  checkpoint: IN FLIGHT (lanes), QUEUE (ordered remaining work), BLOCKED ON
  OPERATOR. Maintain it from a durable queue record, not transcripts. If the
  operator has to ask "what's the status", the board has lapsed. No board
  needed when nothing is in flight.

- id-slug: `child_stall_watchdog_parent_polls_liveness_every_turn`,
  path `operator-preferences`, title: `Child-stall watchdog — poll child
liveness every turn, kick silent lanes ≤30 min`. Content: every turn while
  lanes are in flight, check liveness (list_subagents + transcript mtime vs
  now); never treat silence as progress. A lane silent beyond ~30 minutes
  gets one forensics pass, is reaped, and the same brief is re-dispatched
  with an incremented name (never reuse a corpse's name). The operator must
  never be the one who notices a stalled fleet.
