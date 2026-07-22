# `.agents/rules/`

Portable behavioral rules (Markdown). Cursor discovers them via per-file
`.mdc` symlinks under [`.cursor/rules/`](../../.cursor/rules/README.md)
(SoT is `.md` here; discovery name stays `.mdc`). Domain GitOps rules (Flux,
Helm, Talos, …) stay as real `.mdc` files under `.cursor/rules/`.

## Always-on

| File                    | Summary                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `general.md`            | Personality, hard non-negotiables, cross-cutting decisions  |
| `security.md`           | Scan-on-change + core security principles                   |
| `protected-paths.md`    | Confirm before editing high blast-radius paths              |
| `stop-loss.md`          | After 3 failed attempts at the same approach, stop          |
| `clarify-dont-guess.md` | Ask when ambiguous; advice vs action; permission discipline |
| `question-format.md`    | AskQuestion-first; points at `context/questions.md`         |
| `response-shape.md`     | Short replies; half-screen rule                             |
| `subagents.md`          | Prefer defined personas                                     |
| `ponytail.md`           | YAGNI / minimal-code + surgical touch discipline            |

## Glob-scoped (portable)

| File           | Glob      | Summary                           |
| -------------- | --------- | --------------------------------- |
| `humanizer.md` | `**/*.md` | Strip AI writing patterns in docs |

Edit files here, not the `.cursor/rules/` symlinks. After adding a portable
rule, add `<name>.mdc` → `../../.agents/rules/<name>.md` under `.cursor/rules/`
and update both this README and
[`.cursor/rules/README.md`](../../.cursor/rules/README.md).
