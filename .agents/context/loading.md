# When to load what

Start at [`README.md`](./README.md). The routing table in
[`AGENTS.md`](../../AGENTS.md) says where to go next. This file is the skip
list: pull the module your task touches; do not dump the whole `context/`
folder after the README.

| Surface                                               | Load when                                                      | Leave it                                     |
| ----------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- |
| [`constraints.md`](./constraints.md)                  | Any work that could mutate cluster, secrets, or GitOps truth   | Pure Q&A with no edits                       |
| [`traps.md`](./traps.md)                              | Starting non-trivial change or restore                         | One-line typo / comment fix                  |
| [`nomenclature.md`](./nomenclature.md)                | Naming resources, dirs, or apps                                | Names already fixed in the diff              |
| [`tools.md`](./tools.md)                              | Choosing MCP vs CLI, or Flux/kubectl workflow                  | Unrelated prose edits                        |
| [`questions.md`](./questions.md)                      | Clarifying decisions with the operator                         | No open decisions                            |
| [`voice.md`](./voice.md) / [`output.md`](./output.md) | Any substantive reply, or writing docs                         | Pure throwaway one-liners                    |
| Helm / MCP / restore skills                           | Matching deploy or recover tasks                               | Unrelated domains                            |
| `alignment` skill                                     | Scope fuzzy; before a plan or wide manifest change             | Acceptance already clear                     |
| [`development-loop.md`](./development-loop.md)        | Finding / prioritizing work; constant-loop; find-work; ranking | Single-issue implement with clear acceptance |
| `find-work` skill                                     | "what's next" / "find something to do" / start-of-lap ranking  | Operator already handed a scoped brief       |
| `run-loop` skill                                      | Unattended / constant loop; walk Launch briefs                 | One-shot attended implement                  |
| `autoresearch` skill                                  | Idle tier-8 research; approved contract                        | Tiers 1–7 still eligible                     |
| SRE / debug / implement / heavy skills                | After a Launch brief is selected (or operator names that work) | "what's next" ranking-only startup           |
| `manifest-implementer` / `manifest-verifier`          | Changing or checking Flux/Helm YAML                            | Docs-only or incident triage                 |

**Slim startup:** for "what's next" / "find something to do", required load is
`find-work` plus the thin loop context it points at. Do not dump SRE, debug, or
implement skills until a brief is selected. Repo loading owns startup — do not
document third-party always-invoke plugins in portable context (they may be
absent).
