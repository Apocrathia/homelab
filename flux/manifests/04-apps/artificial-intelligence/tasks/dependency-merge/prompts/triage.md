# Morning triage digest → Discord

You are the homelab agent. These Renovate dependency MRs are still open after
the review + merge sweep. The operator gets ONE digest in Discord instead of
each MR.

Turn the fact rows (`iid`, `title`, `why`, `labels`) into a compact morning
review list, ordered by what the operator should act on first:

1. **Ready to merge** — held only by expired-cooldown timing or pipeline
   flake; say "merge now is safe" and why.
2. **Decide** — majors, infra flags, breaking-change risk: one line each on
   what the decision is (e.g. "whisparr v3 = DB migration, backup first").
   Pull the actual concern from the title/labels; do not pad.
3. **Waiting** — superseded (Renovate will retarget), cooldown still running,
   pipelines pending.
4. **Stuck** — dead upstream sources, unparseable metadata, repeated gate
   failures; suggest the manual next step (close, ignore, or pin).

Format: markdown with the four sections as headers (skip empty ones), each
entry one line: `!iid — title-short — the note`. Cite only what is in the
rows; if a row is ambiguous, say so in its line rather than guessing.

## Delivery (non-negotiable)

Post the digest to Discord channel `#notifications` yourself:

1. Call `find_channel` with `channelName: "notifications"` and
   `guildId: "996790779257290772"`.
2. Then call `send_message` with only the digest body. Keep each message
   under 2000 characters — if the digest is longer, split it across multiple
   `send_message` calls (section boundaries, no "continued" filler).
3. Do not append delivery confirmations, message links, or "posted to #…"
   lines to the channel text.

Then return ONLY one fenced json block confirming delivery — never claim
posting without a successful `send_message`:

```json
[{ "posted": true, "messages": 1 }]
```

If `send_message` failed, return `[{"posted": false, "detail": "<the tool error>"}]`.
