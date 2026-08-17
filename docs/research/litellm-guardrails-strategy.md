---
title: LiteLLM guardrails strategy
kind: assessment
status: complete
found_at: 2026-08-17
area: security
---

# LiteLLM guardrails strategy

> Research note (August 2026). Surveyed the LiteLLM guardrail docs (24 pages,
> scraped with our own Firecrawl instance through the LiteLLM MCP broker) and
> validated detector behavior against real traffic patterns after the
> `aws_secret_key` false-positive incident. Follow-ups are proposals until they
> land as issues/plans or in the tree.

## Sources

| Source                            | URL / path                                                                    | Role                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Guardrails quick start            | https://docs.litellm.ai/docs/proxy/guardrails/quick_start                     | modes, `default_on`, `skip_system_message_in_guardrail`, policies intro |
| LiteLLM content filter            | https://docs.litellm.ai/docs/proxy/guardrails/litellm_content_filter          | the guardrail we run today                                              |
| Secret detection (`hide-secrets`) | https://docs.litellm.ai/docs/proxy/guardrails/secret_detection                | detect-secrets-based alternative                                        |
| Guardrail policies                | https://docs.litellm.ai/docs/proxy/guardrails/guardrail_policies              | `policies` + `policy_attachments`, inheritance                          |
| Policy flow builder               | https://docs.litellm.ai/docs/proxy/guardrails/policy_flow_builder             | pipelines, `on_fail`/`on_error` fallbacks                               |
| Policy tags / templates           | https://docs.litellm.ai/docs/proxy/guardrails/policy_tags, …/policy_templates | bundling, prebuilt policy packs                                         |
| Team-based guardrails             | https://docs.litellm.ai/docs/proxy/guardrails/team_based_guardrails           | Enterprise-gated scoping                                                |
| Tool permission                   | https://docs.litellm.ai/docs/proxy/guardrails/tool_permission                 | tool allow/deny + arg patterns, `rewrite` mode                          |
| Sensitive data routing            | https://docs.litellm.ai/docs/proxy/guardrails/sensitive_data_routing          | reroute to on-prem model, sticky sessions                               |
| PII masking v2                    | https://docs.litellm.ai/docs/proxy/guardrails/pii_masking_v2                  | Presidio-backed PII                                                     |
| Prompt injection                  | https://docs.litellm.ai/docs/proxy/guardrails/prompt_injection                | heuristics/similarity/LLM checks (legacy callback)                      |
| LLM-as-a-judge                    | https://docs.litellm.ai/docs/proxy/guardrails/llm_as_a_judge                  | model-graded content checks                                             |
| apply_guardrail endpoint          | https://docs.litellm.ai/docs/apply_guardrail                                  | REST test surface for any configured guardrail                          |
| Test playground                   | https://docs.litellm.ai/docs/proxy/guardrails/test_playground                 | UI testing surface                                                      |
| Guardrail load balancing          | https://docs.litellm.ai/docs/proxy/guardrails/guardrail_load_balancing        | multi-deployment guardrails                                             |
| Prebuilt patterns.json            | github.com/BerriAI/litellm v1.97.0 `litellm_content_filter/patterns.json`     | ground truth for regexes                                                |
| detect-secrets 1.5.0              | pypi, local scratch venv                                                      | plugin behavior validation                                              |
| Live repro                        | ai.gateway.services.apocrathia.com chat/completions                           | confirmed end-to-end masking                                            |

## Hypothesis and setup

- Question: what guardrail posture should the LiteLLM gateway have, given that
  the current `secret-mask` guardrail corrupts agent traffic by masking folder
  paths as AWS secrets?
- In-scope paths:
  `flux/manifests/04-apps/artificial-intelligence/litellm/litellm.yml`
- Traffic profile: mostly agentic engineering sessions (code, diffs, absolute
  paths, git SHAs) via Prime Agent, OpenWebUI, and kagent/A2A.

## What already aligns

- Guardrails live at the gateway, in GitOps, `pre_call`, `default_on: true`.
  Central enforcement is the right shape; the failure is one bad pattern, not
  the architecture.
- MASK (not BLOCK) for credential patterns — agent loops survive masking; a
  hard 400 mid-loop is worse.

## Key findings

### Root cause of the path masking (reproduced live)

- The prebuilt `aws_secret_key` pattern is `\b([A-Za-z0-9/+=]{40})\b`. `/` is in
  the character class, so any 40-char run of alphanumerics and slashes matches.
  Example from this repo:
  `/Users/<user>/Projects/homelab/flux/manifests/04-apps/…` contains the exact
  40-char run `…/Projects/homelab/flux/manifests`, bounded by `/` and `-`.
- Live repro through the gateway: asked gpt-3.5-turbo to echo a repo path; it
  returned `[AWS_SECRET_KEY_REDACTED]` in place of the 40-char run. The mask is
  applied to the request payload in transit; the model then echoes the
  placeholder, so the corruption lands permanently in transcripts — and in
  agent tool calls (observed: a 40-char test key written in a Prime Agent code
  cell arrived at execution pre-masked).
- The other configured patterns (`aws_access_key`, `github_token`,
  `slack_token`, `generic_api_key`, custom JWT regex) require distinctive
  prefixes and produced no path hits in testing.

### `hide-secrets` (detect-secrets) barely false-positives, but is narrow

Validated detect-secrets 1.5.0 plugins against the same corpus:

- Catches quoted, keyword-adjacent secrets:
  `aws_secret_access_key = '<40>'`, `{"awsSecretKey": "<40>"}`.
- Misses unquoted `AWS_SECRET_ACCESS_KEY=<40>` (the AWS plugin regex requires
  quotes around the value) and bare pasted keys (entropy plugins need
  code-like candidate boundaries).
