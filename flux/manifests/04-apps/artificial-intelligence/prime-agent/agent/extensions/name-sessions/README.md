# name-sessions — every session gets a name (operator rule)

`index.ts` registers the `name_session` tool and, while a session is
unnamed, appends the naming directive to every turn's system prompt.

- 26-character limit (the session-picker title column truncates
  longer).
- Name style: a lowercase topic slug for the app/component/task.
  Over-limit names get an error proposing a compliant truncation — take
  it and move on.
- Naming never ends a turn: the directive, tool description, and every
  tool result repeat it — after `name_session` returns (success or
  error), the agent continues the user's request in the same turn
  (2026-09-18 incident hardening: models cannot count characters, so
  the limit uses a word-length heuristic instead).

`rlm.spawn` children are named at spawn and never see the directive.
