# watch-mr permission is action-specific

## Context

[`watch-mr`](../skills/watch-mr/SKILL.md) babysits open MRs (threads, CI,
conflicts). Operators often say "fix the MR" or "babysit !N" without naming
merge, approve, push, or undraft.

## Lesson

Read + report is the default. Mutating GitLab or git requires the operator to
name that **exact** action (merge, approve, retry job, reply, resolve thread,
push, commit). "Babysit" / "fix CI" is not blanket mutate permission. Never
merge or approve unless asked for that act.

## References

- [`watch-mr/SKILL.md`](../skills/watch-mr/SKILL.md)
- [`development-loop.md`](../context/development-loop.md) — tier 3 maintain
