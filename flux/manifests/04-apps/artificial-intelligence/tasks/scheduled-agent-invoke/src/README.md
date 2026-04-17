# scheduled-agent-invoke (Python)

Multi-turn kagent A2A using `a2a-sdk` streaming: reads `prompts/task.md` for turn 1, then `prompts/continuation.md` for follow-ups, carrying `contextId` between turns (same model as the Discord bridge).

## Endpoint state

### Current (implemented)

- Transport: direct kagent A2A via `a2a-sdk`.
- Endpoint shape: `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/<agent>/`.
- Works with current CronJob and script flow (`message/send` over multiple turns with `contextId` reuse).

### Desired (future migration)

- Transport: LiteLLM A2A gateway endpoint for the same scheduled task flow.
- Intended endpoint shape: `http://litellm.<ns>.svc.cluster.local:4000/a2a/<agent>/message/send`.
- Status: not enabled in the deployed LiteLLM instance used during validation; route returned `404 Not Found` because `/a2a/*` was not exposed.

### Migration checklist (when revisiting)

1. Verify deployed LiteLLM exposes A2A routes (`/a2a/*`) before changing `A2A_URL`.
2. Confirm any required LiteLLM feature flags/config for A2A gateway are present in Helm values.
3. Switch `A2A_URL` in `cronjob.yaml` to LiteLLM and run a manual Job smoke test.
4. Keep kagent endpoint as rollback until LiteLLM path is proven.

## Layout

- `../prompts/task.md` — first user message (markdown).
- `../prompts/continuation.md` — user message for turns 2..N (markdown).
- `pyproject.toml` / `uv.lock` — uv + `a2a-sdk` + `httpx`.
- `invoke.py` — entrypoint at `/scripts/invoke.py`.

## Environment

| Variable               | Default                    | Description                                                         |
| ---------------------- | -------------------------- | ------------------------------------------------------------------- |
| `A2A_URL`              | (required)                 | Active A2A base URL (currently kagent; planned LiteLLM later)       |
| `PROMPT_PATH`          | `/scripts/task.md`         | First-turn markdown                                                 |
| `CONTINUATION_PATH`    | `/scripts/continuation.md` | Later turns; if missing, a short built-in string is used            |
| `MAX_TURNS`            | `8`                        | Maximum `message/send` calls                                        |
| `MULTITURN_EARLY_EXIT` | `true`                     | If `true`, stop when task `completed` and non-stub text is observed |
| `HTTP_TIMEOUT_S`       | `300`                      | HTTP timeout used by A2A SDK client                                 |
| `ALLOW_LOCALHOST_A2A`  | unset                      | Set `1` for local testing against `127.0.0.1`                       |

Each turn uses a new random `messageId` (UUID). `contextId` is extracted from task updates and reused in later turns.

## Local dev

```bash
cd src
uv sync
uv run ruff format .
uv run ruff check .
MAX_TURNS=2 PROMPT_PATH=../prompts/task.md CONTINUATION_PATH=../prompts/continuation.md \
  ALLOW_LOCALHOST_A2A=1 \
  A2A_URL=http://127.0.0.1:8083/api/a2a/kagent/homelab-agent/ \
  uv run python invoke.py
```

After changing dependencies:

```bash
cd src
uv lock
```
