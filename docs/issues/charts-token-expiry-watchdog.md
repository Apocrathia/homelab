---
title: "GitLab token expiry watchdog — Kustomize token dies 2026-12-10, FluxCD 2026-12-24"
kind: feature
status: open
severity: medium
source: ci
found_at: 2026-09-24
found_by: agent (gitlab job 16722446811 lap)
area: security
slice: hitl
---

# GitLab token expiry watchdog — Kustomize token dies 2026-12-10, FluxCD token 2026-12-24

## Problem / desired state

GitLab project access tokens in this project expire silently, and expired
tokens produce quiet partial outages. Precedent (live-verified 2026-09-24):

- The `GITLAB_TOKEN` CI variable holds project access token "Homelab
  Pipeline" — it **expired 2026-09-04 and nobody noticed for 20 days**. The
  `create-chart-tag` job
  (`.gitlab/chart-tag.gitlab-ci.yml`) failed on every main pipeline; the
  `generic-app-0.0.84` tag never got created; helmrelease version bumps
  referencing the tag would have broken. Rotated that day (new token expires
  2027-09-23 — GitLab's 1-year cap); pipeline green again.

Next on the same gallows (both actively used, verified 2026-09-24 via the
GitLab API):

| Token                     | Expires        | Role / scopes                                          | Consumer                                                                                |
| ------------------------- | -------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| "Kustomize" (id 18273444) | **2026-12-10** | Developer, `api`                                       | `KUSTOMIZE_TOKEN` — kustomize-diff MR comments (`.gitlab/kustomize-diff.gitlab-ci.yml`) |
| "FluxCD" (id 18520898)    | **2026-12-24** | Maintainer, `api`+`read_repository`+`write_repository` | actively used as of 2026-09-24 (MR-automation path)                                     |

Desired: a tiny scheduled CI job that lists project access tokens via the
GitLab API and fails loudly (and/or notifies) before any token crosses a
threshold — e.g. warn ≤30 days, hard-fail ≤7 days — so rotation happens on
schedule, not 20 days after the fact.

## Repro

N/A — feature. The failure mode is demonstrated by history: dead
"Homelab Pipeline" token → 20 days of silent `create-chart-tag` failures
(failed job 16722446811 / pipeline 2880500096, 2026-09-24).

## Acceptance

- A scheduled pipeline runs the watchdog; green today.
- Synthetic red: when any non-revoked token is within the fail threshold, the
  job fails (or notifies) naming the token and its expiry date.
- The watchdog's own credential outlives the tokens it watches (see hint).

## Feedback loop

- CI schedule run log (read-only)
- `glab api projects/67295640/access_tokens` — token list + `expires_at`
  (read-only)

## Implementation hint

`.gitlab/token-expiry.gitlab-ci.yml` following the existing include pattern
(see `.gitlab-ci.yml` → `.gitlab/*.gitlab-ci.yml` includes), scheduled
alongside `tofu-drift`. Script: `glab api`/`curl` the access_tokens list,
compare `expires_at` against thresholds, exit non-zero with the offenders.
Credential note: the job needs a PAT that does not expire before the watched
ones — use the existing long-lived tokens (e.g. "Scorecard", exp 2027-01-19)
or fold this into the standing GitLab service-account token-mint design
(which unlocks never-expiry group-account tokens).

## Notes

- Offered 2026-09-24 at the end of the token-rotation lap (session 01a0d57a):
  "A tiny expiry-watchdog CI job would catch these before they bite; say the
  word and I'll draft it" — never drafted. Related dead-token hygiene from
  that lap: the old expired token row (id 16172376) is inert and can be
  deleted; `create-chart-tag` declares `junit.xml` report artifacts the
  script never writes (harmless noise).
- Token ids, names, and expiry dates are GitLab API metadata, not secrets.

**Next action (gate):** operator word to draft the CI job; pick the
watchdog's own credential (long-lived PAT now vs SA-mint design later).
