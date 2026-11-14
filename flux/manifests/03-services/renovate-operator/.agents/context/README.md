# `renovate-operator/.agents/context/`

Sixty-second model of the Renovate module, plus the map of context files.
Repo-wide context lives in the root
[`.agents/context/`](../../../../../../.agents/context/README.md); this is the
subtree-local mirror.

## What this is

Renovate is Mend's dependency-update bot. This homelab **hosts** it (the
mogenius `renovate-operator`: CRD-driven, job-per-repo, every 4 hours) and
every `Apocrathia/*` repo **consumes** it via a repo-root `renovate.json`.
One operator, many consumer configs — the consumer contract (presets,
`packageRules`, the `# renovate:` regex managers, the dependency dashboard) is
the reusable half and lives in [`configuration.md`](./configuration.md). Full
host story and manifest wiring: [`../../README.md`](../../README.md).

## Module map

| File                                     | Covers                                              |
| ---------------------------------------- | --------------------------------------------------- |
| [`renovate.md`](./renovate.md)           | What Renovate is + the host/consumer split          |
| [`architecture.md`](./architecture.md)   | Run pipeline, the 4 module types, operator topology |
| [`configuration.md`](./configuration.md) | The `renovate.json` consumer contract (reusable)    |
| [`traps.md`](./traps.md)                 | Gotchas — schedule, automerge, regex manager        |
