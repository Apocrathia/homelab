# Grafana research metrics need a live cluster

## Context

[`autoresearch`](../skills/autoresearch/SKILL.md) prefers Grafana (PromQL /
LogQL) for runtime hypotheses. Experiments often edit manifests in a sandbox or
working tree that Flux has not applied.

## Lesson

Grafana only observes what is **running**. Unapplied diffs do not move metrics.
For config experiments that need runtime proof, the operator must apply (or
explicitly approve a mutate) between baseline and keep candidates. Agents never
auto-apply / `flux reconcile`. Observational queries (no config change) are
fine read-only. Static claims use local evals, not fake Prom numbers.

## References

- [`autoresearch/SKILL.md`](../skills/autoresearch/SKILL.md) — Grafana section
- [`docs/research/README.md`](../../docs/research/README.md)
- [`tools.md`](../context/tools.md)
