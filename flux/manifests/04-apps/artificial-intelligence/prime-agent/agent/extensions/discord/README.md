# prime-agent discord

Discord integration for prime-agent: brings the agent into the
operator's Discord — gated to designated guilds, channels, and users —
so it can be reached where the operator already lives instead of
through a terminal session.

Zero dependencies: Node stdlib only (native WebSocket + fetch,
Node >= 22). No npm install, no `package.json` — the cluster mirror
is 3–4 flat ConfigMap keys (`index.ts`, `server.mjs`,
`discord-guidelines.md`, and the token-free `config.json` when the
cluster shape needs one; READMEs never ship).

## The two pieces

- **`index.ts` (the beacon)** — loads in every prime-agent session.
  Binds an ephemeral loopback control port for its session, registers
  the session with the bot (15s heartbeat), forwards live assistant
  stream events for Discord streaming, respawns the bot
  (`node server.mjs`, detached) when its health probe fails —
  probe-first, one attempt per 30s per process — injects Discord
  context into bot-spawned sessions' system prompts
  ([below](#discord-context-injection)), registers the `discord_thread`
  and `session_topic` tools in discord-tagged sessions
  ([below](#agent-decided-threading), [naming](#session-naming)), and
  relays externally-typed user input onto the conversation's Discord
  surface ([below](#tui-relay)).
- **`server.mjs` (the bot)** — detached sidecar, owns the Discord
  gateway connection and the loopback control port (`8790`, the
  single-instance lock: bind failure exits 0). Runs the fail-closed
  admission ladder, maps each conversation (thread / DM / channel) to
  a held-open `prime-agent --mode rpc` child, streams replies
  (preview edit + finalize splits), serves `/ping` `/status` `/reset`
  `/stop` slash commands, and promotes channel conversations to threads for
  the `discord_thread` tool
  ([below](#agent-decided-threading)).

Only sessions the bot spawned itself (tagged `DISCORD_CONV_KEY`,
claimed by the spawn's session-file causality — the same mechanism
the webui sidecar uses, since daemon workers register their own pids)
receive Discord traffic. The operator's interactive sessions register
for `/status` display only and are never routed — a subagent that
inherits the tag cannot steal routing either.

## Fail-closed behavior

Empty allowlists deny with a one-time warning naming the fix:

- `allowed_guild_ids` empty → every guild message denied.
- `allowed_users` empty → every user denied (`allow_all_users` or
  `"*"` for dev).
- `allowed_channels` empty → every channel denied (`"*"` to open).

Every outbound message carries `allowed_mentions: {parse: []}` at the
REST transport — LLM output can never mass-ping, regardless of prompts.
Both internal tokens (the machine-wide register token and the per-session
traffic token) are constant-time compared and fail-closed; neither value
is ever logged — audit lines carry only the token's SOURCE.

## Audit logging & inbound hardening

The 2026-09-23 invisible-`/send` mystery (the operator's webui composer
messages landed with zero trace on any hop) was invisible because `/send`
logged nothing anywhere. Every inbound control request now leaves one line.

**The line.** Both control servers audit to stderr — the bot via
`log()` into `server.log`, the beacon via `console.error` into the daemon
supervisor log:

```text
[discord-beacon] audit route=/send src=127.0.0.1:53124 sessionId=01a0d001… tokenSource=session auth=ok outcome=turn bytes=142
[discord-bot] audit route=/internal/register src=127.0.0.1:49311 sessionId=01a0d001… tokenSource=file auth=ok outcome=routed bytes=512
```

Fields: `route` · `src` (source socket/port — bot, collector, or unknown
prober are distinguishable) · `sessionId` (short) · `tokenSource` (which
credential class authenticated: `session`|`env`|`file`|`config`|`generated`,
`none` on failure) · `auth` (ok|fail) · `outcome` (delivery verdict or HTTP
status: `turn`/`steer`/`stop`/`routed`/`display-only`/event names/`400`/`401`/
`404`/`413`/`500`) · `bytes` (payload size). Token values and message text
are NEVER logged — `bytes` + timestamp correlate with the receiving
transcript when content questions arise.

**What logs, what stays silent:**

- Beacon `/send`, `/stop`, and every 401 — one line per request, always.
- Bot `/internal/register|event|unregister|thread` — one line per request,
  EXCEPT heartbeat-shaped register re-posts (every ~15s per session):
  first-seen per session, then at most one line per ~10 minutes. Register
  non-200s and 401s always log.
- `/healthz` stays silent on both servers — it is the liveness probe, and
  every beacon probes every 30s.

**Per-session beacon token (hardening #1).** At `session_start` the beacon
generates a fresh random token (never written to disk, never logged) and
carries it in every `/internal/register` payload. The bot stores it on the
route row and `beaconSend`/`beaconStop` present it; `/send` and `/stop`
accept ONLY that token. The machine-wide chain
(`DISCORD_EXT_TOKEN` → `config.json ext_token` → `discord-token` file →
generate + persist to config) remains the REGISTER credential on both
sides — the bootstrap that lets the bot trust a register — but it no
longer authenticates session
traffic. Result: a process that scraped the machine token (env readers,
file readers — any process as the operator user) can no longer inject
turns into any beacon. Honest ceiling: same-user processes can still read
the bot's in-memory state; macOS loopback has no `SO_PEERCRED`, so
kernel-level caller identity is unavailable. The boundary drawn is
"token readers can no longer inject".

**Compat, and the restart window.** A beacon that registered WITHOUT a
session token (a pre-hardening instance still running) makes the bot fall
back to the machine token for its `/send`/`/stop` — those old beacons run
the old gate and accept it, so live conversations survive the lap. The
reverse window is real but self-healing: a NEW beacon registering with an
OLD (pre-hardening) bot gets its `/send` 401-rejected until the bot
restarts — each rejection audits (`auth=fail outcome=401`) and the
beacon warns once ("machine-token caller was rejected"); after the bot
restarts, the next ~15s heartbeat re-registers with the session token and
traffic resumes. So: **restart `server.mjs` when this lap lands.**

**No token rotation on bot restart.** Deliberate: beacons read the machine
token once at startup and it persists in `config.json ext_token` across
restarts; rotating would leave live beacons on a stale token and buy false
confidence. Documented instead of implemented.

**Token chain order + the one-time file migration** (2026-09-28, aligned
with the webui beacon pair). The chain resolves `DISCORD_EXT_TOKEN` env →
`config.json ext_token` → `discord-token` file → generate-and-persist-to-
config; both the bot and the beacon log the resolved branch at startup as
`token source: <env|config|file|generated>` (the beacon's line carries the
`[discord-beacon]` prefix). A pre-reorder install that still holds the
machine token in the `discord-token` file migrates on first resolve: the
file's value lands in `config.json ext_token` (atomic read-modify-write —
every other key, the 2-space indent, and the file's 0600 mode preserved),
then the file is deleted. The bot and the beacon may both run the
migration; it is idempotent, and last-write-wins carries the same value.
Generated tokens persist straight into `config.json` — the file path is a
read fallback and migration source only, never written again. `ext_token`
is documented here only: `config.json` is gitignored and
`config.example.json` stays credential-free.

**`/send` payload cap (hardening #2).** The beacon rejects `/send` bodies
over 16 KB with `413` + an audit line (checked before reading, and again
while buffering for chunked posts) — bounded blast radius for a runaway
injector. A `413` reads as "reachable but not delivered" on the bot side
(the same bucket as a timeout), so the triggering message acks ⚠️ rather
than respawning.

## Configuration

`config.json` is the live local config: gitignored, credentials inside.
Start from `config.example.json` (token-free) and paste real values
into `config.json`, never into the example. Legacy scaffold keys
(`mention_only`, `allowed_channel_ids`) still carry over if present.

| field                    | default   | purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bot_token`              | `""`      | Discord bot token (required). Purely numeric values are rejected — that's the application ID, not the token.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `application_id`         | `""`      | Discord application ID (required; slash-command registration).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `public_key`             | `""`      | Reserved — interaction signature verification (HTTP interactions lap). Unused in MVP.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `client_secret`          | `""`      | Reserved — OAuth (later lap). Unused in MVP.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `allowed_guild_ids`      | `[]`      | Guild (server) IDs the bot may operate in. Empty = deny all.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `allowed_users`          | `[]`      | User IDs that may talk to the bot (`"*"` allowed). Empty = deny all.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `allow_all_users`        | `false`   | Dev shortcut: admit any user.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `allowed_channels`       | `[]`      | Channel whitelist (IDs or `"*"`). Empty = deny all. Thread messages match by parent channel too.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `ignored_channels`       | `[]`      | Channel blacklist (IDs or `"*"`), checked after the whitelist.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `free_response_channels` | `[]`      | Channels where no mention is required (IDs or `"*"`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `allow_dm`               | `false`   | Allow the bot in direct messages (one session per user).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `require_mention`        | `true`    | In shared channels/threads, only respond when mentioned — unless free-response, or the conversation is already mapped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `auto_thread`            | `true`    | **Deprecated** (schema-accepted, semantically ignored): `thread_policy` governs threading now.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `thread_policy`          | `"agent"` | `"agent"` (default): a channel mention does NOT auto-thread — the conversation is `channel:<id>`, quick answers stay in place, and the AGENT promotes a substantial topic to a thread via the `discord_thread` tool ([below](#agent-decided-threading)). `"always"`: legacy behavior — every triggering mention spawns a thread.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `thread_rename`          | `true`    | Thread renames ([below](#thread-renames)): a routed session's registered name mirrors onto its thread, so the thread sidebar becomes the session index. `false` = zero rename PATCHes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `home_channel`           | `""`      | Optional channel ID for a one-time "bot online" notice on first connect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `allow_bots`             | `"none"`  | `none` / `mentions` (inline `<@bot>` token required — reply-pings don't count) / `all`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `reply_to_mode`          | `"first"` | `off` / `first` — whether a response block's FIRST chunk references the triggering message. Chunks 2..N always post plain (2026-09-24 operator rule: only reply when the last message in the conversation was not from the agent — adjacency associates the rest, the reply header never repeats between chunks). `all` is not implemented and fails config load.                                                                                                                                                                                                                                                                                                                                                                            |
| `max_splits`             | `8`       | Max Discord messages per finalized reply; beyond that a truncation notice replaces the tail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `default_cwd`            | `"~"`     | Working directory for spawned conversation sessions (absolute path or `~`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `text_batch_ms`          | `600`     | Rapid successive messages coalesce into one turn (trailing debounce).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `typing_indicator`       | `true`    | Post the typing indicator every 8s while a turn runs (Discord's indicator expires ~10s after each trigger — the loop keeps it continuous).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `reactions`              | `true`    | Reaction ack on the triggering message: 👀 when the turn starts, ✅ when the reply lands, ⚠️ when nothing does. Auto-thread turns react on the trigger in its parent channel. ⚠️ means DELIVERY failure only — a mid-turn tool-call message end never acks, the swap paces its ops (~0.35s apart, a stale ⚠️ is removed before ✅ lands), and a failed reaction op gets one delayed retry; reaction failures never affect reply delivery. Turn tokens guard the ack against cross-turn clobber: every dispatch bumps a per-conversation turn token and turn-scoped writers skip their writes on a bump, so an old turn's late tail (finalize resuming after its delivery awaits) can never clear a newer turn's pending ack (a stranded 👀). |
| `relay_external`         | `true`    | TUI relay ([below](#tui-relay)): user input that did NOT arrive via the bot's `/send` (typed in the TUI or any non-Discord client) lands on the conversation's Discord surface with a `*(via tui):*` provenance tag, so the surface keeps its context. `false` = zero relay posts.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `guidelines`             | `true`    | Beacon prompt injection: append Discord context + `discord-guidelines.md` to bot-spawned conversation sessions' system prompts ([below](#discord-context-injection)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `guidelines_file`        | `""`      | Path to the guidelines markdown the beacon injects. `""` = this directory's `discord-guidelines.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `webui_base_url`         | `""`      | Webui conversation deeplinks. `""` = feature off. When set (must be `http(s)://…`; trailing slash normalized), `/status` rows, `discord_thread` tool results, and session-death notices carry a `<base>#/s/<sessionId>` link that opens the conversation in the webui.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `first_response_link`    | `true`    | Delivery-UX round 2: the FIRST finalized reply of a conversation appends one `view this conversation: <webui link>` line; subsequent replies never repeat it, and `/status` keeps its own links row. Needs `webui_base_url` set; a full last chunk sends the line as one extra message instead of truncating anything.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `preview_min_edit_ms`    | `2500`    | Delivery-UX round 2: minimum interval between streaming-preview EDITS. Intermediate edits collapse inside the window (less REST spam, no flicker); the final edit always lands (finalize edits the preview into the reply's chunk 1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `recovery`               | `true`    | Durable recovery ledgers ([below](#durable-recovery)): missed-message replay across crashes + at-least-once redelivery of terminally failed replies. `false` = zero ledger writes, no boot replay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `attachments`            | `true`    | Inbound text-doc injection ([below](#inbound-attachments)): text-compatible attachments inline into the dispatched message text — the agent simply sees the content. `false` = zero fetches, the message text alone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `attachment_max_bytes`   | `102400`  | Per-attachment inline cap (100KB) for [inbound attachments](#inbound-attachments). Over-cap files never fetch — a one-line `[attachment … skipped: N bytes > 100KB cap]` placeholder rides instead.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

`presence` is a nested block (defaults < `config.json` < env, merged
per sub-key — a partial object never loses defaults):

| sub-key          | default                 | purpose                                                                                                                                                                                         |
| ---------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`        | `false`                 | Presence gate: disabled = zero gateway presence sends, no timers.                                                                                                                               |
| `type`           | `0`                     | `0` = Playing the activity name (`state` in the profile pop-out) / `4` = custom status, text-only. Other values fail config load.                                                               |
| `name`           | `"prime-agent"`         | Deep fallback for the visible line (128-char field limit) — shows only while `idle_state` is empty. While a routed conversation works, the line shows that conversation's session name instead. |
| `state_template` | `"{task} · {children}"` | Live state text. `{task}` = most recent busy session, `{children}` = "N live" when more than one works; empty segments drop.                                                                    |
| `idle_state`     | `"listening"`           | Idle text — drives BOTH the member-list line (activity name) and the profile pop-out state while no routed conversation works.                                                                  |
| `status`         | `"auto"`                | `auto` (online whenever the bot is listening or working — never the AFK mark; the activity line carries what it's working on) / `dnd` / `invisible` — a forced value wins.                      |
| `debounce_ms`    | `3000`                  | Trailing debounce before a presence send (clamped 0–5000); sends capped at 4 per 20s (Discord allows 5).                                                                                        |

The visible member-list line (the activity `name`) reads the **active
conversation**: the most-recently-active routed session's registered session
name, clamped to 128 chars (the beacon carries it on every 15s heartbeat, so
renames land within ~15s). At idle both lines read the `idle_state` text
(`"listening"` by default — the product name next to the account name was
redundant); `name` is the deep fallback when `idle_state` is empty. Busy
state stays machine-wide: any registered session (untagged operator sessions
included) still drives the `state` text (click-to-see).

Internal (not operator-facing): `ext_token` (config.json key for the
beacon↔bot token — the canonical store since the 2026-09-28 chain reorder;
see the migration note [above](#audit-logging--inbound-hardening)).

### Env overrides

Most fields have a `DISCORD_*` env override (arrays are
comma-separated); env outranks config.json — the cluster shape.
Four have no override and stay config.json-only: `public_key`,
`client_secret`, `text_batch_ms`, `typing_indicator`.
`DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_ALLOWED_GUILDS`,
`DISCORD_ALLOWED_USERS`, `DISCORD_ALLOW_ALL_USERS`,
`DISCORD_ALLOWED_CHANNELS`, `DISCORD_IGNORED_CHANNELS`,
`DISCORD_FREE_RESPONSE_CHANNELS`, `DISCORD_ALLOW_DM`,
`DISCORD_REQUIRE_MENTION`, `DISCORD_AUTO_THREAD`,
`DISCORD_HOME_CHANNEL`, `DISCORD_ALLOW_BOTS`,
`DISCORD_REPLY_TO_MODE`, `DISCORD_MAX_SPLITS`, `DISCORD_DEFAULT_CWD`,
`DISCORD_THREAD_POLICY`, `DISCORD_THREAD_RENAME`, `DISCORD_REACTIONS`, `DISCORD_RELAY_EXTERNAL`, `DISCORD_GUIDELINES`,
`DISCORD_GUIDELINES_FILE`, `DISCORD_WEBUI_BASE_URL`, `DISCORD_RECOVERY`,
`DISCORD_ATTACHMENTS`, `DISCORD_ATTACHMENT_MAX_BYTES`,
`DISCORD_FIRST_RESPONSE_LINK`, `DISCORD_PREVIEW_MIN_EDIT_MS`.
Presence sub-keys: `DISCORD_PRESENCE_ENABLED`, `DISCORD_PRESENCE_TYPE`,
`DISCORD_PRESENCE_NAME`, `DISCORD_PRESENCE_STATE_TEMPLATE`,
`DISCORD_PRESENCE_IDLE_STATE`, `DISCORD_PRESENCE_STATUS`,
`DISCORD_PRESENCE_DEBOUNCE_MS`.
Internal: `DISCORD_BOT_PORT` (8790), `DISCORD_EXT_TOKEN`,
`DISCORD_TOKEN_FILE`, `DISCORD_CONV_KEY` (spawned-children tag),
`DISCORD_CONV_NAME` (the surface-derived session name the spawn env
carries), `DISCORD_SESSIONS_DIR`, `DISCORD_BEAT_INTERVAL_MS` (beacon
heartbeat cadence, default 15000 — a smoke override, never set in
production).

## Local vs cluster credentials

- **Local (this Mac):** `config.json` holds the real credentials; it is
  gitignored (see `.gitignore`). `config.example.json` documents the
  shape and stays token-free.
- **Cluster:** the values mount from the `prime-agent-secrets` 1Password
  item as env vars (`DISCORD_BOT_TOKEN`, …), which outrank the config
  file — same precedent as the webui `webui-token` and a2a
  `A2A_WEBHOOK_TOKEN` mounts. The GitOps `config.json` copy stays
  token-free.

## Running

- **Standalone:** `node server.mjs` (from this directory). Binds
  `127.0.0.1:8790`, connects to the Discord gateway, and serves until
  SIGTERM. A second instance exits 0 immediately — the port is the
  lock.
- **Auto-respawned:** any prime-agent session (with credentials
  configured) probes `GET 127.0.0.1:8790/healthz` on start and
  respawns the bot if the probe fails.
- **Checks (no frameworks, no live gateway connect):**
  `node --check server.mjs` for the bot, and
  `node server.mjs --smoke` for the full local test suite — config
  schema, admission-ladder allow/deny matrix, slash-command
  authorization (guild + DM interaction matrix), credential presence
  (booleans only), the beacon↔bot contract over real loopback HTTP
  (including the `index.ts` beacon factory driven against a mock
  runtime), and the streaming discipline against a recorded REST
  layer (asserting `allowed_mentions {parse: []}` rides every
  outbound payload).

## Slash commands

Guild-scoped registration (per allowlisted guild); authorization mirrors
the message admission ladder one-for-one — the same guild / channel /
user gates, so anyone who can talk to the bot can command it.

| command   | what it does                                                         |
| --------- | -------------------------------------------------------------------- |
| `/ping`   | Bot gateway state and uptime.                                        |
| `/status` | Live conversations and registered sessions.                          |
| `/reset`  | Reset this channel/thread conversation — next message starts fresh.  |
| `/stop`   | Stop the current turn — queued messages resume on your next message. |

**`/stop` semantics.** `/stop` aborts the CURRENT turn in place: the bot
POSTs to the conversation's beacon, whose `ctx.abort()` cancels the LLM
stream mid-flight plus in-flight turn actions, parks queue-visible turns
(the next message resumes them), and keeps the session, route, and
wrapper alive. `agent_end` still fires on abort, so the ack resolves
through the existing settle path — the stopped turn's trigger gets ⚠️ if
nothing had landed (the operator stopped it). This is deliberately NOT
`/reset`: `/reset` SIGTERMs the wrapper and the turn can keep running in
the daemon's worker for up to 30s more (it may even complete and burn
tokens) — `/stop` is the real stop button. With no turn in flight `/stop`
answers "nothing running" and aborts nothing; an unreachable session
reports that too. The beacon route is token-gated like `/send` (the
webui `POST /abort` twin).

## Conversation model

- Thread (created by the agent's `discord_thread` tool, policy
  `"always"` auto-thread, or bot-participated) → `thread:<id>` — one
  persistent session per thread.
- DM (`allow_dm`) → `dm:<user_id>` — one per user.
- Shared channel with `thread_policy: "agent"` (the default) →
  `channel:<id>` — one shared session per channel, and the agent
  decides whether a topic deserves a thread
  ([below](#agent-decided-threading)).

## TUI relay

A conversation session is shared: the operator can talk to it from
the TUI (or any non-Discord client) while the conversation is also
live on Discord. The reply to such a turn already lands on the
surface, but the question itself used to be invisible there — the
surface saw an answer to an unseen question.

The beacon's `input` handler is the extraction point: every turn's
raw user text and its source (`interactive` / `rpc` / `extension`)
arrive there. Text that came through the bot's own `/send` is
already the user's own Discord message and is never relayed
(suffix-matched against a TTL-bounded pending queue, so a
same-chain input transform that prepends a directive cannot break
the match); anything else is POSTed to the bot's
`/internal/relay` (machine-token gated like every internal route),
which posts it on the conversation's surface as `*(via tui):*`
followed by the text — chunked, paced, and reference-free exactly
like a finalized reply's tail (`max_splits` and the truncation notice
apply). The agent transcript keeps exactly one copy: the relay is
display-only, the relay handler never dispatches, and the bot's own
posts are dropped by the admission ladder's self gate anyway. Gate:
`relay_external` (default `true`, env `DISCORD_RELAY_EXTERNAL`) on
both sides — `false` means zero relay posts.

## Agent-decided threading

`thread_policy: "agent"` (the default) replaces the old
every-mention-spawns-a-thread behavior: a channel mention starts (or
continues) a `channel:<id>` conversation, quick answers are posted in
place, and the AGENT decides when a topic is substantial enough for a
thread.

- The beacon registers a **`discord_thread` tool** in every
  discord-tagged session (`pi.registerTool`, the a2a / name-sessions
  surface). The agent calls it with a short thread name; the beacon
  POSTs the token-gated `/internal/thread` route.
- The bot creates a **public** thread (type 11) from the
  conversation's current trigger message, adds the trigger author to
  its members (exactly like the auto-thread path), re-keys
  ledger/routing/claim/streamer from `channel:<id>` to
  `thread:<newId>` — **same session, no respawn** — and returns the
  new thread id in the tool result so the agent knows where its reply
  lands.
- The beacon's env tag (`DISCORD_CONV_KEY`) is frozen at spawn time,
  so its heartbeats keep registering under the old `channel:<id>`
  key — the promotion deletes the old claim, so those registers stay
  display-only and never resurrect the old route. Stream events route
  by sessionId, so the conversation keeps driving normally.
- Etiquette lives in `discord-guidelines.md`: quick answers stay in
  the channel (no tool call); substantial topics get
  `discord_thread` + continue in the thread.

`conversations.json` (gitignored) maps conversation → session id +
cwd; it is the resume ledger. On bot restart the children die (by
design, webui lifecycle); the next message respawns the session with
`--resume <id>` — transcript continuity. `/reset` drops the mapping;
the next message starts a fresh session.

## Session naming

Every session the beacon sees carries a **name** — the thing the
operator's session picker, the bot's presence line, and `/status` show.
Without one, presence falls back to the configured product name
(`prime-agent`).

- **Spawn-time naming:** the bot resolves each conversation's surface
  name (channel name / thread title / DM recipient) and passes it on the
  spawn env (`DISCORD_CONV_NAME` — the machine-garbage
  `discord channel 9967911148` fallback dies). The beacon sanitizes it
  (single-line, collapsed spaces, 26-char picker clamp) and calls the
  daemon's `setSessionName`. A collision (the name registry rejecting a
  fresh name — eviction off means dead saved sessions hold names
  forever) retries ONCE with a `<last2 of session id>` suffix, then
  gives up silently: naming is cosmetic and must never crash the
  session worker.
- **Assert-at-register (legacy self-heal):** the name is asserted on
  **every** register, heartbeats included. A session that predates the
  naming code — or whose first attempt failed — registers `name=null`
  and shows as `prime-agent` in presence; its next heartbeat (≤15s)
  re-asserts and self-heals. A session that **has** a name (any name,
  including an agent topic-rename) is never touched by the assert.
- **`session_topic` tool:** the spawn-time name is accurate at spawn and
  goes stale as the work evolves ("always initially just 'discord
  something'"). The beacon registers a `session_topic` tool in
  discord-tagged sessions; the agent calls it with a short topic slug
  (2–3 lowercase words, ≤26 chars) when the conversation clearly moves
  onto a new subject. Propagation chain: guarded `setSessionName` (the
  same retry-once-suffix-then-silence shape as the register-path
  naming) → the next heartbeat's register payload carries the new name
  → the bot's session row (presence v2's activity line, `/status`) and
  the thread title ([thread renames](#thread-renames), only-if-changed)
  all track it within ~15s. The tool reports the outcome plainly:
  `renamed` | `rejected` (name held by a dead session — retried with
  suffix) | `unavailable`.
- **The native `name_session` block:** the harness's own `name_session`
  tool stays BLOCKED in discord-tagged sessions — its unguarded
  `setSessionName` is the witnessed worker-kill vector (an unhandled
  rejection on a name-collision rejection kills the session worker;
  production 2026-09-27). The beacon's assert and the `session_topic`
  tool are the only sanctioned naming paths, both guarded. Untagged
  sessions (the operator's interactive work) keep the native tool.

## Thread renames

`thread_rename: true` (hermes-catalog #10) makes the thread sidebar a
session index for free: whenever a session ROUTED to a
`thread:<id>` conversation registers (or heartbeats — the beacon
re-registers every ~15s) with a name, the bot PATCHes the thread's
name to the session's registered name (`PATCH /channels/{threadId}`,
the same name the webui and presence v2's activity line show).

- **Only-if-changed:** the bot tracks the last name _it_ set per
  conversation and PATCHes only when the registered name differs.
  Same-name heartbeats send nothing; one rename per name change.
- **Manual renames (honest caveat):** the rename path never reads the
  thread's current name (no GET, no gateway intent). A manual rename
  is therefore never detected — and never fought either: heartbeats
  keep carrying the unchanged session name, which still matches the
  bot's cache, so your manual name survives. The bot re-asserts the
  session name only when it _changes at the source_ (the next
  `session_topic` rename on the worker), and once per routed thread
  after a bot restart.
- **Failure discipline:** renames ride the existing REST rate-bucket
  layer (own `chanpatch:<id>` bucket) and are fire-and-forget — a
  failing PATCH (missing `MANAGE_THREADS` permission, 403/429) logs
  one WARN and never blocks or fails the register. A failed rename is
  not retried: the next attempt rides the next name change or a bot
  restart.
- **Scope:** threads only. Channels and DMs are never renamed. A
  thread promoted via the `discord_thread` tool keeps the
  agent-chosen name it was created with — the beacon's conversation
  tag is frozen at spawn time, so its heartbeats keep registering
  under the old `channel:<id>` key and the rename hook never fires
  for the promoted thread.
- **Sanitization:** registered names are sanitized before the PATCH —
  newlines collapse to spaces, `@` is stripped (a thread name can
  never render as a ping), and the name clamps to Discord's 100-char
  thread-name cap.

## Durable recovery

Two fail-soft JSONL ledgers under `recovery/` (gitignored; `recovery`
knob, default on) close the two crash windows hermes' gateway closes
with its SQLite ledgers (`recovery.py` + `delivery_ledger.py`). Files
are 0600, the directory 0700, pruned at boot: 30-day horizon, 1000
rows per conversation. Everything is fail-soft — a ledger failure
never blocks message flow.

- **Inbound missed-message ledger** (`recovery/<convKey>.jsonl`) — every
  admitted message appends a pending row **before** dispatch (the raw
  dispatch text is what re-dispatch needs; a hash could only detect
  pending-ness). The row flips to done (a done-marker row) when a
  session accepts the dispatch — beacon `/send` ok, or the spawn path
  takes custody (its failures already post visible notices). A crash
  in that window leaves the row pending; on boot (gateway READY, once
  per process) pending rows written before the boot **replay through
  the normal dispatch path** (claim and self-heal included). The
  CURRENT admission gates re-check every row — config may have changed
  during downtime; a denial drops the row with a log naming the gate.
  Dedup is durable: the replay claims the message id in the in-memory
  LRU, and an already-done row never re-dispatches. Each conversation
  with N>0 recoveries gets one visible notice first: _"♻️ recovered N
  missed message(s) from while I was down"_ (hermes replays silently —
  recovery must be visible). A thread promotion (`discord_thread`)
  moves the conversation's rows with it.
- **Delivery-obstruction ledger** (`recovery/<convKey>.delivery.jsonl`)
  — when a turn FINALIZES text but the REST delivery fails terminally
  (every split path AND the consolidated fallback), the finalized
  reply text persists as an owed delivery and is retried on the next
  dispatch to that conversation or by a 60s sweep. Redeliveries carry
  the honest at-least-once marker: _"♻️ recovered a reply that failed
  to deliver earlier"_ (an ambiguous send may duplicate — hermes says
  so visibly instead of silently). The delivered message id is
  recorded on the done row; a delivered row never re-posts.

Boundary (unchanged): messages sent while the bot is **fully down**
are still lost — there is no Discord history backfill; the ledgers
cover the admit→dispatch and finalize→delivery crash windows.

## Dispatch exactly-once (delivery-UX round 2)

The 2026-09-24 dm incident (operator live feedback: the same message
delivered as TWO turns, three pairs, gaps 4-51s) was the dispatch path
double-sending, not a dying session:

1. **The `/send` 200 is the ack.** A dispatch that reaches a live
   beacon ends there — the turn runs on that session, the streamer
   anchor arms the trigger's ✅/⚠️ verdict, and NO parked copy exists.
   Before round 2 every acked dispatch ALSO fell through to the
   spawn path, parking the same text; the resume wrapper's register
   flush then `/send`-ed it again — every follow-up in a live
   conversation ran as two turns (and every dispatch booted a
   throwaway resume wrapper). A `/send` timeout on a REACHABLE
   beacon counts as acked too (the 2026-09-26 lesson — the turn is
   queued there; never respawn). Only a genuinely unreachable port
   self-heals: SIGTERM the stale wrapper, drop the route, respawn
   with `--resume`, re-dispatch the parked text.
2. **Dispatch-admission dedupe.** A per-conversation LRU
   (24h window, 200 ids) of dispatched trigger ids, checked at
   `dispatchToConversation` entry; a repeat drops with one audit
   line. It lazy-seeds from the recovery ledger's done rows — a done
   marker IS the durable "a session accepted this dispatch" record —
   so the window survives bot restarts. This is the belt under (1):
   any future path that re-enters dispatch for an already-sent id
   drops instead of double-delivering.

## Inbound attachments

Text-doc injection (`attachments`, default on; `attachment_max_bytes`,
default 102400 = 100KB): when an admitted message carries
attachments, the bot fetches the text-compatible ones and **inlines
their content into the dispatched text** — paste a log or a YAML file
and ask "what's wrong"; the agent simply sees the content. Zero
agent-side changes.

- **What inlines:** the first 3 attachments per message (sequential
  fetches, bounded). An attachment is text-compatible when its
  `content_type` is `text/*` **or** its extension is in the
  allowlist: `.txt .log .yaml .yml .json .md .csv .toml .ini .conf
.xml .env .ts .js .mjs .py .sh`.
- **What never fetches:** binary/unknown attachments, over-cap files
  (the payload's own `size` is checked first — an over-cap file is
  never fetched whole), and anything past the 3-attachment inline
  limit. Each gets a one-line placeholder in the same spot instead:
  `[attachment <name> skipped: non-text]`,
  `[attachment <name> skipped: N bytes > 100KB cap]`,
  `[attachment <name> skipped: only 3 attachments inline per message]`.
- **Fetch discipline:** CDN GET (`proxy_url` first) with the bot
  token, 10s per-fetch timeout, riding a **dedicated bucket key** —
  a slow/429ing CDN parks only attachment fetches, never message
  sends (bounded 429 retry, same as the REST layer). A stream read
  enforces the cap byte-by-byte and cancels at the boundary, so a
  lying `size` field still never fetch-and-discards.
- **Failures never block dispatch:** a 404/403/timeout becomes
  `[attachment <name> fetch failed: <reason>]` and the message
  dispatches with what it has.
- **The inflated text IS the dispatch text:** the inline suffix
  (`

[attached: <filename>]
<content>`, trailing whitespace
trimmed) joins the message text before the recovery row lands, so
the missed-message ledger stores it and a crash-window replay
re-dispatches the content.

- **Off switch:** `attachments: false` (or `DISCORD_ATTACHMENTS=false`)
  — zero fetch calls, the raw message text dispatches alone.

## Discord context injection

Bot-spawned conversation sessions know they run inside Discord. The
beacon's `before_agent_start` handler appends a `## Discord context`
block to every agent turn's system prompt — the live surface stated in
words plus its id (`thread:<id>` → "a Discord thread",
`dm:<user_id>` → "a direct-message conversation", `channel:<id>` →
"a shared channel") — followed by the full content of
`discord-guidelines.md`. That is how a conversation learns:

- its replies auto-deliver to one surface (never mention delivery
  mechanics — the user just sees the message),
- mentions are stripped outbound (address people by name; no pings),
- long replies split into chained messages automatically,
- threads are separate sessions, and when to offer a fresh thread for
  a new substantial topic.

Details:

- **Merge semantics:** append to the base system prompt, never replace
  (the `name-sessions` extension precedent for `before_agent_start`).
- **Scope:** only sessions carrying the `DISCORD_CONV_KEY` spawn tag —
  the operator's interactive sessions and untagged sessions are never
  touched.
- **Tuning:** edit `discord-guidelines.md` directly — plain markdown,
  no code changes, no restart (the beacon re-reads it every agent
  turn). A missing or unreadable file logs one warn per session and
  injects the live-context block alone; nothing crashes.
- **Knobs:** `guidelines` (default `true`) gates the whole injection
  off; `guidelines_file` (default `""` = this directory's
  `discord-guidelines.md`) points elsewhere. Both take env overrides
  (`DISCORD_GUIDELINES`, `DISCORD_GUIDELINES_FILE`).
- **The guidelines file is the operator's voice:** re-read from disk
  every agent turn — edits are live immediately, no restart, no code
  change.
- **Tool-description contract:** the threading trigger also rides the
  tool-choice surface itself. The `discord_thread` tool's registered
  `description` + `promptGuidelines` state that a TASK ("go fix X",
  "open an MR", "investigate Y", "build Z", any multi-step work) means
  calling `discord_thread` FIRST, before starting the work, and carry
  the rule of thumb: more than one tool call — or about to
  spawn/delegate to a child agent — deserves a thread. The tool
  surface restates the hard constraints (quick answers stay in the
  channel; shared-channel promotion only, never inside an existing
  thread or in DMs; short lowercase name, 2-3 words) and defers the
  full etiquette to the guidelines file.

## Runtime artifacts

`discord-token` (legacy 0600 token file — read fallback + one-time
migration source only; a fresh install never creates it),
`conversations.json`, `recovery/` (durable recovery ledgers,
[above](#durable-recovery)), `server.log` (bot stderr),
`spawned-agents.log` (child stdout/stderr) — all gitignored.

## Where the payload lives

This directory is the LOCAL mirror of the GitOps payload at
`flux/manifests/04-apps/artificial-intelligence/prime-agent/agent/extensions/`
in the homelab repo. The repo is the source of truth: change it there
(via MR), then mirror here; keep both sides semantically identical
([`../README.md`](../README.md)).
