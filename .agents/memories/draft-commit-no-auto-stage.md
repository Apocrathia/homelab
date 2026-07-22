# draft-commit does not auto-stage

## Context

Loop ship paths (`implement-change`, `autoresearch`, `development-loop`) hand
off to [`draft-commit`](../skills/draft-commit/SKILL.md). Early wording said
"stage docs only" / "stage + commit draft", which reads like agents should
`git add` without asking.

## Lesson

`draft-commit` **proposes** a Conventional Commit message (and optional draft
MR body). Run `git add` / stage **only** when the operator explicitly asked to
stage. Commit/push follow ship authorization
([`constraints.md#commit-and-ship`](../context/constraints.md#commit-and-ship))
— never assume it carries over from earlier in the session. Docs-only research
laps follow the same rule.

## References

- [`draft-commit/SKILL.md`](../skills/draft-commit/SKILL.md)
- [`development-loop.md`](../context/development-loop.md)
- [`autoresearch/SKILL.md`](../skills/autoresearch/SKILL.md)
