# Renovate traps

Gotchas mined from upstream known-limitations/troubleshooting plus this repo's
config — nothing invented.

- **Schedule ≠ run time.** `0 */4 * * *` governs when Renovate _applies_
  updates; the operator runs on its own cadence and skips repos whose schedule
  isn't met. Don't expect an MR the minute the window opens.
- **Automerge is one branch per run.** Renovate automerges at most one
  branch/run, and only when the branch is up-to-date with the base. A busy
  base branch throttles automerge; not a fault.
- **`platformAutomerge` is inert here.** Top-level `platformAutomerge: true`
  does nothing while the minor/patch rule keeps `automerge: false`. Don't read
  it as "automerge is on".
- **Regex manager is exact-match.** A `# renovate:` comment missing a named
  group, with an extra space, or one line off stops matching silently → the dep
  stops updating with no error. Diff against `matchStrings` in
  [`renovate.json`](../../../../../../renovate.json).
- **Digests vs tags.** `docker:pinDigests` pins `@sha256`; the "no digest pins"
  rule excludes `version`/`tag`/`imageTag`/`helper_image`/`crossplane-provider`
  fields because there's nowhere to attach `@sha256`. Don't add digest pins to
  those field types.
- **Grouping is deliberate.** "generic-app chart" and "base image digests" are
  grouped because one tag bump touches ~88 HelmReleases / rotates many base
  images at once. Don't "simplify" the groups into per-package MRs.
- **Lineage pins are intentional.** MySQL major is disabled (8.4 LTS lineage —
  26.x needs the 9.x stepping stone); `litellm-database` is forced to `semver`
  because its registry floods non-semver tags. Don't re-enable without the
  operator.
- **Onboarding is off.** `onboarding: false` + `requireConfig: optional` means
  a repo with no `renovate.json` is skipped silently, not onboarded. A
  "Renovate isn't doing anything" report usually means the repo lacks a config
  (or a regex comment drifted).
