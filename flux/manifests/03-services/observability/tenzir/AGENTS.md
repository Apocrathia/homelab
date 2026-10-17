# Tenzir subtree router

Two standalone Tenzir nodes in namespace `tenzir-system`; the core node is
the detection plane. Narrative:
[`.agents/context/tenzir.md`](./.agents/context/tenzir.md); full story and
manifest wiring: [`README.md`](./README.md).

## Routing

Start at the [context hub](./.agents/context/README.md), then open the
module the task needs:

| If you're…                                | Then read                                                    |
| ----------------------------------------- | ------------------------------------------------------------ |
| New to Tenzir in this repo                | [`tenzir.md`](./.agents/context/tenzir.md)                   |
| Touching pipelines, bus, archive, metrics | [`architecture.md`](./.agents/context/architecture.md)       |
| Writing TQL operators or package tests    | [`packages.md`](./.agents/context/packages.md)               |
| Trusting a pipeline, test, or detection   | [`traps.md`](./.agents/context/traps.md)                     |
| Writing TQL or pipeline syntax            | [`tenzir` skill](./.agents/skills/tenzir/SKILL.md)           |
| Normalizing to OCSF classes               | [`tenzir-ocsf` skill](./.agents/skills/tenzir-ocsf/SKILL.md) |

## Vendored skills

Reference docs for this stack, vendored from
[github.com/tenzir/skills](https://github.com/tenzir/skills) @
`a47ab4c6bd0518bf132be3751d95ae7e61468c29` (2026-10-16), Apache-2.0:

| Skill                                                  | Covers                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| [`tenzir`](./.agents/skills/tenzir/SKILL.md)           | Tenzir docs — TQL, operators, functions, integrations, deployment |
| [`tenzir-ocsf`](./.agents/skills/tenzir-ocsf/SKILL.md) | OCSF schema — classes, objects, attributes, profiles              |

Both are generated upstream (synced from tenzir.com docs): never
hand-edit; refresh by re-copying from the pinned-or-newer upstream commit
([refresh procedure](./.agents/skills/README.md)). They are local to this
subtree, not in the repo-root `.agents/skills/` pool, so they never land in
general agent context — agents arrive via the root `AGENTS.md` routing row.
Follow each skill's doc-map links on demand. Folder map:
[`.agents/README.md`](./.agents/README.md).
