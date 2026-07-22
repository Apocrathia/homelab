# `.agents/memories/` — Lessons learned

Notes worth keeping across sessions so future agents do not re-learn the same
footgun. This path matches the [.agents Protocol](https://dotagentsprotocol.com/)
`memories/` slot.

## When to write a memory

- A bug or quirk took non-trivial effort to diagnose.
- A chart or service behaves in a surprising way that docs do not make obvious.
- A workaround exists that someone might "fix" without understanding why.
- A decision should stick, with the reasoning attached.

If the lesson is always-on policy, put it in a rule (Cursor `.mdc`) or
[`context/constraints.md`](../context/constraints.md) instead.

## File convention

```text
.agents/memories/<topic>.md
```

Suggested sections: **Context**, **Lesson**, **References**. Keep it short.

## Current memories

| Topic                                                           | Summary                                               |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| [`draft-commit-no-auto-stage`](./draft-commit-no-auto-stage.md) | Propose commit text; stage only if operator asked     |
| [`watch-mr-action-specific`](./watch-mr-action-specific.md)     | Babysit ≠ merge/approve/push; name the exact act      |
| [`grafana-metrics-need-live`](./grafana-metrics-need-live.md)   | Autoresearch Grafana metrics only see applied cluster |
| [`run-loop-cron-scout-only`](./run-loop-cron-scout-only.md)     | In-cluster Cron is scout; no checkout ship path       |
