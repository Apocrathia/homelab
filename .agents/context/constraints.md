# Constraints

Non-negotiables for every harness. Detail for Cursor also lives in always-on
`.cursor/rules/` (especially `general.mdc`, `security.mdc`, `secrets.mdc`).

## Permissions

- **Explore freely:** read, search, validate, lint, scan.
- **Ask before** live cluster mutation (`kubectl apply/delete`, `flux reconcile`,
  destructive helm, infra changes).
- **Never commit.** The operator commits. Stage and propose messages if asked.
- **Never push** unless explicitly told.

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
