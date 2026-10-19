# `tenzir/.agents/`

Agent context local to the Tenzir subtree. This tree is deliberately not
the repo-root [`.agents/`](../../../../../../.agents/) pool: everything
here supports work in the tenzir app folder
([`../README.md`](../README.md)), and the vendored doc skills stay out of
general agent context — agents arrive through the root
[`AGENTS.md`](../../../../../../AGENTS.md) routing row pointing at this
subtree's [`AGENTS.md`](../AGENTS.md).

## Layout

| Path                              | Role                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------- |
| [`context/`](./context/README.md) | Subtree context: what Tenzir is and what runs in this homelab                |
| [`skills/`](./skills/README.md)   | Vendored tenzir documentation skills — generated upstream, never hand-edited |
