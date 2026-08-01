---
title: "Bootstrap 1Password Connect credentials via op CLI"
kind: feature
status: open
severity: medium
source: human
found_at: 2026-08-01
found_by: operator
area: security
slice: hitl
---

# Bootstrap 1Password Connect credentials via op CLI

## Problem / desired state

First-time Connect + operator install still depends on a manual web UI
download of `1password-credentials.json`, local base64 encoding, a second
hand-created API token file, and `kubectl create secret` from paths under
`secrets/`. That is the last heavy break-glass step after Flux Operator
cutover removed most classic gotk bootstrap ceremony.

Desired state: an operator with `op` signed in can materialize the two
bootstrap Secrets in `onepassword-system` directly from vault items (or
Connect-server APIs the CLI exposes), without leaving credential files on
disk longer than the command needs. Documented commands live next to
[`flux/manifests/01-bootstrap/1password/README.md`](../../flux/manifests/01-bootstrap/1password/README.md).

Steady-state secret sync for workloads stays OnePasswordItem / Connect —
this issue is only the chicken-and-egg credentials that stand Connect up.

## Acceptance

- Documented `op`-based flow creates `Secret/1password-credentials` and
  `Secret/1password-token` in `onepassword-system` with the shapes Connect
  and the operator already expect (no GitOps of the secret values).
- README no longer requires keeping long-lived copies under `secrets/` for
  the happy path (break-glass / rotation notes may remain).
- Connect Deployment and operator become Ready after the flow on a clean
  namespace (or documented recreate).
- No credentials, tokens, or `.env` contents in git or issue bodies — vault
  item titles / field labels only.

## Feedback loop

- Dry-run the documented commands against a non-prod Connect server or a
  lab recreate of `onepassword-system` Secrets.
- `kubectl get secret 1password-credentials 1password-token -n onepassword-system`
- Operator + Connect pods Ready; a known OnePasswordItem reaches Ready.
- `prettier --check` on touched markdown.

## Implementation hint

Prefer `op` read/inject into `kubectl create secret … --from-file` /
`--from-literal` (or process substitution) over custom scripts. Confirm
current Connect credential encoding (URL-safe base64) against
[1Password Connect docs](https://developer.1password.com/docs/connect)
and the CLI’s Connect-server helpers before rewriting the README steps.

## Notes

- Related bootstrap tidy after Flux Operator cutover (!3619).
- Out of scope: replacing OnePasswordItem for app secrets; Terraform /
  GitLab CI Connect token wiring (see `docs/plans/tofu-1password-provider.md`).
