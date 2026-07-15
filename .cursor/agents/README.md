# `.cursor/agents/` — Cursor discovery for personas

Canonical personas live under [`.agents/agents/<id>/agent.md`](../../.agents/agents/).
Each `.md` file here is a symlink into that tree.

## Current personas

| Persona                     | SoT                                                                 | Purpose                                   |
| --------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `project-planner`           | [agent.md](../../.agents/agents/project-planner/agent.md)           | Clarify → living plan in `.cursor/plans/` |
| `manifest-implementer`      | [agent.md](../../.agents/agents/manifest-implementer/agent.md)      | Flux/Helm/Kustomize edits in-tree         |
| `manifest-verifier`         | [agent.md](../../.agents/agents/manifest-verifier/agent.md)         | Local validation evidence                 |
| `security-analyst`          | [agent.md](../../.agents/agents/security-analyst/agent.md)          | Adversarial security review               |
| `site-reliability-engineer` | [agent.md](../../.agents/agents/site-reliability-engineer/agent.md) | Incidents, obs, Flux health               |
| `documentation-reviewer`    | [agent.md](../../.agents/agents/documentation-reviewer/agent.md)    | Doc standards audit                       |
