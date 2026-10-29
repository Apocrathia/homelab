---
title: "Doc slop: line length, paragraph size, diagram density — repo-wide cleanup"
kind: spec
status: open
severity: medium
source: review
found_at: 2026-10-29
---

# Doc slop: line length, paragraph size, diagram density — repo-wide cleanup

## Problem / desired state

Operator directive from the !5655 review (2026-10-29): docs carry
lines that wrap 5-10x at reading width, paragraphs too long to read,
and diagrams so dense their mermaid render shrinks unreadable. If a
doc is too much text, it does not get read.

Measured across tracked markdown — 485 files, vendored skills and
generated files excluded:

- 5,399 lines over 80 columns, 1,469 of them over 150
- 620 prose paragraphs longer than 4 wrapped lines
- worst offenders: `docs/research/misp-opencti-deployment.md`
  (255 long lines), `helm/generic-app/README.md` (195, 136 over
  150), `.agents/rules/humanizer.md` (101), `terraform/README.md`
  (91), `scripts/longhorn/README.md` (76)

## Rules (proposed; numbers tunable by the operator)

1. **Line length: 80 columns max** for markdown prose. This is the
   existing house norm and prettier's default `printWidth`.
2. **Paragraph cap: 4 wrapped lines** (about 320 characters of
   prose between blank lines). Break the idea into two paragraphs,
   a list, or a table cell row instead.
3. **Diagram density: split before it shrinks.** A mermaid diagram
   that renders unreadably small is slop; the store-schema precedent
   in !5655 split a 12-entity ER into four small renders grouped by
   plane. House cap: keep one diagram to a handful of entities or
   roughly 40 statements.

Irreducible exceptions (not violations): single markdown-link tokens
(URLs cannot wrap), code/SQL/mermaid statements themselves, and
vendored or generated files. Wide table cells that would force
over-length source lines get restructured into lists — tables
cannot wrap internally, so lists win for long content.

## Enforcement

- Prettier `proseWrap: "always"` with `printWidth: 80` in the repo
  config, landed as one repo-wide reflow MR (`.git-blame-ignore-revs`
  entry for the reflow commit so blame survives). Mechanical,
  automatic, and every future MR inherits it.
- Paragraph and diagram caps get a small local pre-commit hook
  (python; markdown-aware, code-fence aware) so CI fails new fat
  paragraphs and oversized diagrams.

## Acceptance

- [ ] Prettier config merged and the one-time reflow MR landed
- [ ] Paragraph/diagram hook merged; violations fail pre-commit
- [ ] Scan shows zero wrappable lines over 80 columns in tracked
      markdown outside the irreducible classes
- [ ] Zero prose paragraphs over the cap in scope
- [ ] Worst-20 files from the scan reflowed, worst-first, with fat
      paragraphs split by meaning (not just wrapped)

## Feedback loop

- Re-run the scan before/after (command in Notes); the numbers move
  toward zero or the lap is not done.
- `pre-commit run --files <changed>` on every touched doc.

## Notes

- Scan (from repo root): `git ls-files '*.md'` minus vendored
  (`.agents/skills/`) and generated (`.prime/`) paths; count lines
  over 80/150 and paragraphs over 320 characters outside code
  fences. Numbers in this issue come from the 2026-10-29 run.
- Protected paths — `AGENTS.md`/`CLAUDE.md`, `.agents/rules`,
  `.cursor`, `.claude` — need operator confirmation before their
  cleanup edits per protected-paths.
- Adapter-duplicated personas exist under `.agents`, `.claude`, and
  `.cursor`: the same fix must land in every copy.
- Vendored content stays byte-identical (upstream sync rule); the
  caps apply to house-authored docs only.
