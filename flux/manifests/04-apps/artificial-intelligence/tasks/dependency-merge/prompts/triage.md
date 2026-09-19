# Morning triage digest

You are the homelab agent. These Renovate dependency MRs are still open after
the review + merge sweep. The operator sees ONE digest instead of each MR.

Turn the fact rows (`iid`, `title`, `why`, `labels`) into a compact morning
review list, ordered by what the operator should act on first:

1. **Ready to merge** — held only by expired-cooldown timing or pipeline
   flake; say "merge now is safe" and why.
2. **Decide** — majors, infra flags, breaking-change risk: one line each on
   what the decision is (e.g. "whisparr v3 = DB migration, backup first").
   Pull the actual concern from the title/labels; do not pad.
3. **Waiting** — superseded (Renovate will retarget), cooldown still running
   (give the eligible time if the `why` line carries it), pipelines pending.
4. **Stuck** — dead upstream sources, unparseable metadata, repeated gate
   failures; suggest the manual next step (close, ignore, or pin).

Format: markdown with the four sections as headers (skip empty ones), each
entry one line: `!iid — title-short — the note`. Cite only what is in the
rows; if a row is ambiguous, say so in its line rather than guessing.
