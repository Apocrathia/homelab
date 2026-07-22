# run-loop-agent-invoke (Python)

Multi-turn kagent A2A using `a2a-sdk` streaming: reads `prompts/task.md` for
turn 1, then `prompts/continuation.md` for follow-ups, carrying `contextId`
between turns (same model as `scheduled-agent-invoke`).

Prompts are scout-only (`find-work` + `run-loop` mode=`scout`). The runner does
not interpret mode — guardrails live in the prompt text.

## Endpoint

- Transport: direct kagent A2A via `a2a-sdk`.
- Endpoint:
  `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/homelab-agent/`

## Layout

- `../prompts/task.md` — first user message (scout).
- `../prompts/continuation.md` — turns 2..N (stay on scout path).
- `pyproject.toml` / `uv.lock` — uv + `a2a-sdk` + `httpx`.
- `invoke.py` — entrypoint at `/scripts/invoke.py`.

## Environment

| Variable               | Default                    | Description                                                         |
| ---------------------- | -------------------------- | ------------------------------------------------------------------- |
| `A2A_URL`              | (required)                 | Active A2A base URL                                                 |
| `PROMPT_PATH`          | `/scripts/task.md`         | First-turn markdown                                                 |
| `CONTINUATION_PATH`    | `/scripts/continuation.md` | Later turns; if missing, a short built-in string is used            |
| `MAX_TURNS`            | `8`                        | Maximum `message/send` calls                                        |
| `MULTITURN_EARLY_EXIT` | `true`                     | If `true`, stop when task `completed` and non-stub text is observed |
| `HTTP_TIMEOUT_S`       | `300`                      | HTTP timeout used by A2A SDK client                                 |
| `ALLOW_LOCALHOST_A2A`  | unset                      | Set `1` for local testing against `127.0.0.1`                       |

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
