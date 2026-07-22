# Tooling

Prefer the smallest tool that answers the question.

## MCP vs CLI

- Prefer MCP when a server is configured for the job (Flux, Grafana, Kubernetes
  inventory, docs) and you need structured reads.
- Prefer Grafana MCP (`query_prometheus`, `query_prometheus_histogram`,
  Loki query/stats) for [`autoresearch`](../skills/autoresearch/SKILL.md)
  runtime metrics — read-only, explicit time ranges; never scrape with
  embedded credentials.
- Prefer GitLab MCP for MR / CI / pipeline reads (`watch-mr`, `find-work` Open
  MRs / CI scouts) over `glab` / raw API when the server is configured.
- Prefer CLI (`kubectl`, `flux`, `helm`, `talosctl`) when you need exact flags,
  pipes, or local render (`helm template`).
- Mutating MCP calls still need the same permission bar as mutating CLI. Ask
  first.

## Common local checks

| Intent                 | Typical command                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Render a chart         | `helm template` into `.scratch/`                                                                                                |
| YAML / markdown format | Prettier; yamllint where the repo already uses it                                                                               |
| Secrets / vulns        | Project scanners (gitleaks, Trivy, etc.) on changed paths                                                                       |
| Context link health    | `python3 .agents/skills/reconcile-context/scripts/check_links.py` (also via `context-links` pre-commit)                         |
| Rank next work         | [`find-work`](../skills/find-work/SKILL.md) (read-only) before implementing; see [`development-loop.md`](./development-loop.md) |
| Draft commit / MR      | [`draft-commit`](../skills/draft-commit/SKILL.md) — draft only; never commit/push                                               |

File gaps under [`docs/issues/`](../../docs/issues/README.md) via
[`file-issue`](../skills/file-issue/SKILL.md). Plans:
[`docs/plans/README.md`](../../docs/plans/README.md). Research (idle-only):
[`docs/research/README.md`](../../docs/research/README.md) /
[`autoresearch`](../skills/autoresearch/SKILL.md).

## Operator interview

Prefer the harness **structured-question / interview tool** when it appears in
the current tool list (discrete options). Full contract:
[questions.md](./questions.md).

Do not search the repo or MCP catalog for a missing interview tool.

## Scratch

Use [`.scratch/`](../../.scratch/README.md) for rendered manifests and dumps.
Do not commit it. Do not stash secrets there.