- Zero hits on every path, git SHA, and kebab-case string tested.

### Platform capabilities we are not using

- **Policies + attachments + inheritance** (`policies:`, `policy_attachments:`,
  OSS for `scope: "*"`; team/key attachments are Enterprise). Response headers
  (`x-litellm-applied-guardrails`) expose what ran.
- **Policy flow builder**: ordered pipelines with `on_pass`/`on_fail`/`on_error`
  per step, `modify_response` custom replies, and data chaining between steps.
  This is how you get "fast filter → strict filter on fail" and sane outage
  behavior (`on_error` separate from `on_fail`).
- **`skip_system_message_in_guardrail`** (global or per-guardrail): skips
  `role: system` content for unified guardrails (content filter, Presidio,
  Bedrock, moderation, custom code) on chat/messages routes.
- **`tool_permission`** guardrail: regex allow/deny on tool names and argument
  patterns, with `rewrite` (strip disallowed tools and annotate) as an
  alternative to `block`.
- **`sensitive_data_routing`**: on pattern match, reroutes the request to an
  on-premise model group instead of masking or blocking, with sticky sessions.
  Natural fit for the llm-d/inference-sim stack.
- **`pii_masking_v2`** (Presidio) for real PII entity detection when we need
  it; needs a Presidio service.
- **Test surfaces**: `POST /guardrails/apply_guardrail` runs any configured
  guardrail against arbitrary text (CI-able), plus a UI test playground.
- **Custom regex limits**: `pattern_type: regex` entries support only
  `pattern`, `name`, `action` — no keyword-gating (that exists only for
  prebuilt conditional categories). So context must live inside the regex
  itself, and MASK replaces the whole match span.

## Conclusion

`proven` — the incident is a detector-quality problem, and the platform already
ships the pieces for a layered posture. The prebuilt `aws_secret_key` regex is
unsuitable for code-heavy traffic; detect-secrets alone is too narrow; the
answer is a small set of context-aware custom regexes plus selective use of the
newer guardrail types.

## Recommendations

Proposed posture, in layers. Items 1–3 are the immediate fix; 4–7 are
follow-ups to file as issues (separate lap).

1. **Replace the `aws_secret_key` prebuilt** with two custom regexes,
   validated against real leaks and our path corpus (see appendix):

   ```yaml
   - pattern_type: "regex"
     pattern: '(?:aws_?secret_?(?:access_?)?key|awssecretkey)["''\s]*[:=]\s*["'']?[A-Za-z0-9/+=]{40}["'']?'
     name: "aws_secret_key"
     action: "MASK"
   - pattern_type: "regex"
     pattern: "(?<![A-Za-z0-9/+])(?![0-9A-F]{40}(?![A-Za-z0-9/+]))[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+])"
     name: "aws_secret_key_standalone"
     action: "MASK"
   ```

   The context rule catches assignment/JSON forms; the standalone rule catches
   bare pastes while rejecting runs glued to `/` (paths) and 40-char hex
   strings (git SHAs).

2. **Set `skip_system_message_in_guardrail: true`** in `litellm_settings`.
   System prompts are operator-controlled and path-heavy; skipping them cuts
   both false-positive surface and scan cost.
3. **Keep MASK, not BLOCK, for all credential patterns.** Keep the remaining
   prebuilts as-is (`aws_access_key`, `github_token`, `slack_token`, JWT).
4. **Add `hide-secrets` as a complementary MASK layer** for breadth (Stripe,
   npm, Slack, private keys, JWT) with context-aware detection. Expect it to
   miss unquoted `KEY=value`; that is what layer 1 covers.
5. **Adopt the policy layer explicitly**: one `global-baseline` policy
   (secret-mask set) attached at `scope: "*"`, named guardrails addressable for
   per-request opt-in via the `guardrails: [...]` request field. Defer
   team-scoped attachments (Enterprise) unless we license it.
6. **Spike `tool_permission` and `sensitive_data_routing`** for agent
   governance: tool allow/deny rules with `rewrite` mode, and reroute-on-match
   to the on-prem llm-d model group for sessions that touch secrets.
7. **Build a regression corpus + CI check**: run the appendix corpus through
   `POST /guardrails/apply_guardrail` (or a chat echo probe) on guardrail
   config MRs; assert real leaks mask and paths/shas survive untouched.
8. **Defer** Presidio PII masking, LLM-as-a-judge, and prompt-injection
   callbacks until a concrete traffic need exists; scope them per-request or
   per-policy, never global.

## What not to do

- Do not re-enable the prebuilt `aws_secret_key` anywhere; it will keep eating
  paths.
- Do not BLOCK on credential patterns for agent traffic.
- Do not enable email/phone/SSN masking on the engineering gateway — it
  mangles normal technical conversation for no local benefit.
- Do not run LLM-judge or moderation on every request; cost and latency for
  near-zero marginal safety on internal traffic.
- Do not buy Enterprise for team policies; OSS per-request guardrail
  selection plus `scope: "*"` policies covers a single-operator homelab.

## Appendix: validation corpus

False-positive corpus (must NOT match): absolute repo paths (incl.
`04-apps/` runs), relative paths, kebab-case, dots, `/opt/homebrew/…`,
`/var/lib/kubelet/…`, 40-char hex git SHAs (upper and lower case), short
paths. True-positive corpus (must mask): `AWS_SECRET_ACCESS_KEY=<40>`,
`aws_secret_access_key = '<40>'`, `{"awsSecretKey": "<40>"}`,
`export …`, bare pasted 40-char key. All results reproduced in-session on
2026-08-17; detect-secrets 1.5.0 validated in a scratch venv against the same
corpus.
