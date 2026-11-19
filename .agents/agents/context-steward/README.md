# `context-steward`: context drift detector (persona)

`agent.md` charters a read-only sub-agent that detects agent-context drift
after renames, doc moves, or new modules. It runs the detect steps of the
`reconcile-context` skill and returns proposed edits without touching
protected paths.

> **Navigation**: [← Back to Personas README](../README.md)
