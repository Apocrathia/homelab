# scheduled-agent-invoke

CronJob template for scheduled multi-turn A2A agent invocation.

## What this template includes

- `cronjob.yaml`: suspended-by-default Job runner with hardened pod security settings.
- `kustomization.yaml`: bundles prompts and Python runner into a `ConfigMap`.
- `prompts/task.md` and `prompts/continuation.md`: first-turn and follow-up prompt content.
- `src/invoke.py`: `a2a-sdk` based multi-turn client that reuses `contextId`.

## Endpoint status

### Current path (in use)

- Uses kagent directly:
  `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/homelab-agent/`
- This is the known-good path for the current template.

### Target path (planned)

- Migrate to LiteLLM A2A gateway:
  `http://litellm.litellm.svc.cluster.local:4000/a2a/homelab-agent/message/send`
- This remains planned work. During prior validation, the deployed LiteLLM service did not expose `/a2a/*` routes, so requests returned `404 Not Found`.

## Implementation note

- Keep the template on kagent until LiteLLM A2A is confirmed available in the deployed chart/image/config.
- For runtime and local-dev details, see `src/README.md`.
