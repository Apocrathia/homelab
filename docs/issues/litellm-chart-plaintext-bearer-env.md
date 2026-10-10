---
title: "litellm-helm envVars renders secret values as plaintext in the Deployment spec"
kind: bug
status: open
severity: high
source: review
found_at: 2026-09-23
found_by: agent (a2a-webhook lap security check)
area: security
slice: hitl
---

# litellm-helm envVars renders secret values as plaintext in the Deployment spec

## Problem / desired state

The litellm HelmRelease wires its secret-bearing env vars through the chart's
`envVars` map via `valuesFrom.secretTargetRef`
(`flux/manifests/04-apps/artificial-intelligence/litellm/helmrelease.yaml`).
The upstream chart (`litellm-helm` 1.104.2) renders every `envVars` entry as a
plaintext `value:` in the Deployment pod template
(`templates/_helpers.tpl`: `range $key, $val := .Values.envVars` →
`value: {{ $val | quote }}`) — the map has no `secretKeyRef` support.

Live-verified 2026-10-10 (`kubectl get deployment litellm -n litellm -o json`):
**9 secret-bearing env vars appear as plaintext values** in the pod template:
`PRIME_A2A_AUTHORIZATION`, `HERMES_A2A_AUTHORIZATION`, `PRIME_API_KEY`,
`LITELLM_MASTER_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`REDIS_PASSWORD`, `HOMEASSISTANT_TOKEN`, `GENERIC_CLIENT_SECRET`. Anyone with
deployment-read RBAC (`kubectl get deploy -o yaml`) sees the A2A bearer
tokens, provider API keys, master key, and OIDC client secret.

The secret _source_ is fine (1Password item `litellm-secrets` via secretTargetRef);
the leak is the render path only.

## Repro

1. `kubectl get deployment litellm -n litellm -o jsonpath='{..containers[0].env}'`
2. Observe the entries above carry `value:` (plaintext), not
   `valueFrom.secretKeyRef`.
3. Chart template proof (pulled chart 1.104.2):
   `templates/_helpers.tpl` env block renders `envVars` as `- name/value`
   pairs with no secretKeyRef branch.

## Acceptance

- The live litellm Deployment pod template carries
  `valueFrom.secretKeyRef` (name: `litellm-secrets`, key: the existing item
  field names) instead of plaintext `value:` for the 9 vars.
- No secret values in the rendered Deployment spec.
- LiteLLM still functions end-to-end: A2A webhook auth round-trips
  (prime-agent + hermes `pong`), providers respond, OIDC login works.

## Feedback loop

- `helm template` / `helm pull` inspect of `litellm-helm` (local, read-only)
- `kubectl get deployment litellm -n litellm -o json` structure check
  (read-only; value lengths, never print values)
- A2A webhook round-trip (`a2a_send` to prime-agent/hermes via the broker)
- litellm health endpoint

## Implementation hint

The chart already supports a clean escape hatch:
`extraEnvVars` is rendered via `toYaml` pass-through, so
`valueFrom.secretKeyRef` works there **with the current chart, no upstream
change**:

```yaml
extraEnvVars:
  - name: PRIME_A2A_AUTHORIZATION
    valueFrom:
      secretKeyRef:
        name: litellm-secrets
        key: prime-a2a-authorization
  # … same shape for the other 8; then drop the matching valuesFrom
  # secretTargetRef entries and envVars keys.
```

Fix options (pick one):

1. Move the 9 vars to `extraEnvVars` secretKeyRef refs (static YAML,
   recommended — works today, no plaintext anywhere, no chart change).
2. Upstream: file `berriai/litellm-helm` for secretKeyRef support in `envVars`.
3. Kyverno mutate policy rewriting plaintext `value:` env entries to
   secretKeyRef on the live object.
4. Accept and document the risk (RBAC-limited deploy read).

## Notes

- Found 2026-09-23 in the a2a-webhook lap child security check (session
  01a0c4ed); session close said "worth a follow-up issue" — never filed.
  Re-verified live 2026-10-10 (dropped-work sweep).
- `environmentSecrets: [litellm-secrets]` already injects every key of the
  item via `envFrom` under the item's own key names (kebab-case) — that path
  is not the leak; the leak is the envVars render.
- No secret values appear in this issue; env var and item field names only.

**Next action (gate):** operator picks the fix path (1–4 above); option 1 is
draftable with zero upstream dependencies.
