# OpenClaw

Dormant namespace kept for a future OpenClaw harness on kagent 1.0. The
kagent 1.0 API removed the `openclaw` AgentHarness backend upstream (zero
openclaw paths in the v1.0.1 tree), and the old `AgentHarness/openclaw` had
been READY=False for 115 days — the CRs are deleted (agentharness.yaml,
rbac-ate-api.yaml, modelconfig.yaml in git history).

> **Navigation**: [← Back to AI Applications README](../README.md)

## What remains

- `Namespace/openclaw` — dormant (no workloads)
- `OnePasswordItem/openclaw-harness-secrets` — litellm-api-key field stays
  valid for any future harness
- `authentik-blueprint.yaml` — Authentik bookmark application (points at the
  retired harness gateway URL; the companion `openclaw-cleanup` blueprint in
  the authentik namespace removes the orphaned provider/outpost)

Reactivation would be a BYO-harness / ACP reinvestigation once an image
exists that implements the kagent 1.0 harness contract (none does today).
No open issue tracks it — this README is the record.

## References

- [OpenClaw Documentation](https://docs.openclaw.ai)
- [kagent](../kagent/README.md) / [substrate](../substrate/README.md)
