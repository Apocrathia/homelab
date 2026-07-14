# Cursor hooks (this repo)

Project-level [Cursor hooks](https://cursor.com/docs/hooks) for this workspace. Configuration lives one level up in [`.cursor/hooks.json`](../hooks.json); this directory holds the commands those entries invoke.

## What runs

| Hook event             | Script                                       | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sessionStart`         | [`session-context.py`](./session-context.py) | Injects short `additional_context` that points agents at [`AGENTS.md`](../../AGENTS.md) as the repo entrypoint.                                                                                                                                                                                                                                                                                                                                                                                                    |
| `beforeShellExecution` | [`shell-guard.py`](./shell-guard.py)         | Runs on **every** shell command. Asks for cluster/infra mutations (`kubectl`, `flux`, `helm`, `talosctl`, `tofu`/`terraform` apply) and for **unsafe shell** patterns (`curl`/`wget`/`aria2c`, `ssh`/`scp`/`rsync`/`sftp`, `rm`/`mv`/`chmod`/`chown`/`dd`, `nc`/`ncat`/`netcat`, `sudo`, `docker`/`podman` lifecycle verbs, `eval`, sensitive `git`/`gh`). Pure `rm`/`mv` with every path under repo [`.scratch/`](../../.scratch/README.md) is allowed. Leading `sudo` is stripped only for infra classification. |
| `beforeMCPExecution`   | [`mcp-guard.py`](./mcp-guard.py)             | Normalizes the tool segment (last part after `:`, camelCase → snake_case) and asks when any **mutating verb** from `VERBS_MUTATING` appears as a whole underscore-delimited token (logic in script). Extend that set when you add MCP families.                                                                                                                                                                                                                                                                    |

Failures in these scripts are **fail-open** (unless you add `failClosed` in `hooks.json`), so a broken hook does not brick the agent. For high-stakes MCP governance, Cursor's docs suggest `failClosed: true` on `beforeMCPExecution`; this repo leaves it off until you opt in.

## Hook output schema

Each event accepts different stdout JSON fields. Emit only what the event supports:

| Event                  | Output fields                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `sessionStart`         | `additional_context`, `continue` (always `true` here)                               |
| `beforeShellExecution` | `permission` (`allow` \| `ask` \| `deny`), optional `user_message`, `agent_message` |
| `beforeMCPExecution`   | same as `beforeShellExecution`                                                      |

`continue` is **not** valid on shell/MCP hooks — it belongs to `sessionStart` and `beforeSubmitPrompt`.

## Verifying hooks

1. **Settings → Hooks** — confirm all three entries appear and show recent executions.
2. **Hooks output channel** — on `permission: "ask"`, guards print `[homelab-shell-guard]` / `[homelab-mcp-guard]` lines to stderr; Cursor copies those here.
3. **Manual smoke test** from repo root:

   ```bash
   echo '{"session_id":"test","is_background_agent":false,"composer_mode":"agent"}' \
     | .cursor/hooks/session-context.py | jq -e '.additional_context and .continue'

   echo '{"command":"kubectl apply -f .scratch/x.yaml","cwd":"'"$PWD"'"}' \
     | .cursor/hooks/shell-guard.py | jq -e '.permission == "ask"'

   echo '{"command":"rm -rf .scratch/x.yaml","cwd":"'"$PWD"'"}' \
     | .cursor/hooks/shell-guard.py | jq -e '.permission == "allow"'

   echo '{"command":"rm -rf flux","cwd":"'"$PWD"'"}' \
     | .cursor/hooks/shell-guard.py | jq -e '.permission == "ask"'

   echo '{"tool_name":"user-github:create_pull_request","tool_input":{}}' \
     | .cursor/hooks/mcp-guard.py | jq -e '.permission == "ask"'
   ```

4. **In-agent test** — start a new Agent chat (triggers `sessionStart`), then ask the agent to run `kubectl apply --dry-run=client -f /dev/null` (should **allow**) or `kubectl delete pod foo` (should **ask**). Cursor command allowlists may auto-approve some read-only commands without showing the approval sheet.

5. If hooks do not load after saving `hooks.json`, restart Cursor. Project hooks require a **trusted workspace**.

## Developing

- **Python:** 3.12+ ([`pyproject.toml`](./pyproject.toml)).
- **Format / lint:** from repo root:

  ```bash
  uv sync --all-groups --directory .cursor/hooks
  uv run --directory .cursor/hooks ruff format .
  uv run --directory .cursor/hooks ruff check .
  ```

  Pre-commit also runs Ruff on `*.py` under this directory.

- **After editing:** reload is usually automatic when `hooks.json` is saved; if hooks do not pick up, restart Cursor. Use **Settings → Hooks** and the Hooks output channel when debugging.

- **Approval copy:** Cursor’s docs say `user_message` / `agent_message` should appear in the client and reach the model; in practice [those fields are often ignored](https://forum.cursor.com/t/when-are-you-going-to-fix-hooks/148573) (tracked regression / known issue). This repo still emits them for spec compliance. On `permission: "ask"`, guards also print a **`[homelab-*-guard]` line to stderr** so the **Hooks** output channel shows a human-readable reason while you approve. Until Cursor fixes the UI, treat that channel as the source of truth for hook messaging.

## See also

- [`.cursor/README.md`](../README.md) — how `.cursor/` fits together.
- [`AGENTS.md`](../../AGENTS.md) — permissions and workflow; `session-context.py` orients the agent here first.
