# `renovate-operator/.agents/`

Agent context local to the Renovate module. Deliberately not the repo-root
[`.agents/`](../../../../../.agents/) pool: everything here supports work in
this subtree (hosting the operator) **and** the Renovate consumer contract
used by every `Apocrathia/*` repo. Agents arrive via the root
[`AGENTS.md`](../../../../../AGENTS.md) routing row pointing here; this module
travels with the operator manifests.

## Layout

| Path                              | Role                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------- |
| [`context/`](./context/README.md) | Module context: what Renovate is, host/consumer split, config contract, traps |

No `skills/` yet — the consumer contract is the reusable part today. Skills
(validate-config, triage-failed-run) are a later add.
