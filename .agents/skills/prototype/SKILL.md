---
name: prototype
description: >-
  Build a throwaway prototype to answer a design question. Use when the user
  wants to sanity-check whether a state model or logic feels right, explore what
  a UI should look like, or says prototype or /prototype.
disable-model-invocation: true
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Identify which question is being answered — from the user's prompt, the surrounding code, or by asking if the user is around:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Build a tiny interactive terminal app that pushes the state machine through cases that are hard to reason about on paper.
- **"What should this look like?"** → [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts — getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, default to whichever branch better matches the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked as such.** Prefer [`.scratch/`](../../../.scratch/README.md) for homelab throwaways. If the prototype must sit next to production code for context, name it so a casual reader sees it is not production.
2. **One command to run.** Whatever the project's existing task runner supports — `uv run`, `python`, `pnpm`, etc. The user must be able to start it without thinking.
3. **No persistence by default.** State lives in memory. If the question explicitly involves a database, hit a scratch DB or a local file with a clear "PROTOTYPE — wipe me" name.
4. **Skip the polish.** No tests, no error handling beyond what makes the prototype _runnable_, no abstractions.
5. **Surface the state.** After every action (logic) or on every variant switch (UI), print or render the full relevant state.
6. **Capture it when done.** Fold any validated decision into the real code. Capture the verdict (question + answer) on the related issue or in chat. Prefer leaving throwaway code under `.scratch/` (gitignored) rather than opening a branch — this repo usually works on the workspace root without feature branches.
