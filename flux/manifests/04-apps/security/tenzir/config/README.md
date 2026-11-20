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

## Auth

The CI variable `TENZIR_PLATFORM_API_KEY` (masked, protected) holds an
API key with `WorkspaceBranch.saveDraft` + `WorkspaceBranch.commitDraft`
on the homelab workspace. Rotate it in 1Password
(`Secrets/tenzir-secrets/saas-platform-mcp-api-key`) and GitLab CI
settings together.
