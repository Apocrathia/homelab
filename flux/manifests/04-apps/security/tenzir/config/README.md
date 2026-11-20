# Tenzir platform configuration

The v7 configuration content for the `homelab` workspace on
platform.tenzir.com. This directory is the **source of truth**; the
platform's config repository is the deploy target.

## Layout

Same shape the platform expects (`tenzir config clone` output):

- `pipelines/` — deployed pipelines (`.tql`, frontmatter for name/disabled)
- `contexts/` — context declarations (`.yaml`)
- `packages/` — local packages (the `homelab` TQL package)
- `package.yaml` / `package.lock` — the manifest and lock

## Sync

The `tenzir-config-sync` CI job (`.gitlab/tenzir-config-sync.gitlab-ci.yml`)
pushes this directory to the platform on merge to main, via the platform
REST API (draft save + commit). The platform then auto-deploys to the
`core` deployment.

Editing in the platform UI works for drafts, but treat the UI as
read-only: changes there will be overwritten by the next sync from here.

## The v6→v7 transition window

This directory coexists with the v6 tree (`nodes/`, `packages/`,
`detections/`) during the migration: v6 stays the detection plane of
record while v7 builds out and push sources flip one at a time. Both
copies of the homelab package exist on purpose during this window.

**The flip completes when v7 hits GA**: the v6 tree
(`nodes/`, `packages/`, `detections/`, their kustomization wiring,
and the v6 platform tokens in `secret.yaml`) is deleted in a teardown
MR, and this directory becomes the only home of pipeline content.
Until then, treat the v6 half as frozen — every change lands here.

## Auth

The CI variable `TENZIR_PLATFORM_API_KEY` (masked, protected) holds an
API key with `WorkspaceBranch.saveDraft` + `WorkspaceBranch.commitDraft`
on the homelab workspace. Rotate it in 1Password
(`Secrets/tenzir-secrets/saas-platform-mcp-api-key`) and GitLab CI
settings together.

CI sync verified: 2026-11-20T18:00:28.897428Z
