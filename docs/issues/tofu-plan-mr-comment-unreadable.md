---
title: "tofu-plan MR comment is unreadable (ANSI escapes + per-line unit prefixes)"
kind: bug
status: open
severity: medium
source: human
found_at: 2026-07-25
found_by: operator
area: agents
slice: afk
---

# tofu-plan MR comment is unreadable

## Problem / desired state

The `tofu-plan` job posts the raw `terragrunt run --all -- plan` capture into the
`Full Plan Output` block of its MR comment. Two properties of that capture make
the comment unnavigable:

- **Terragrunt log color is never disabled.** `-no-color` is passed to `tofu`,
  but terragrunt colors its own log prefix. GitLab renders the comment as
  markdown, drops the `ESC` byte, and leaves the escape sequences as literal
  text in the left margin.
- **Every line carries a log prefix.** `HH:MM:SS.mmm STDOUT [unit] terraform:`
  precedes each line, and units run in parallel, so no single unit's plan
  appears as a contiguous block.

Desired state: the comment shows a per-unit section. Units with resource changes
render expanded, readable plan text. Units with no changes collapse to one status
line. Provider init and refresh boilerplate does not appear.

## Repro

1. Open an MR that touches `terraform/**`.
2. Read the `🏗️ OpenTofu Plan` comment posted by the CI bot and expand
   `Full Plan Output`.

Observed on <https://gitlab.com/Apocrathia/homelab/-/merge_requests/3350>
(pipeline `2705625987`, job `15534316774`). Comment body was 180,783 bytes over
1,389 lines: 51,576 bytes of ANSI escape text, 85,148 bytes of log prefix,
~38,000 bytes of actual plan body. The unit under review (`okta/org`) accounted
for 69 of those lines.

## Acceptance

- Comment contains no ANSI escape text and no `HH:MM:SS.mmm LEVEL [unit]`
  prefixes.
- One `<details>` section per unit, titled with the unit path and its plan
  status; sections for units with resource changes are open by default.
- Units reporting `No changes` or output-only diffs render as a single status
  line, not a full section.
- Provider init and state-refresh boilerplate (backend init, provider install
  and signing notices, `Refreshing state...`, `Read complete after`, "compared
  your real infrastructure") is dropped.
- The bpg/proxmox `ipv4_addresses` / `ipv6_addresses` refresh diff on the
  `proxmox/talos-cluster/*` units nests inside its own collapsed block rather
  than sitting inline.
- The existing `Summary` block and `tofu-drift` behavior are unchanged.

## Feedback loop

- `scripts/terraform/tofu-plan-summary.sh self-check` — extend with cases for
  the new render path so prefix stripping and unit grouping fail loudly.
- Feed a captured plan (`.scratch/`) through the render path and confirm byte
  count and per-unit section structure.
- `shellcheck scripts/terraform/tofu-plan-summary.sh`
- Re-run `tofu-plan` on any MR touching `terraform/**` and read the posted
  comment.

## Implementation hint

Post-process at render time, not capture time. `tofu-plan-summary.sh` keys its
`summarize` and `drift-status` logic off the `[unit]` prefix, so the capture must
keep it; add a `render` subcommand that strips and groups, and call it where
`.gitlab/tofu.gitlab-ci.yml` currently interpolates `$PLAN_OUTPUT` into the
`<details>` block.

Set `--no-color` (or `TG_NO_COLOR`) on the terragrunt invocations in
`.gitlab/tofu.gitlab-ci.yml` so the escape sequences never enter the capture.

The terragrunt flags that produce unprefixed output directly (`--log-disable`,
`--tf-forward-stdout`) are not a fit: they remove the `[unit]` prefix the
summary parser needs, and parallel units would still interleave.

## Notes

Job logs can stay verbose — the artifact-side trace is fine. This is about the
MR comment only.
