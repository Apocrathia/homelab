# activity-recap — one-line recaps for the session list

`index.ts` records a one-line summary of each agent turn (the
last-activity shown by the session picker).

The recap source is picked defensively: header lines (ending ":"),
ack/short fillers ("ok", "done", "understood", ...), and sub-20-char
lines are skipped before choosing, so a rhetorical header or an ack
never becomes the recap (S1 review, 2026-09-19). Long answers truncate
at MAX_RECAP_CHARS on a word boundary.

No configuration; pure logic.
