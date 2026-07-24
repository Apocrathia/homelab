# Enforcement

Structural enforcement over behavioral instruction. When a failure mode can be
prevented mechanically (hooks, schemas, CI, pre-commit), prefer that over a rule
that only tells the agent not to do it.

## Principle

An instruction in a prompt is what an injection overrides. A hook that
mechanically prevents the action is what an injection cannot override. When
both exist, the hook is the enforcement and the rule is the explanation.

## Homelab mechanisms

| Mechanism            | What it prevents / checks                       | Where                                                             |
| -------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| `check_links.py`     | Broken links on context surfaces                | Pre-commit + CI (`context-links`)                                 |
| `check_discovery.py` | Cursor/Claude symlink drift vs `.agents/`       | Pre-commit + CI                                                   |
| Protected paths rule | Editing high blast-radius paths without confirm | [`.agents/rules/protected-paths.md`](../rules/protected-paths.md) |
| Cursor hooks         | Shell/MCP guardrails, session context           | [`.cursor/hooks/`](../../.cursor/hooks/)                          |
| Pre-commit           | Formatting, context checks, secret hygiene      | `.pre-commit-config.yaml`                                         |
| GitLab CI            | Lint, Trivy, context-links, tofu, …             | `.gitlab/`                                                        |
| Commit hard stops    | Secrets, force-push to main, bad amends         | [`constraints.md`](./constraints.md) + hooks                      |

This repo does **not** use an agent worktrees rule. Agents usually edit the
workspace root; ship is operator-gated via
[`draft-commit`](../skills/draft-commit/SKILL.md).

## Promotion path

```text
Rule (behavioral) → fails 3+ times → Hook (structural) → failures stop
```

Not every rule can be structural (e.g. "answer first"). File writes, discovery
parity, and commit hard stops can and should be mechanical.

## Related

- Learning / promotion from memories: [`learning-loop.md`](./learning-loop.md)
- Retrospective routing: [`retrospective`](../skills/retrospective/SKILL.md)
