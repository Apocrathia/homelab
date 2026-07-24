# Constraints

Non-negotiables for every harness. Detail for Cursor also lives in always-on
`.cursor/rules/` (especially `general.mdc`, `security.mdc`, `secrets.mdc`).

## Permissions

- **Explore freely:** read, search, validate, lint, scan.
- **Ask before** live cluster mutation (`kubectl apply/delete`, `flux reconcile`,
  destructive helm, infra changes).
- **Commit / push:** default is no commit or push. See
  [Commit and ship](#commit-and-ship) below for authorization and hard stops.

## Commit and ship

- **Default:** agents do not commit or push. The operator ships.
- **Authorization:** soft ship language ("ship it", "LGTM", "looks good", "go
  ahead") **or** explicit `commit` / `push` authorizes shipping for that lap.
  Authorization on a different topic earlier in the session does not carry
  forward.
- **Hooks always run.** Never bypass with `--no-verify` or equivalent, even
  when authorized.
- **Hard stops even when authorized:**
  - Secrets / credential-looking files.
  - Force-push to `main` / `master`.
  - Amending someone else's commit, or a commit already pushed.
  - Staging clearly unrelated WIP.
- **Advisory, not a stop:** messy or incomplete-looking diffs — warn, proceed
  if authorized.
- **Attribution (soft):** prefer
  `Co-authored-by: Composer <composer@cursor.com>` on agent-shipped commits;
  missing it is not a hard stop.
- **Ship target + diverged-main recipe:** attended vs autonomous targets, and
  the diverged-main stash/rebase/push recipe, live once in
  [`development-loop.md`](./development-loop.md) and
  [`draft-commit`](../skills/draft-commit/SKILL.md) — do not duplicate here.
- **Ship model:** do not adopt upstream `ship-work` / `self-improve` /
  `clock-out`. Homelab stays on draft-commit + watch-mr + run-loop
  ([`development-loop.md`](./development-loop.md#ship-model)).

## GitOps and platform choices

- Manifests in this repo are the source of truth for tunable config (GitOps).
- **Gateway API only.** No traditional Ingress resources.
- **1Password Item CRs** for secrets, not bare Kubernetes `Secret` manifests as
  the managed source.
- Prefer Prettier + yamllint conventions for YAML/markdown the project already uses.

## Protected paths

Stop and get explicit confirmation before editing:

- `.agents/**`, `.cursor/**`, `.claude/**`, `AGENTS.md`, `CLAUDE.md`
- `talos/**`
- `helm/generic-app/**`
- `flux/manifests/01-bootstrap/**`

Reading these paths is always fine. Operator-initiated requests ("update the
planner", "add a skill") count as confirmation; summarize the change first.

## Failure discipline

- After **three** failed attempts at the same approach, stop and surface what
  failed (see stop-loss rule when using Cursor).
- Do not guess when there are two reasonable interpretations; ask per
  [`questions.md`](./questions.md) (structured tool when available; else one
  prose Ask).
- Advice language ("considering", "what should I do") means **advise only**, do
  not implement until asked.
