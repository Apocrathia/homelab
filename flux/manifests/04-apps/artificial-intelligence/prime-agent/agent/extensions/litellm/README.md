# litellm — LiteLLM gateway model provider

`index.ts` registers the LiteLLM gateway as the model provider and
discovers the live model catalog from it at startup (no local copy;
`/litellm-refresh` re-polls).

## Configuration

- `LITELLM_BASE_URL` — OpenAI-compatible base URL including `/v1`.
  The pod uses in-cluster LiteLLM service DNS; the Mac points at the
  gateway hostname via its environment.
- Auth: the `/login`-written `auth.json` entry wins when present; falls
  back to the `LITELLM_API_KEY` env var (the pod).
- Catalog defaults: 1M context window, 131072 max tokens; the gateway
  fans out to backends (Ollama, vLLM) that reject the `developer` role,
  so supportsDeveloperRole stays false.

The derived catalog caches at `~/.prime/agent/cache/litellm-models.json`;
credentials never persist there.
