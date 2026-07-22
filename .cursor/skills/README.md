# `.cursor/skills/` — Cursor discovery for skills

Canonical skill bodies live under [`.agents/skills/`](../../.agents/skills/).
Each entry here is a symlink so Cursor can index `SKILL.md` frontmatter.

For when to write a skill and frontmatter conventions, see
[`.agents/README.md`](../../.agents/README.md) and any existing `SKILL.md`.

## Current skills

| Skill                           | SoT                                                                                                           | Purpose                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `alignment`                     | [`.agents/skills/alignment`](../../.agents/skills/alignment/SKILL.md)                                         | Grill-me interview until scope is shared        |
| `file-issue`                    | [`.agents/skills/file-issue`](../../.agents/skills/file-issue/SKILL.md)                                       | File/update gaps under `docs/issues/`           |
| `find-work`                     | [`.agents/skills/find-work`](../../.agents/skills/find-work/SKILL.md)                                         | Rank backlog + signals; emit Launch briefs      |
| `helm-deployment`               | [`.agents/skills/helm-deployment`](../../.agents/skills/helm-deployment/SKILL.md)                             | Deploy Helm/Flux apps end-to-end                |
| `implement-change`              | [`.agents/skills/implement-change`](../../.agents/skills/implement-change/SKILL.md)                           | One Launch-brief lap: plan → implement → verify |
| `mcp-deployment`                | [`.agents/skills/mcp-deployment`](../../.agents/skills/mcp-deployment/SKILL.md)                               | ToolHive MCP → LiteLLM                          |
| `cnpg-logical-database-restore` | [`.agents/skills/cnpg-logical-database-restore`](../../.agents/skills/cnpg-logical-database-restore/SKILL.md) | CNPG logical dump/restore                       |
| `generic-app-longhorn-restore`  | [`.agents/skills/generic-app-longhorn-restore`](../../.agents/skills/generic-app-longhorn-restore/SKILL.md)   | Longhorn restore for generic-app                |
| `draft-commit`                  | [`.agents/skills/draft-commit`](../../.agents/skills/draft-commit/SKILL.md)                                   | Commit/MR handoff; never commit                 |
| `reconcile-context`             | [`.agents/skills/reconcile-context`](../../.agents/skills/reconcile-context/SKILL.md)                         | Sync AGENTS.md + `.agents/context/` drift       |
| `reconcile-docs`                | [`.agents/skills/reconcile-docs`](../../.agents/skills/reconcile-docs/SKILL.md)                               | Behavior docs + delete satisfied issues/plans   |
| `review-loop`                   | [`.agents/skills/review-loop`](../../.agents/skills/review-loop/SKILL.md)                                     | Local verify before draft-commit (≤5 iters)     |

## Adding one

1. Create `.agents/skills/<id>/` (with `SKILL.md`).
2. Symlink for Cursor:
   ```bash
   ln -s ../../.agents/skills/<id> .cursor/skills/<id>
   ```
3. Add a row to the table above.

Claude picks up new skills via the `.claude/skills` directory symlink — no
per-skill Claude link. Parity:
[`check_discovery.py`](../../.agents/skills/reconcile-context/scripts/check_discovery.py).
