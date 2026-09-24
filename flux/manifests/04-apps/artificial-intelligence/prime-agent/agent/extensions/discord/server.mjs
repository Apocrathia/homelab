#!/usr/bin/env node
/**
 * prime-agent discord bot — standalone sidecar, owns the Discord gateway
 * connection and the loopback control port (default 8790). Respawned
 * detached by the beacon (index.ts) from any prime-agent session when its
 * health probe fails; or run standalone: node server.mjs
 *
 * Plain ESM, Node stdlib only (native WebSocket + fetch; Node >= 22).
 * Zero npm deps — the cluster mirror stays two flat ConfigMap keys
 * (design D2; ponytail: swap to discord.js only if the bot outgrows
 * single-guild/low-rate usage, and only after solving node_modules-in-ConfigMap).
 *
 * Pieces (design doc: .scratch/discord-extension-research/design-proposal.md):
 *   - control port (loopback, token-gated): /healthz, /internal/register,
 *     /internal/event, /internal/unregister, /internal/thread (agent-decided
 *     threading: the beacon's discord_thread tool promotes a channel
 *     conversation to a thread, same session) — the beacon contract (D1/D8)
 *   - zero-dep gateway client: IDENTIFY, heartbeat+ACK liveness (2 missed
 *     ACKs -> reconnect+RESUME), exit classification (auth non-retryable),
 *     message-id dedup (RESUME replays events) (D2)
 *   - 8-gate fail-closed admission ladder (D4)
 *   - thread-centric conversation mapping: conversations.json ledger,
 *     spawn/resume prime-agent rpc children per conversation (D3)
 *   - streaming discipline: one preview message per turn, throttled edits,
 *     saturated-preview dedup, reply-chained finalize splits (D6)
 *   - rate-limit discipline (production 2026-09-25 dead-thread fix): a 429
 *     parks every request to that route bucket for retry_after+margin,
 *     preview creates retry bounded with deltas parked (never one POST per
 *     delta), finalize paces splits, rejected references degrade to fresh sends
 *   - reaction ack on the trigger message (deferred hermes "reactions"): 👀 at
 *     turn start, ✅ on delivery, ⚠️ when nothing lands — fire-and-forget,
 *     reaction failures never touch reply delivery. Reliability (production
 *     2026-09-26): ⚠️ means DELIVERY failure only — a textless assistant
 *     message end (every tool-call message) never acks, the swap paces its
 *     ops (a stale ⚠️ is removed before ✅ lands), and a failed reaction op
 *     gets ONE delayed retry, never a delivery verdict. Finality (production
 *     2026-09-27 ⚠️-beside-✅): the verdict is TERMINAL — a delivered trigger
 *     is never downgraded; late settles/timeouts/failTurns are logged no-ops,
 *     and every ackFinal/failTurn logs its provenance + streamer state.
 *     Turn tokens (production 2026-09-28 under-ack): every dispatch bumps a
 *     per-streamer turn token; turn-scoped writers (finalize's tail, the
 *     settles, failTurn, failPending, /reset) capture it at entry and skip
 *     their writes on a bump — a dispatch landing mid-finalize can never have
 *     its fresh pending ack clobbered by the old turn's late tail
 *   - slash commands /ping /status /reset over the gateway, guild-scoped (D7)
 *   - internal token: constant-time compare, fail-closed (D9)
 *
 * Fail-closed: empty allowlists deny (+ one-time warning naming the fix).
 * No secrets in logs: the bot token and the internal token are never
 * printed — only their source. allowed_mentions {parse: []} rides EVERY
 * outbound send, so LLM output can never mass-ping (transport deny, D5).
 */
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as os from "node:os";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = "https://discord.com/api/v10";
const GATEWAY_VERSION = "10";
const INTENTS = (1 << 0) | (1 << 9) | (1 << 12) | (1 << 15); // GUILDS | GUILD_MESSAGES | DIRECT_MESSAGES | MESSAGE_CONTENT (privileged — enable in the Developer Portal)
const MAX_MESSAGE_LENGTH = 2000;
const SPLIT_THRESHOLD = 1900; // hermes semantics: split under the 2000 cap
const PREVIEW_MIN_INTERVAL_MS = 2500; // belt fallback for cfg.preview_min_edit_ms (the knob's default twin — loadConfig always carries the coerced value; previewEdit takes this only on a hand-built cfg)
const SEND_PACE_MS = 1200; // finalize paces split sends — the channel bucket is 5/5s (Discord)
const RATE_LIMIT_MARGIN_MS = 100; // retry_after is a floor, not a wall
const TYPING_INTERVAL_MS = 8000; // the indicator expires ~10s after each trigger — 8s keeps it continuously visible (own loop: DM typing events are unreliable, hermes)
const REGISTER_TIMEOUT_MS = 45000; // spawn -> register window before giving up
const LEDGER_REAP_MS = 24 * 60 * 60 * 1000; // /status readability (2026-09-23 operator: stale null-session rows never reap): reaped at save time; a re-dispatch revives them before that
const TURN_TIMEOUT_MS = 300000; // mid-turn silence window: no stream events for this long -> the turn failed visibly (production 2026-09-24 worker-recycle: a turn died silently and the thread went permanently mute; env knob DISCORD_TURN_TIMEOUT_MS)
const SMOKE = process.argv.includes("--smoke");

const log = (...args) => console.error("[discord-bot]", ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();

// ---------- config (read fresh per message so edits need no restart; D10) ----------
const DEFAULTS = {
  bot_token: "",
  application_id: "",
  public_key: "", // reserved: interaction-signature verification (HTTP interactions lap)
  client_secret: "", // reserved: OAuth (later lap)
  allowed_guild_ids: [],
  allowed_users: [], // user IDs only in MVP (username/role allowlists need the SERVER_MEMBERS intent — deferred)
  allow_all_users: false,
  allowed_channels: [], // channel IDs or "*"
  ignored_channels: [], // blacklist, "*"
  free_response_channels: [], // no-mention channels, "*"
  allow_dm: false,
  require_mention: true,
  auto_thread: true, // DEPRECATED legacy key (schema-accepted, semantically ignored): thread_policy governs threading now
  thread_policy: "agent", // agent (default: quick answers stay in the channel; the AGENT promotes substantial topics to a thread via the discord_thread tool) | always (legacy: every triggering mention spawns a thread)
  thread_rename: true, // hermes-catalog #10: mirror a routed session's REGISTERED name onto its thread (PATCH /channels/{threadId}); only threads — channels and DMs are never renamed
  home_channel: "",
  allow_bots: "none", // none | mentions | all
  reply_to_mode: "first", // off | first ("all" is rejected at config load — splits are reply-chained, only chunk 1 can reference the trigger)
  max_splits: 8,
  default_cwd: "~",
  text_batch_ms: 600,
  typing_indicator: true,
  reactions: true, // ack on the trigger message: 👀 turn start -> ✅ delivered / ⚠️ failed
  guidelines: true, // beacon: inject Discord context + discord-guidelines.md into tagged sessions' system prompts
  guidelines_file: "", // beacon: guidelines markdown path ("" = <extension dir>/discord-guidelines.md)
  relay_external: true, // TUI relay (discord-visibility lap): user input that did NOT arrive via /send lands on the conversation's Discord surface with a provenance tag (beacon -> /internal/relay; knob chain mirrored in index.ts — keep both in sync)
  webui_base_url: "", // webui conversation deeplinks ("" = feature off): <base>#/s/<sessionId> rides /status rows, discord_thread tool results, and session-death notices
  first_response_link: true, // delivery-UX round 2 (2026-09-24 operator feedback): the FIRST finalized reply of a conversation appends the webui "view this conversation" line once — later replies stay clean; /status keeps its links row
  preview_min_edit_ms: 2500, // delivery-UX round 2: minimum interval between streaming-preview EDITS — intermediate edits collapse inside the window (REST spam + flicker fix); finalize's chunk-1 edit always lands the final text
  recovery: true, // durable recovery ledgers (hermes-catalog #2 + #7): missed-message replay + at-least-once reply delivery (below)
  attachments: true, // inbound attachments (hermes-catalog #3 slice 1): text-compatible attachments inline into the dispatch text; false = zero fetches, the message text alone
  attachment_max_bytes: 102400, // per-attachment inline cap (100KB) — an over-cap file never fetches whole; a one-line placeholder rides instead
};
// D10 renames from the pre-use scaffold; old keys carry over silently
const LEGACY_ALIASES = {
  mention_only: "require_mention",
  allowed_channel_ids: "allowed_channels",
};

// presence v1 (bot self-presence; presence-plan §6): sub-key deep-merged inside
// loadConfig — deliberately NOT a flat DEFAULTS key, so config.example.json
// (and its smoke key-set check) stays untouched
const PRESENCE_DEFAULTS = {
  enabled: false, // feature gate: disabled = zero op-3 sends, no timers
  type: 0, // 0 (Playing <name>, <state> in the profile pop-out) | 4 (custom status, text-only)
  name: "prime-agent",
  state_template: "{task} · {children}",
  idle_state: "listening",
  status: "auto", // auto | dnd | invisible — a forced value wins over the auto mapping
  debounce_ms: 3000,
};

function readConfigFile() {
  try {
    return (
      JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf-8")) ?? {}
    );
  } catch {
    return {};
  }
}
function envList(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function envBool(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  return raw === "1" || raw.toLowerCase() === "true";
}
function envStr(name) {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? undefined : raw;
}
function envNum(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
const asIds = (v) => (Array.isArray(v) ? v.map((x) => String(x)) : []);

// env > config.json > defaults, read at call time (house rule: edits need no reload)
function loadConfig() {
  const file = readConfigFile();
  const merged = { ...file };
  for (const [oldK, newK] of Object.entries(LEGACY_ALIASES)) {
    if (merged[oldK] !== undefined && merged[newK] === undefined)
      merged[newK] = merged[oldK];
  }
  const cfg = { ...DEFAULTS, ...merged };
  const env = {
    bot_token: envStr("DISCORD_BOT_TOKEN"),
    application_id: envStr("DISCORD_APPLICATION_ID"),
    allowed_guild_ids: envList("DISCORD_ALLOWED_GUILDS"),
    allowed_users: envList("DISCORD_ALLOWED_USERS"),
    allow_all_users: envBool("DISCORD_ALLOW_ALL_USERS"),
    allowed_channels: envList("DISCORD_ALLOWED_CHANNELS"),
    ignored_channels: envList("DISCORD_IGNORED_CHANNELS"),
    free_response_channels: envList("DISCORD_FREE_RESPONSE_CHANNELS"),
    allow_dm: envBool("DISCORD_ALLOW_DM"),
    require_mention: envBool("DISCORD_REQUIRE_MENTION"),
    auto_thread: envBool("DISCORD_AUTO_THREAD"),
    thread_policy: envStr("DISCORD_THREAD_POLICY"),
    thread_rename: envBool("DISCORD_THREAD_RENAME"),
    home_channel: envStr("DISCORD_HOME_CHANNEL"),
    allow_bots: envStr("DISCORD_ALLOW_BOTS"),
    reply_to_mode: envStr("DISCORD_REPLY_TO_MODE"),
    max_splits: envNum("DISCORD_MAX_SPLITS"),
    default_cwd: envStr("DISCORD_DEFAULT_CWD"),
    reactions: envBool("DISCORD_REACTIONS"),
    guidelines: envBool("DISCORD_GUIDELINES"),
    guidelines_file: envStr("DISCORD_GUIDELINES_FILE"),
    relay_external: envBool("DISCORD_RELAY_EXTERNAL"),
    webui_base_url: envStr("DISCORD_WEBUI_BASE_URL"),
    first_response_link: envBool("DISCORD_FIRST_RESPONSE_LINK"),
    preview_min_edit_ms: envNum("DISCORD_PREVIEW_MIN_EDIT_MS"),
    recovery: envBool("DISCORD_RECOVERY"),
    attachments: envBool("DISCORD_ATTACHMENTS"),
    attachment_max_bytes: envNum("DISCORD_ATTACHMENT_MAX_BYTES"),
  };
  for (const [k, v] of Object.entries(env)) if (v !== undefined) cfg[k] = v;
  // type-coerce the mutable knobs (config.json is hand-edited; be forgiving, not silent-broken)
  cfg.allowed_guild_ids = asIds(cfg.allowed_guild_ids);
  cfg.allowed_users = asIds(cfg.allowed_users);
  cfg.allowed_channels = asIds(cfg.allowed_channels);
  cfg.ignored_channels = asIds(cfg.ignored_channels);
  cfg.free_response_channels = asIds(cfg.free_response_channels);
  cfg.allow_all_users = cfg.allow_all_users === true;
  cfg.allow_dm = cfg.allow_dm === true;
  cfg.require_mention = cfg.require_mention !== false; // default true
  cfg.auto_thread = cfg.auto_thread !== false; // default true; legacy carry-over only — thread_policy is the semantic knob
  cfg.thread_rename = cfg.thread_rename !== false; // default true — thread renames (hermes-catalog #10)
  const tp = String(cfg.thread_policy); // "agent" (default) | "always"; anything else fails loud, never silently threads-everything or threads-nothing
  if (tp !== "agent" && tp !== "always")
    throw new Error(
      `config error: thread_policy must be "agent" or "always" — got ${JSON.stringify(
        tp,
      )}`,
    );
  cfg.thread_policy = tp;
  cfg.allow_bots = ["none", "mentions", "all"].includes(String(cfg.allow_bots))
    ? String(cfg.allow_bots)
    : "none";
  const rtm = String(cfg.reply_to_mode); // "all" is not implemented in the MVP — fail loud instead of silently acting as "first" (review finding 2)
  if (rtm === "all")
    throw new Error(
      'config error: reply_to_mode "all" is not implemented — use "first" (splits are always reply-chained, so "all" would behave identically)',
    );
  if (rtm !== "off" && rtm !== "first")
    throw new Error(
      `config error: reply_to_mode must be "off" or "first" — got ${JSON.stringify(
        rtm,
      )}`,
    );
  cfg.reply_to_mode = rtm;
  const splits = Number(cfg.max_splits);
  cfg.max_splits =
    Number.isFinite(splits) && splits >= 1 ? Math.floor(splits) : 8;
  const batch = Number(cfg.text_batch_ms);
  cfg.text_batch_ms =
    Number.isFinite(batch) && batch >= 0 ? Math.floor(batch) : 600;
  cfg.typing_indicator = cfg.typing_indicator !== false;
  cfg.reactions = cfg.reactions !== false; // default true
  cfg.recovery = cfg.recovery !== false; // default true — the durable ledgers (a false here means NO rows are written and NO boot replay happens; the flag is re-read at every write)
  cfg.attachments = cfg.attachments !== false; // default true — inbound text-doc injection; re-read per message
  const aCap = Number(cfg.attachment_max_bytes);
  cfg.attachment_max_bytes =
    Number.isFinite(aCap) && aCap > 0 ? Math.floor(aCap) : 102400; // junk falls back to the 100KB default, never a silently-broken cap
  cfg.guidelines = cfg.guidelines !== false; // default true — beacon prompt-injection gate (knob chain mirrored in index.ts — keep both in sync)
  cfg.guidelines_file = String(cfg.guidelines_file ?? ""); // "" = the beacon's default path
  cfg.relay_external = cfg.relay_external !== false; // default true — the TUI relay (knob chain mirrored in index.ts — keep both in sync)
  cfg.first_response_link = cfg.first_response_link !== false; // default true — the one-shot webui line on a conversation's first delivered reply
  const pvMin = Number(cfg.preview_min_edit_ms);
  cfg.preview_min_edit_ms =
    Number.isFinite(pvMin) && pvMin >= 0 ? Math.floor(pvMin) : 2500; // junk falls back to the default, never a silently-broken throttle
  cfg.webui_base_url = String(cfg.webui_base_url ?? "").trim();
  if (cfg.webui_base_url && !/^https?:\/\//.test(cfg.webui_base_url))
    throw new Error(
      `config error: webui_base_url must be an http(s):// URL — got ${JSON.stringify(
        cfg.webui_base_url,
      )}`,
    );
  if (cfg.webui_base_url)
    cfg.webui_base_url = cfg.webui_base_url.replace(/\/+$/, ""); // trailing slash normalized away — the deeplink is <base>#/s/<sessionId>
  cfg.bot_token = String(cfg.bot_token ?? "");
  cfg.application_id = String(cfg.application_id ?? "");
  cfg.home_channel = String(cfg.home_channel ?? "");
  cfg.default_cwd = String(cfg.default_cwd ?? "~") || "~";
  // presence v1: defaults < config.json < env per sub-key (a partial presence
  // object never silently loses defaults); a non-object block, like type/status,
  // fails config load loud — never silently disabled
  if (
    cfg.presence !== undefined &&
    cfg.presence !== null &&
    (typeof cfg.presence !== "object" || Array.isArray(cfg.presence))
  ) {
    throw new Error(
      `config error: presence must be an object — got ${JSON.stringify(
        cfg.presence,
      )}`,
    );
  }
  const pFile = cfg.presence ?? {};
  const pcfg = { ...PRESENCE_DEFAULTS, ...pFile };
  const pEnv = {
    enabled: envBool("DISCORD_PRESENCE_ENABLED"),
    type: envNum("DISCORD_PRESENCE_TYPE"),
    name: envStr("DISCORD_PRESENCE_NAME"),
    state_template: envStr("DISCORD_PRESENCE_STATE_TEMPLATE"),
    idle_state: envStr("DISCORD_PRESENCE_IDLE_STATE"),
    status: envStr("DISCORD_PRESENCE_STATUS"),
    debounce_ms: envNum("DISCORD_PRESENCE_DEBOUNCE_MS"),
  };
  for (const [k, v] of Object.entries(pEnv)) if (v !== undefined) pcfg[k] = v;
  pcfg.enabled = pcfg.enabled === true;
  const pType = Number(pcfg.type);
  if (pType !== 0 && pType !== 4)
    throw new Error(
      `config error: presence.type must be 0 or 4 — got ${JSON.stringify(
        pcfg.type,
      )}`,
    );
  const pStatus = String(pcfg.status);
  if (!["auto", "dnd", "invisible"].includes(pStatus))
    throw new Error(
      `config error: presence.status must be "auto", "dnd" or "invisible" — got ${JSON.stringify(
        pcfg.status,
      )}`,
    );
  const pDeb = Number(pcfg.debounce_ms);
  pcfg.type = pType;
  pcfg.status = pStatus;
  pcfg.name = String(pcfg.name ?? "") || PRESENCE_DEFAULTS.name;
  pcfg.state_template =
    String(pcfg.state_template ?? "") || PRESENCE_DEFAULTS.state_template;
  pcfg.idle_state = String(pcfg.idle_state ?? "");
  pcfg.debounce_ms = Number.isFinite(pDeb)
    ? Math.min(Math.max(pDeb, 0), 5000)
    : PRESENCE_DEFAULTS.debounce_ms;
  cfg.presence = pcfg;
  return cfg;
}

// ---------- internal beacon<->bot token (D9; identical chain in index.ts — keep in sync) ----------
// chain (webui-beacon alignment, 2026-09-28): env DISCORD_EXT_TOKEN ->
// config.json ext_token -> token file (discord-token, 0600 — read fallback +
// one-time migration source only, never written again) -> auto-generate +
// persist to config. Never logged (only the source is).
const TOKEN_FILE =
  process.env.DISCORD_TOKEN_FILE ?? path.join(HERE, "discord-token");
const CONFIG_FILE = path.join(HERE, "config.json");
// atomic read-modify-write: every other key preserved, the file's formatting
// discipline (2-space indent + trailing newline), tmp+rename swap, 0600 kept
// when the file already has it (a fresh file defaults to 0600)
function writeExtTokenToConfig(token, configFile) {
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(configFile, "utf-8")) ?? {};
  } catch {} // missing/corrupt -> fresh object (readConfigFile discipline)
  if (cfg.ext_token === token) return; // already there — idempotent no-op (both migrators race-safe)
  const next = { ...cfg, ext_token: token };
  let mode = 0o600;
  try {
    mode = fs.statSync(configFile).mode & 0o777;
  } catch {}
  const tmp = `${configFile}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n", { mode });
  try {
    fs.chmodSync(tmp, mode);
  } catch {}
  fs.renameSync(tmp, configFile);
}
// one-time migration (pre-reorder installs): the machine token lived in the
// discord-token file — fold it into config.json ext_token, then delete the
// file. Idempotent + atomic: the bot AND the beacon may both run it;
// last-write-wins carries the same value. A failed config write keeps the
// file (the token never exists in zero places).
function migrateTokenFileToConfig(token, tokenFile, configFile) {
  try {
    writeExtTokenToConfig(token, configFile);
  } catch (e) {
    log("token migration to config failed:", e?.message ?? e);
    return false;
  }
  try {
    fs.unlinkSync(tokenFile);
  } catch {} // benign: config wins the chain — an orphaned file is inert
  return true;
}
// the chain, parameterized for the smoke's config twin (production entry:
// resolveToken, live paths). Identical in index.ts — keep both in sync.
function resolveTokenFor(tokenFile, configFile) {
  if (process.env.DISCORD_EXT_TOKEN)
    return { token: process.env.DISCORD_EXT_TOKEN, source: "env" };
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(configFile, "utf-8")) ?? {};
  } catch {}
  if (cfg.ext_token) return { token: String(cfg.ext_token), source: "config" };
  let t = "";
  try {
    t = fs.readFileSync(tokenFile, "utf-8").trim();
  } catch {}
  if (t)
    return {
      token: t,
      source: migrateTokenFileToConfig(t, tokenFile, configFile)
        ? "config"
        : "file",
    };
  const token = crypto.randomUUID();
  try {
    writeExtTokenToConfig(token, configFile);
  } catch (e) {
    // generated: config is the canonical store — the file path is never written again
    log("token persist failed:", e?.message ?? e);
  }
  return { token, source: "generated" };
}
function resolveToken() {
  return resolveTokenFor(TOKEN_FILE, CONFIG_FILE);
}
const { token: TOKEN, source: TOKEN_SOURCE } = resolveToken();

// constant-time compare, length pre-checked (leaks only the length);
// timingSafeEqual throws on mismatched lengths
function tokenEq(presented, expected) {
  const a = Buffer.from(String(presented)),
    b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
let noTokenWarned = false;
function authed(req) {
  if (!TOKEN) {
    // fail-closed: a tokenless bot serves nothing on /internal/*
    if (!noTokenWarned) {
      log(
        "auth fail-closed: no internal token resolved — rejecting all /internal calls",
      );
      noTokenWarned = true;
    }
    return false;
  }
  return tokenEq(req.headers["x-prime-token"], TOKEN);
}

// ---------- runtime state ----------
const PORT = parseInt(process.env.DISCORD_BOT_PORT ?? "8790", 10);
const SESSIONS_DIR =
  process.env.DISCORD_SESSIONS_DIR ??
  path.join(os.homedir(), ".prime", "agent", "sessions");
const startedAt = Date.now();

const sessions = new Map(); // sessionId -> {sessionId, controlPort, pid, convKey, name, cwd, status, lastSeen} (register rows; /status display)
const routing = new Map(); // convKey -> {sessionId, controlPort, pid, spawnPid} (ONLY the conversation's claimed session — the scope guard; pid = beacon's daemon-tree pid, spawnPid = our wrapper)
const claims = new Map(); // convKey -> {at, cwd, known, sessionId, spawnPid} — spawn->session causal claim (webui pattern; pid matching is unusable here: beacons register daemon-tree pids, never the launcher's)
const spawned = new Map(); // pid -> child process (stdin pipe must stay referenced or the rpc child dies; also the SIGTERM handle for register timeout and /reset)
const pendingByConv = new Map(); // convKey -> {texts:[{triggerMessageId,text}], channelId, spawned, spawnAt, pid} (dispatch queued until register; pid = our wrapper, killed on register timeout)
const streamers = new Map(); // convKey -> {channelId, triggerChannelId, triggerMessageId, previewId, previewShown, lastEditAt, busy, typingTimer, turnToken}
const batchers = new Map(); // convKey -> {items:[{triggerMessageId,text}], timer, channelId}
const channels = new Map(); // channelId -> {id, type, parent_id} (seeded from GUILD_CREATE, REST-backfilled)
const dedup = new Map(); // messageId -> 1, insertion-ordered LRU (~1k)
const warnOnce = {}; // gate -> true after its one-time warning fired
const verdicts = new Map(); // convKey -> latest claim-reject reason (the 2026-09-27 register-reason strings) — /status "down" rows surface it; display-only, the log lines stay the source of truth
let shuttingDown = false;

// ---------- conversations ledger (disk is truth; D3) ----------
const LEDGER_PATH = SMOKE
  ? path.join(HERE, "conversations.smoke.json")
  : path.join(HERE, "conversations.json"); // smoke keeps its ledger writes off the live bot's resume file
function loadLedger() {
  try {
    return new Map(
      Object.entries(JSON.parse(fs.readFileSync(LEDGER_PATH, "utf-8")) ?? {}),
    );
  } catch {
    return new Map();
  }
}
const ledger = loadLedger(); // convKey -> {sessionId, cwd, channel_id, created, lastActive, name?}
function reapLedger() {
  // 2026-09-23 operator: "(none) down" rows never reap — a null-session row past LEDGER_REAP_MS drops from display AND file at save time; id'd rows stay (their sessions may resume)
  const cut = Date.now() - LEDGER_REAP_MS;
  for (const [k, v] of ledger) {
    if (v?.sessionId != null) continue;
    const la = Date.parse(v?.lastActive ?? "");
    if (!Number.isFinite(la) || la < cut) {
      ledger.delete(k);
      verdicts.delete(k);
    }
  }
}
function saveLedger() {
  try {
    reapLedger();
    const tmp = LEDGER_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(ledger), null, 2));
    fs.renameSync(tmp, LEDGER_PATH);
  } catch (e) {
    log("ledger save failed:", e?.message ?? e);
  }
}

// message-id dedup LRU: Discord RESUME replays events (hermes pattern #10)
function dedupAdd(id) {
  if (dedup.has(id)) return false;
  dedup.set(id, 1);
  if (dedup.size > 1000) dedup.delete(dedup.keys().next().value);
  return true;
}

// ---------- durable recovery (hermes-catalog #2 + #7): missed-message ledger + delivery-obligation ledger ----------
// Hermes' gateway closes two crash windows with durable ledgers (SQLite there:
// plugins/platforms/discord/recovery.py:55-80 + gateway/delivery_ledger.py:1-11);
// here they are zero-dep append-only JSONL — the shapes the single-writer bot needs:
//  1. INBOUND (crash between admit and dispatch acceptance): every ADMITTED message
//     appends a pending row to recovery/<convKey>.jsonl BEFORE dispatch; the row
//     flips to done (a done-marker row — append is the atomic commit) once a session
//     accepts the dispatch. On boot (gateway READY, once per process) pending rows
//     written before the boot REPLAY through the normal dispatch path (claim and
//     self-heal included), the CURRENT admission gates re-check each row (config
//     may have changed during downtime; a denial drops the row with a log), and a
//     ♻️ notice posts to each conversation that had N>0 recoveries.
//  2. OUTBOUND (failure between finalize and the Discord ACK): a reply whose REST
//     delivery failed TERMINALLY (every split path AND the consolidated fallback)
//     persists to recovery/<convKey>.delivery.jsonl and is retried on the next
//     dispatch to that conversation or by the 60s sweep — at-least-once, with the
//     visible ♻️ marker hermes uses (delivery_ledger.py:37-49: an ambiguous send
//     may duplicate; the marker says so honestly). The delivered message id is
//     recorded on the done row; a delivered row never re-posts.
// Text storage decision: RAW dispatch text is stored — re-dispatch needs the exact
// bytes (a hash could only detect pending-ness, not replay the message); privacy
// is bounded by 0600 files, a 0700 dir, gitignore, and the boot prune.
// Everything here is fail-soft: a ledger failure NEVER blocks message flow
// (hermes recovery.py:35-53). ponytail: the caps below are enforced at boot-prune
// only — a long-lived boot can grow a file past 1k rows between restarts; the
// next boot compacts it.
const RECOVERY_DIR = SMOKE
  ? path.join(HERE, "recovery.smoke")
  : path.join(HERE, "recovery"); // the smoke keeps its rows off the live bot's ledgers (LEDGER_PATH twin)
const RECOVERY_HORIZON_MS = 30 * 24 * 60 * 60 * 1000; // 30-day retention (hermes recovery.py:19)
const RECOVERY_MAX_ROWS = 1000; // per-conversation cap, boot-prune time
const RECOVERY_REPLY_PREFIX =
  "♻️ recovered a reply that failed to deliver earlier:\n\n"; // the honest at-least-once marker (hermes ♻️ semantics)
const recoveryEnabled = (cfg) => cfg?.recovery !== false;
const recoveryFile = (convKey) => path.join(RECOVERY_DIR, `${convKey}.jsonl`);
const recoveryDeliveryFile = (convKey) =>
  path.join(RECOVERY_DIR, `${convKey}.delivery.jsonl`);
function recoveryAppend(file, row) {
  // fail-soft append; 0600 on create, the dir 0700
  try {
    fs.mkdirSync(RECOVERY_DIR, { recursive: true, mode: 0o700 });
    fs.appendFileSync(file, JSON.stringify(row) + "\n", { mode: 0o600 });
    return true;
  } catch (e) {
    log(
      "recovery write failed (fail-soft, message flow continues):",
      e?.message ?? e,
    );
    return false;
  }
}
function recoveryRows(file) {
  // read the append-only log, reduce to the LATEST row per id (a done marker shadows its pending row — that shadow IS the bot-side durable dedup by message id)
  let raw;
  try {
    raw = fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
  const byId = new Map();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r?.id != null) byId.set(String(r.id), r);
    } catch {
      log(`recovery: skipping a corrupt row in ${path.basename(file)}`);
    }
  }
  return byId;
}
// (1) the admitted-message hook (handleMessage): pending row BEFORE dispatch
function recoveryAdmit(row, cfg) {
  if (!recoveryEnabled(cfg)) return false;
  return recoveryAppend(recoveryFile(row.convKey), {
    ...row,
    state: "pending",
  });
}
// the dispatch-acceptance flip (flushBatch): a done-MARKER row per message id
function recoveryMarkDone(convKey, ids) {
  if (!recoveryEnabled(loadConfig())) return;
  for (const id of ids ?? [])
    recoveryAppend(recoveryFile(convKey), {
      id: String(id),
      ts: nowIso(),
      convKey,
      state: "done",
    });
}
// (2) the finalize-failure hook: the reply is OWED — persist it before anything else can lose it
function recoveryPersistDelivery(convKey, channelId, text, cfg) {
  if (!recoveryEnabled(cfg)) return false;
  const id = `d-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`; // row id (no Discord message id exists yet — nothing landed)
  return recoveryAppend(recoveryDeliveryFile(convKey), {
    id,
    ts: nowIso(),
    convKey,
    channelId,
    text,
    state: "pending",
  });
}
async function recoverySendRecoveredReply(row) {
  // the ♻️ redelivery: chunked like finalize, paced like finalize
  const chunks = splitChunks(
    String(row.text ?? ""),
    SPLIT_THRESHOLD - RECOVERY_REPLY_PREFIX.length,
  );
  if (!chunks.length) return null;
  let firstId = null,
    prevId = null;
  for (let i = 0; i < chunks.length; i++) {
    if (prevId != null) await sleep(sendPaceMs());
    const m = await rest
      .sendMessage(
        row.channelId,
        (i === 0 ? RECOVERY_REPLY_PREFIX : "") + chunks[i],
        {},
      )
      .catch((e) => {
        log(
          `recovery: redelivery chunk ${i + 1}/${chunks.length} failed: ${
            e?.message ?? e
          }`,
        );
        return null;
      }); // chunks 2..N plain — the 2026-09-24 operator reference rule (a block's first chunk carries the only reference; this one is prefix-tagged anyway)
    if (!m) return null; // a failed chunk stops the chain — the row stays pending; the next trigger retries
    if (firstId == null) firstId = m.id;
    prevId = m.id;
  }
  return firstId;
}
function recoveryRemap(oldKey, newKey) {
  // thread promotion moves the conversation: the rows must follow, or flushBatch's done markers land beside orphaned pending rows (a next-boot double dispatch)
  if (oldKey === newKey || !recoveryEnabled(loadConfig())) return;
  for (const [from, to] of [
    [recoveryFile(oldKey), recoveryFile(newKey)],
    [recoveryDeliveryFile(oldKey), recoveryDeliveryFile(newKey)],
  ]) {
    try {
      if (!fs.existsSync(from)) continue;
      if (fs.existsSync(to)) {
        // unexpected (the new key is fresh) — merge, never clobber
        fs.appendFileSync(to, fs.readFileSync(from, "utf-8"), { mode: 0o600 });
        fs.rmSync(from);
      } else fs.renameSync(from, to);
    } catch (e) {
      log("recovery remap failed (fail-soft):", e?.message ?? e);
    }
  }
}
const deliveryDraining = new Set(); // convKey -> a drain is in flight (the dispatch hook and the sweep race; a row appended mid-drain waits for the next trigger)
async function recoveryDrainDelivery(convKey) {
  if (!recoveryEnabled(loadConfig())) return;
  if (deliveryDraining.has(convKey)) return;
  deliveryDraining.add(convKey);
  try {
    const file = recoveryDeliveryFile(convKey);
    const byId = recoveryRows(file);
    if (!byId) return;
    for (const row of byId.values()) {
      if (row.state !== "pending") continue; // the dedup guard: a done row (delivered message id recorded) never re-posts
      const deliveredId = await recoverySendRecoveredReply(row);
      if (deliveredId != null)
        recoveryAppend(file, {
          ...row,
          state: "done",
          deliveredMessageId: deliveredId,
          doneAt: nowIso(),
        });
      // a failed redelivery leaves the row pending — the next dispatch or sweep retries
    }
  } finally {
    deliveryDraining.delete(convKey);
  }
}
async function recoveryDrainAllDeliveries() {
  let files = [];
  try {
    files = fs.readdirSync(RECOVERY_DIR);
  } catch {
    return;
  }
  for (const f of files) {
    if (!f.endsWith(".delivery.jsonl")) continue;
    await recoveryDrainDelivery(f.slice(0, -".delivery.jsonl".length));
  }
}
if (!SMOKE)
  setInterval(
    () =>
      recoveryDrainAllDeliveries().catch((e) =>
        log("recovery delivery sweep failed:", e?.message ?? e),
      ),
    60 * 1000,
  ); // owed-reply retry while the bot lives (recovery ledger #2)
// boot prune (hermes recovery.py:59-80's retention sweep, JSONL shape): compact
// every ledger file to one row per id, drop rows past the 30-day horizon
// (pending too — the conversation is long past them), cap at 1k rows per
// conversation (done rows evicted first), then hand the replayable pending
// rows (written before THIS boot) to the scan. The prune is SYNCHRONOUS by
// design — no awaits inside — so the event loop cannot interleave an append
// between the read and the rename (a concurrent recoveryAdmit lands before
// or after the whole block, never on the replaced inode)
let recoveryScanned = false;
function recoveryPrune() {
  const out = new Map(); // convKey -> [pending rows with ts < startedAt]
  let files = [];
  try {
    files = fs.readdirSync(RECOVERY_DIR);
  } catch {
    return out;
  }
  const cut = Date.now() - RECOVERY_HORIZON_MS;
  for (const f of files) {
    if (!f.endsWith(".jsonl")) continue;
    const file = path.join(RECOVERY_DIR, f);
    const isDelivery = f.endsWith(".delivery.jsonl");
    const convKey = f.slice(
      0,
      -(isDelivery ? ".delivery.jsonl" : ".jsonl").length,
    );
    const byId = recoveryRows(file);
    if (!byId) continue;
    const keep = [];
    for (const row of byId.values()) {
      const ts = Date.parse(row.ts ?? "");
      if (!Number.isFinite(ts) || ts < cut) {
        if (row.state === "pending")
          log(
            `recovery: dropped a pending row past the 30-day horizon (${f}, id ${row.id})`,
          );
        continue;
      }
      keep.push(row);
    }
    keep.sort(
      (a, b) =>
        (a.state === "pending" ? 0 : 1) - (b.state === "pending" ? 0 : 1) ||
        Date.parse(a.ts ?? "0") - Date.parse(b.ts ?? "0"),
    ); // pending first, oldest first — the cap evicts done rows before pending ones
    const trimmed = keep.slice(0, RECOVERY_MAX_ROWS);
    try {
      const tmp = file + ".tmp";
      fs.writeFileSync(
        tmp,
        trimmed.map((r) => JSON.stringify(r)).join("\n") +
          (trimmed.length ? "\n" : ""),
        { mode: 0o600 },
      );
      fs.renameSync(tmp, file); // temp + rename = the atomic commit (saveLedger pattern)
    } catch (e) {
      log(`recovery prune of ${f} failed:`, e?.message ?? e);
    }
    if (isDelivery) continue; // owed replies drain via dispatch/sweep, not the boot scan
    const replayable = trimmed.filter(
      (r) => r.state === "pending" && Date.parse(r.ts ?? "") < startedAt,
    ); // rows from BEFORE this process booted (in-flight batching rows belong to this boot)
    if (replayable.length) out.set(convKey, replayable);
  }
  return out;
}
// the replay gate re-check: the row replays only if it STILL passes the CURRENT
// ladder (config may have changed during downtime — a denial drops the row with a log)
async function recoveryReplayCheck(row, cfg) {
  // the synthetic msg: identity gates only — mention tokens are already stripped
  // from the stored text, so a bot-authored row replays only under allow_bots=all
  // ("mentions" needs the raw <@bot> token: honestly dropped + logged, never re-admitted)
  const synthetic = {
    id: String(row.id),
    guild_id: row.guildId ?? null,
    channel_id: String(row.channelId),
    author: { id: String(row.authorId ?? ""), bot: !!row.authorBot },
  };
  const adm = await evaluateAdmission(synthetic, cfg); // gate 1 claims the id in the dedup LRU — a later gateway replay of the same id drops
  if (!adm.ok) return { ok: false, drop: `${adm.gate}: ${adm.reason}` };
  if (row.guildId) {
    // shared surfaces re-check the mention gate; DMs skip it (allow_dm was the gate — handleMessage parity)
    const keys = CHANNEL_KEYS(await channelInfo(row.channelId));
    if (!passesMentionGate(keys, row.convKey, cfg, !!row.mentioned))
      return {
        ok: false,
        drop: "mention: un-mentioned and no mapped conversation",
      };
  }
  return { ok: true };
}
async function recoveryBootScan() {
  // gateway READY fires this once per process
  if (recoveryScanned) return; // READY re-fires on reconnects — one scan per boot
  recoveryScanned = true;
  const cfg = loadConfig();
  if (!recoveryEnabled(cfg)) return;
  const pending = recoveryPrune();
  for (const [convKey, rows] of pending) {
    const keepers = [];
    for (const row of rows) {
      const verdict = await recoveryReplayCheck(row, cfg);
      if (verdict.ok) keepers.push(row);
      else {
        log(
          `recovery: replay of msg ${row.id} (conv ${convKey}) denied by the CURRENT gates — ${verdict.drop}; dropping the row`,
        );
        recoveryAppend(recoveryFile(convKey), {
          id: String(row.id),
          ts: nowIso(),
          convKey,
          state: "done",
          dropped: verdict.drop,
        }); // terminal: never replayed again, reason auditable on the row
      }
    }
    if (!keepers.length) continue;
    await rest
      .sendMessage(
        keepers[0].channelId,
        `♻️ recovered ${keepers.length} missed message${
          keepers.length === 1 ? "" : "s"
        } from while I was down`,
        {},
      )
      .catch((e) =>
        log(`recovery notice to ${convKey} failed:`, e?.message ?? e),
      ); // the honesty marker hermes lacks (harvest correction 5): recovery must be visible
    for (const row of keepers) {
      try {
        await dispatchToConversation(
          row.convKey,
          String(row.channelId),
          String(row.triggerChannelId ?? row.channelId),
          String(row.id),
          String(row.text ?? ""),
          row.authorId ?? null,
        ); // the normal path: beacon /send, self-heal respawn, spawn + causal claim
        recoveryMarkDone(row.convKey, [row.id]);
      } catch (e) {
        log(
          `recovery: replay dispatch of msg ${row.id} (conv ${convKey}) failed — the row stays pending for the next boot:`,
          e?.message ?? e,
        );
      }
    }
    log(
      `recovery: replayed ${keepers.length} missed message${
        keepers.length === 1 ? "" : "s"
      } to ${convKey}`,
    );
  }
}

// ---------- dispatch dedupe (2026-09-24 dm duplicate pairs, operator live
// feedback): a per-conversation LRU of recently-dispatched trigger ids, checked
// at dispatch ADMISSION. The recovery ledger's done rows ARE the durable record
// (a done marker = a session accepted that dispatch); the LRU lazy-seeds from
// them at first touch, so a repeat dies at admission across restarts too. This
// is the belt under the /send-ack skip in dispatchToConversation: ANY path that
// re-enters dispatch for an id already sent drops with one audit line.
const DISPATCH_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000; // generous window — a repeat inside 24h is never a new operator intent
const DISPATCH_DEDUPE_MAX = 200; // per-conversation LRU cap; the ledger's 30-day boot prune bounds the durable side
const dispatchSeen = new Map(); // convKey -> Map(id -> admittedAt ms)
function dispatchSeenOf(convKey) {
  let m = dispatchSeen.get(convKey);
  if (!m) {
    m = new Map();
    const byId = recoveryRows(recoveryFile(convKey)); // durable seed: DONE rows only — a pending row's replay obligation survives a restart
    if (byId)
      for (const row of byId.values())
        if (row.state === "done")
          m.set(String(row.id), Date.parse(row.ts ?? "") || Date.now());
    dispatchSeen.set(convKey, m);
  }
  return m;
}
function dispatchAdmit(convKey, id) {
  // true = first dispatch inside the window; false = repeat (drop at admission)
  const m = dispatchSeenOf(convKey);
  const now = Date.now();
  const at = m.get(id);
  if (at != null && now - at < DISPATCH_DEDUPE_WINDOW_MS) return false;
  m.delete(id);
  m.set(id, now); // fresh entry at the LRU tail (Map keeps insertion order)
  while (m.size > DISPATCH_DEDUPE_MAX) m.delete(m.keys().next().value); // oldest-first eviction
  return true;
}

// ---------- channel identity ----------
const CHANNEL_KEYS = (info) => [info?.id, info?.parent_id].filter(Boolean); // gates match threads by parent too (hermes :4756-4781)
async function channelInfo(id) {
  let info = channels.get(String(id));
  if (info) return info;
  try {
    const c = await rest.getChannel(id);
    if (c?.id) {
      info = {
        id: String(c.id),
        type: c.type,
        parent_id: c.parent_id ? String(c.parent_id) : null,
      };
      channels.set(info.id, info);
    }
  } catch (e) {
    log(`channel fetch ${id} failed: ${e?.message ?? e}`);
  }
  return info ?? { id: String(id), type: 0, parent_id: null }; // degraded: treat as plain text channel (fail-closed gates still apply)
}
const isThreadType = (t) => t === 11 || t === 12;

// ---------- Discord REST (native fetch; allowed_mentions deny rides every send, D5) ----------
class RestError extends Error {
  constructor(status, body) {
    super(`HTTP ${status}: ${body}`);
    this.status = status;
  }
}
// rate-limit state (production 2026-09-25, thread 1552402301740654662): retry-once
// honored retry_after only for the failed request — every OTHER request kept
// POSTing into the saturated channel bucket, so it never drained and the whole
// reply died. Now a 429 parks ALL requests to that route bucket until
// retry_after (+margin) passes. In-process map + timestamps, no deps.
const bucketCooldowns = new Map(); // bucketKey -> pause-until epoch ms
let globalCooldownUntil = 0; // Discord "global": true 429s pause every route
const bucketKeyOf = (apiPath, method = "") => {
  let m;
  if (method === "PATCH" && (m = apiPath.match(/^\/channels\/([^/]+)$/)))
    return `chanpatch:${m[1]}`; // thread renames PATCH the bare channel route: own bucket — a rename 429 must never park getChannel's reads (hot gate path), and a saturated message bucket can never queue a rename
  if ((m = apiPath.match(/^\/channels\/([^/]+)\/messages\/[^/]+\/reactions/)))
    return `reactions:${m[1]}`; // reactions have their own cheap bucket — a saturated message bucket must not queue the ack
  if ((m = apiPath.match(/^\/channels\/([^/]+)\/messages/)))
    return `messages:${m[1]}`; // create + edit share the channel's message bucket
  if ((m = apiPath.match(/^\/channels\/([^/]+)\/typing/)))
    return `typing:${m[1]}`;
  if ((m = apiPath.match(/^\/channels\/([^/]+)\/threads/)))
    return `threads:${m[1]}`;
  return apiPath;
};
const parseRetryAfter = (data) => {
  let s = Number(data?.retry_after) || 1;
  if (s > 100) s /= 1000; // ponytail: modern routes report seconds, legacy message routes ms — heuristic holds for both; upgrade: parse X-RateLimit headers
  return Math.min(s, 30);
};
async function bucketWaitKey(key) {
  for (;;) {
    // slice-wait: each pause is bounded (<=30s+margin by construction), so no request parks forever
    const remain =
      Math.max(bucketCooldowns.get(key) ?? 0, globalCooldownUntil) - Date.now();
    if (remain <= 0) return;
    await sleep(Math.min(remain, 1000));
  }
}
async function bucketWait(apiPath, method = "") {
  return bucketWaitKey(bucketKeyOf(apiPath, method));
} // attachment CDN GETs park their OWN key via bucketWaitKey — a slow CDN never queues a message send
const isUnknownReferenceError = (e) =>
  e instanceof RestError &&
  e.status === 400 &&
  String(e.message).includes("MESSAGE_REFERENCE_UNKNOWN_MESSAGE");
const isUnknownMessageError = (e) =>
  e instanceof RestError &&
  (e.status === 404 ||
    (e.status === 400 && /"code":\s*10008/.test(String(e.message))));
const rest = {
  async request(method, apiPath, body, retried429 = false) {
    await bucketWait(apiPath, method); // every request honors the bucket's cooldown — not just the one that got 429ed
    let res;
    try {
      res = await fetch(API_BASE + apiPath, {
        method,
        headers: {
          authorization: `Bot ${loadConfig().bot_token}`,
          "content-type": "application/json",
          "user-agent": "prime-agent-discord (zero-dep extension)",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      throw new RestError(0, String(e?.message ?? e));
    }
    if (res.status === 429) {
      const raw = await res.text().catch(() => "");
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}
      const s = parseRetryAfter(data);
      const until = Date.now() + s * 1000 + RATE_LIMIT_MARGIN_MS;
      if (data?.global)
        globalCooldownUntil = Math.max(globalCooldownUntil, until);
      else {
        const k = bucketKeyOf(apiPath, method);
        bucketCooldowns.set(k, Math.max(bucketCooldowns.get(k) ?? 0, until));
      }
      if (!retried429) {
        // honor retry_after once — with the bucket parked, the retry lands on a drained bucket
        log(`429 on ${apiPath} — retrying after ${s}s`);
        return rest.request(method, apiPath, body, true);
      }
      throw new RestError(429, raw.slice(0, 300)); // second consecutive 429 surfaces to the caller (bounded retry discipline)
    }
    if (res.status >= 400) {
      const text = await res.text().catch(() => "");
      throw new RestError(res.status, text.slice(0, 300));
    }
    if (res.status === 204) return null;
    return res.json().catch(() => null);
  },
  async sendMessage(channelId, content, opts = {}) {
    if (!String(content ?? "").trim()) {
      log("sendMessage: refusing empty content (caller bug)");
      return null;
    } // refuse-to-send (hermes :2840-2847)
    const payload = {
      content: String(content).slice(0, MAX_MESSAGE_LENGTH),
      allowed_mentions: { parse: [] },
    };
    if (opts.replyTo)
      payload.message_reference = { message_id: String(opts.replyTo), type: 0 }; // ping-deny at the transport (D5)
    const post = () =>
      rest.request("POST", `/channels/${channelId}/messages`, payload);
    try {
      const m = await post();
      return m && m.id ? m : null;
    } catch (e) {
      // production 2026-09-25: a type-0 reference resolves in-channel only — the
      // auto-thread trigger lives in the PARENT channel, so every preview create
      // 400ed MESSAGE_REFERENCE_UNKNOWN and the reply died. A fresh send beats a dead reply.
      if (payload.message_reference && isUnknownReferenceError(e)) {
        log(
          "sendMessage: reply reference rejected — retrying as a fresh message",
        );
        delete payload.message_reference;
        const m = await post();
        return m && m.id ? m : null;
      }
      throw e;
    }
  },
  async editMessage(channelId, messageId, content) {
    if (!String(content ?? "").trim()) {
      log("editMessage: refusing empty content (caller bug)");
      return null;
    }
    return rest.request(
      "PATCH",
      `/channels/${channelId}/messages/${messageId}`,
      {
        content: String(content).slice(0, MAX_MESSAGE_LENGTH),
        allowed_mentions: { parse: [] },
      },
    );
  },
  async typing(channelId) {
    return rest.request("POST", `/channels/${channelId}/typing`);
  },
  async addReaction(channelId, messageId, emoji) {
    // both 204 No Content; unicode emoji rides the URL-encoded name
    return rest.request(
      "PUT",
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(
        emoji,
      )}/@me`,
    );
  },
  async removeReaction(channelId, messageId, emoji) {
    return rest.request(
      "DELETE",
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(
        emoji,
      )}/@me`,
    );
  },
  async createThread(channelId, messageId, name) {
    const payload = {
      type: 11,
      name: String(name).slice(0, 80),
      message_id: String(messageId),
      auto_archive_duration: 1440,
    }; // type 11 = PUBLIC — production 2026-09-23: from-message creates came back PRIVATE (type 12, bot-only); belt-and-braces with the member-add
    try {
      return await rest.request(
        "POST",
        `/channels/${channelId}/threads`,
        payload,
      );
    } catch (e) {
      if (payload.type === undefined) throw e; // already retried without the hint — surface the failure
      delete payload.type; // the type hint is belt-and-braces — an API that hard-rejects it must not kill auto-threading
      log(
        `thread create with type 11 rejected (${
          e?.message ?? e
        }) — retrying without the type hint`,
      );
      return rest.request("POST", `/channels/${channelId}/threads`, payload);
    }
  },
  async addThreadMember(threadId, userId) {
    return rest.request(
      "PUT",
      `/channels/${threadId}/thread-members/${userId}`,
    );
  }, // 204 No Content — visibility is the feature (production 2026-09-23 private-thread trap)
  async patchThreadName(threadId, name) {
    return rest.request("PATCH", `/channels/${threadId}`, {
      name: String(name),
    });
  }, // thread rename (hermes-catalog #10): the register path mirrors the session's registered name onto the thread
  async getChannel(channelId) {
    return rest.request("GET", `/channels/${channelId}`);
  },
  async gatewayBot() {
    return rest.request("GET", "/gateway/bot");
  },
  async interactionCallback(interactionId, interactionToken, content) {
    return rest.request(
      "POST",
      `/interactions/${interactionId}/${interactionToken}/callback`,
      {
        type: 4,
        data: {
          content: String(content).slice(0, SPLIT_THRESHOLD),
          allowed_mentions: { parse: [] },
        },
      },
    ); // must land within 3s of INTERACTION_CREATE
  },
  async registerGuildCommands(applicationId, guildId, commands) {
    return rest.request(
      "PUT",
      `/applications/${applicationId}/guilds/${guildId}/commands`,
      commands,
    );
  },
};

// ---------- thread renames (hermes-catalog #10: the thread sidebar becomes the session index) ----------
// A ROUTED session's registered name mirrors onto its thread (PATCH
// /channels/{threadId} {name}). Only-if-changed guard: beacons re-register
// every ~15s heartbeat, and the per-conversation cache skips the PATCH unless
// the name CHANGED at the source — one PATCH per rename, never one per
// heartbeat. The cache holds the last name WE set, never the thread's
// current name: this path reads nothing (no GET, no gateway intent), so a
// manual operator rename is never detected — and never fought either. The
// heartbeats keep carrying the unchanged session name, which still equals
// the cache, so the manual name survives until the session's name changes
// at the source; the next change re-asserts then (README caveat). The cache
// is set EAGERLY (before the PATCH): a failing rename warns once and is not
// retried — the next attempt rides the next name change or a bot restart
// (a restart re-asserts once per routed thread). Fire-and-forget by
// contract: a rename can never block or fail a register.
const THREAD_NAME_MAX = 100; // Discord caps thread names at 100 chars (the auto-thread create path clamps 80 — stricter by design for trigger text)
const threadNameLastSet = new Map(); // convKey -> the last thread name WE set (the only-if-changed guard)
const threadNameSlice = (s) =>
  String(s ?? "")
    .replace(/[\r\n]+/g, " ") // newlines are invalid in channel names (a 400, not a cleanup) — collapse to a space
    .replace(/@/g, "") // a thread name can never render as a ping
    .trim()
    .slice(0, THREAD_NAME_MAX); // clamp — the presence-slice precedent
function maybeRenameThread(convKey, name) {
  try {
    if (loadConfig().thread_rename !== true) return null; // knob off: zero PATCHes
    if (!convKey || !convKey.startsWith("thread:")) return null; // only threads — channels and DMs are never renamed
    const clean = threadNameSlice(name);
    if (!clean) return null; // no name (or one that sanitizes to nothing): nothing to set
    if (threadNameLastSet.get(convKey) === clean) return null; // unchanged at the source — no PATCH, no rate slot
    threadNameLastSet.set(convKey, clean); // eager: a failing PATCH must not re-fire every heartbeat
    const threadId = convKey.slice("thread:".length);
    return rest.patchThreadName(threadId, clean).then(
      () => log(`conv ${convKey}: thread renamed to "${clean}"`),
      (e) =>
        log(
          `WARN: thread rename for ${convKey} failed: ${
            e?.message ?? e
          } — the thread keeps its current name`,
        ),
    );
  } catch (e) {
    log(`WARN: thread rename for ${convKey} skipped: ${e?.message ?? e}`);
  }
  return null;
}

// ---------- conversation surface names (discord-visibility feedback lap) ----------
// A convKey resolves to a name the BOT knows: the channel's Discord name, the
// thread's title, or the DM recipient's display name. The name feeds the spawn
// env (DISCORD_CONV_NAME -> the beacon names the session — "discord channel
// 9967911148" garbage dies) and the /status table's conversation column. Two
// contracts: cache-first (a lookup NEVER blocks on a fetch — dispatch resolves
// what is cached, spawns unnamed when unknown, the beacon falls back) and
// prime-async (an unresolved key triggers ONE fire-and-forget getChannel
// through the bucket-aware REST helper; the NEXT spawn/render carries the
// name). Fetch failures never cache — every spawn retries until a name lands.
const CONV_NAME_MAX = 26; // the operator's session-picker limit — the same clamp the beacon enforces on DISCORD_CONV_NAME
const convNames = new Map(); // convKey -> resolved surface name (real names only — failures and the "dm" fallback stay out)
const convNameFetching = new Set(); // in-flight fetches — a dispatch burst primes a key once, not once per message
function convNameSlice(raw) {
  // readable-name style: the surface's own name, no newlines, never a ping, clamped
  return String(raw ?? "")
    .replace(/[\r\n]+/g, " ") // a name renders in the /status table — one row per conversation, no embedded newlines
    .replace(/@/g, "") // a surface name can never render as a ping
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CONV_NAME_MAX);
}
function rememberConvName(convKey, raw) {
  // createThread paths call this eagerly — the chosen title IS the surface name
  const clean = convNameSlice(raw);
  if (convKey && clean) convNames.set(convKey, clean);
  return clean || null;
}
function convNameFor(convKey) {
  // sync, cache-first — NEVER fetches
  if (!convKey || !convKey.includes(":")) return null;
  const hit = threadNameLastSet.get(convKey) ?? convNames.get(convKey); // threads: the rename mirror holds the freshest title we set; everything else: remembered create-thread/fetch names
  if (hit) return convNameSlice(hit);
  return convKey.startsWith("dm:") ? "dm" : null; // the recipient display name is not resolved (yet) — "dm" beats the raw key; the spawn env still carries it and prime fetches the real name
}
function primeConvName(convKey, channelId = null) {
  // fire-and-forget fetch: populates the cache for the NEXT spawn/render
  if (
    !convKey ||
    !convKey.includes(":") ||
    threadNameLastSet.has(convKey) ||
    convNames.has(convKey) ||
    convNameFetching.has(convKey)
  )
    return;
  const sep = convKey.indexOf(":");
  const kind = convKey.slice(0, sep),
    id = convKey.slice(sep + 1);
  if (kind !== "channel" && kind !== "thread" && kind !== "dm") return;
  const target =
    kind === "dm" ? channelId ?? ledger.get(convKey)?.channel_id : id; // dm keys hold the RECIPIENT id — the channel fetch needs the DM channel id (dispatch's, or the ledger row's)
  if (!target) return;
  convNameFetching.add(convKey);
  rest
    .getChannel(target)
    .then(
      (c) => {
        const u = c?.recipients?.[0]; // a DM channel fetch: recipients[0] IS the conversation partner
        const clean = convNameSlice(
          kind === "dm"
            ? u?.global_name ?? u?.display_name ?? u?.username
            : c?.name,
        );
        if (clean) {
          convNames.set(convKey, clean);
          log(`conv ${convKey}: surface name resolved: "${clean}"`);
        } else
          log(
            `conv ${convKey}: fetched channel carries no usable name — the fallback stays`,
          );
      },
      (e) =>
        log(
          `conv name fetch ${convKey} failed: ${
            e?.message ?? e
          } — the fallback stays; the next spawn retries`,
        ),
    )
    .finally(() => convNameFetching.delete(convKey)); // failures never cache — the retry rides the next spawn
}
const convKeySlug = (k) =>
  String(k ?? "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ") || String(k ?? ""); // the pre-name fallback — the same slug the beacon's sessionNameFor derives
const ellipsize = (s, n) => {
  const v = String(s ?? "");
  return v.length <= n ? v : v.slice(0, Math.max(1, n - 1)) + "…";
}; // verdicts cap into the /status state column

// ---------- zero-dep gateway client (D2) ----------
let ws = null,
  wsSeq = null,
  gatewaySessionId = null,
  gatewayResumeUrl = null;
let heartbeatTimer = null,
  heartbeatAcked = true,
  missedAcks = 0;
let gatewayState = "down"; // down | connecting | reconnecting | connected
let botUserId = null,
  homeNotified = false;
let backoffMs = 1000;

function wsSend(op, d) {
  if (!ws || ws.readyState !== 1) return;
  const frame = { op, d };
  if (wsSeq !== null) frame.s = wsSeq;
  ws.send(JSON.stringify(frame));
}
function closeGateway(code = 4000) {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (ws) {
    const old = ws;
    ws = null;
    old.__active = false;
    try {
      old.close(code, "reconnect");
    } catch {}
  } // zombie guard: the old client dies before the new one lives (HH #11); __active=false so its late close event is not mistaken for a spontaneous drop
}
function scheduleReconnect() {
  if (shuttingDown) return;
  gatewayState = "reconnecting";
  const delay = backoffMs;
  backoffMs = Math.min(backoffMs * 2, 30000);
  setTimeout(connectGateway, delay);
}

function onGatewayClose(sock, code, reason) {
  if (!sock.__active) return; // intentional close — the reconnect is already scheduled by the caller
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  ws = null;
  gatewayState = "down";
  // exit classification (HH #12): auth/intent errors are non-retryable
  if (code === 4004) {
    log(
      "FATAL: gateway auth failed — bot_token is wrong; fix config.json and restart (the beacon will respawn the bot)",
    );
    process.exit(1);
  }
  if (code === 4013) {
    log("FATAL: gateway rejected the intents");
    process.exit(1);
  }
  if (code === 4014) {
    log(
      "FATAL: privileged intents not enabled — turn on MESSAGE CONTENT INTENT for this app in the Discord Developer Portal (design D2/gotcha: connection is rejected without it)",
    );
    process.exit(1);
  }
  log(`gateway closed (${code}${reason ? " " + reason : ""}) — reconnecting`);
  scheduleReconnect();
}

function startHeartbeat(intervalMs) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatAcked = true;
  missedAcks = 0;
  heartbeatTimer = setInterval(() => {
    // liveness: 2 consecutive missed ACKs -> reconnect+RESUME (hermes :1607-1758; REST 200 != gateway health)
    if (!heartbeatAcked) {
      missedAcks++;
    } else {
      missedAcks = 0;
    }
    if (missedAcks >= 2) {
      log("gateway: 2 missed heartbeat ACKs — reconnecting");
      closeGateway();
      scheduleReconnect();
      return;
    }
    wsSend(1, wsSeq);
    heartbeatAcked = false;
  }, intervalMs);
}

async function connectGateway() {
  if (shuttingDown) return;
  gatewayState = "connecting";
  closeGateway();
  let url;
  try {
    const gb = await rest.gatewayBot(); // fresh wss url + limits
    url = gatewayResumeUrl || gb?.url;
    if (!url) throw new Error("no gateway url");
  } catch (e) {
    log("gateway: /gateway/bot failed:", e?.message ?? e);
    scheduleReconnect();
    return;
  }
  try {
    const sock = new WebSocket(`${url}?v=${GATEWAY_VERSION}&encoding=json`);
    sock.__active = true;
    ws = sock;
    sock.addEventListener("message", (ev) => {
      let payload;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        return;
      }
      onGatewayFrame(payload).catch((e) =>
        log("gateway frame error:", e?.message ?? e),
      );
    });
    sock.addEventListener("close", (ev) =>
      onGatewayClose(sock, ev.code, ev.reason),
    );
    sock.addEventListener("error", () => {}); // close handler classifies the failure
    log("gateway: connecting…");
  } catch (e) {
    log("gateway: websocket setup failed:", e?.message ?? e);
    scheduleReconnect();
  }
}

async function onGatewayFrame(frame) {
  if (frame.s !== null && frame.s !== undefined) wsSeq = frame.s;
  switch (frame.op) {
    case 10: {
      // HELLO
      startHeartbeat(frame.d?.heartbeat_interval ?? 41250);
      if (gatewaySessionId && wsSeq !== null) {
        wsSend(6, {
          token: loadConfig().bot_token,
          session_id: gatewaySessionId,
          seq: wsSeq,
        }); // RESUME: replayed events land in the dedup LRU
        log("gateway: RESUMing", String(gatewaySessionId).slice(0, 8) + "…");
      } else {
        wsSend(2, {
          // IDENTIFY
          token: loadConfig().bot_token,
          intents: INTENTS,
          properties: {
            os: process.platform,
            browser: "prime-agent-discord",
            device: "prime-agent-discord",
          },
        });
      }
      break;
    }
    case 11:
      heartbeatAcked = true;
      missedAcks = 0;
      break; // HEARTBEAT_ACK
    case 1:
      wsSend(1, wsSeq);
      break; // server-requested heartbeat
    case 7:
      log("gateway: server requested reconnect");
      closeGateway();
      scheduleReconnect();
      break;
    case 9: // INVALID_SESSION: resumable vs fresh
      if (frame.d === true) {
        gatewayState = "reconnecting";
        setTimeout(connectGateway, 3000);
      } else {
        gatewaySessionId = null;
        wsSeq = null;
        gatewayResumeUrl = null;
        gatewayState = "reconnecting";
        setTimeout(connectGateway, Math.max(backoffMs, 1000));
      }
      break;
    case 0:
      await dispatchGatewayEvent(frame.t, frame.d);
      break;
    default:
      break;
  }
}

async function dispatchGatewayEvent(t, d) {
  if (t === "READY") {
    gatewaySessionId = d?.session_id ?? null;
    gatewayResumeUrl = d?.resume_url ?? null;
    botUserId = d?.user?.id ? String(d.user.id) : botUserId;
    gatewayState = "connected";
    backoffMs = 1000;
    log(`gateway: READY as ${d?.user?.username ?? "?"} (${botUserId})`);
    const cfg = loadConfig();
    if (!homeNotified && cfg.home_channel) {
      // one-time startup notice (reconnects do not re-notify — spam guard)
      homeNotified = true;
      rest
        .sendMessage(cfg.home_channel, "discord bot online", {})
        .catch((e) => log("home channel notice failed:", e?.message ?? e));
    }
    await syncSlashCommands((d?.guilds ?? []).map((g) => g.id).filter(Boolean)); // guild-scoped: instant availability (D7)
    presence.forceSync(); // a fresh gateway session resets client presence — re-assert immediately (§8.3)
    recoveryBootScan().catch((e) =>
      log("recovery boot scan failed:", e?.message ?? e),
    ); // durable replay of admitted-but-never-dispatched messages (recovery ledger #1) — fire-and-forget: READY handling never blocks on it
  } else if (t === "RESUMED") {
    gatewayState = "connected";
    backoffMs = 1000;
    log("gateway: RESUMED");
  } else if (t === "GUILD_CREATE") {
    for (const c of [...(d?.channels ?? []), ...(d?.threads ?? [])]) {
      if (c?.id)
        channels.set(String(c.id), {
          id: String(c.id),
          type: c.type,
          parent_id: c.parent_id ? String(c.parent_id) : null,
        });
    }
  } else if (t === "MESSAGE_CREATE") {
    await handleMessage(d);
  } else if (t === "INTERACTION_CREATE") {
    await handleInteraction(d);
  }
}

// ---------- presence v1: bot self-presence via gateway op-3 (presence-plan §2-§9) ----------
// v2 (2026-09-27, operator UX): the activity NAME — the visible member-list
// line — is the active conversation's session name. v3 (2026-09-28): at idle
// the NAME mirrors the idle STATE text; `name` is the deep fallback (README).
// TEXT-ONLY by protocol: bots may set only name/state/type (+status) on their own
// activity — no assets, details, timestamps, party, buttons, or emoji, ever.
// Harness-extracted region BEGIN — .scratch/discord-rpc-assets/presence-harness.mjs
// evals exactly this block: keep it self-contained (outer module state only
// arrives through createPresence's parameters).
const PRESENCE_WINDOW_MS = 20000; // Discord limit: 5 presence updates / 20s
const PRESENCE_MAX_SENDS = 4; // cap at 4 — one spare slot for the READY forceSync (§9)
const PRESENCE_MAX_LEN = 128; // legacy name/state field limit (activity Info box)

const presenceSlice = (s) => String(s ?? "").slice(0, PRESENCE_MAX_LEN);

// render rule (§4): replace placeholders, drop empty segments together with
// their " · " separator, trim — a single working session renders to just the task
function renderStateTemplate(tpl, task, children) {
  return String(tpl ?? "")
    .split(" · ")
    .map((seg) =>
      seg.replaceAll("{task}", task).replaceAll("{children}", children),
    )
    .filter(Boolean)
    .join(" · ")
    .trim();
}

// status mapping (§5): auto = online whenever the bot is listening or working —
// a live gateway listener answers instantly, never the AFK mark; the activity
// line carries what it's working on. A forced "dnd"|"invisible" override wins.
// "offline" is never sent.
function presenceStatus(pcfg, auto) {
  return pcfg.status === "auto" ? auto : pcfg.status;
}

// desired (state, status) from the working registry rows (pure; §4) — task is
// the most recent busy:true row (lastBusyAt, lastSeen fallback)
function derivePresence(workingRows, pcfg) {
  if (!workingRows.length)
    return {
      state: presenceSlice(pcfg.idle_state),
      status: presenceStatus(pcfg, "online"),
    };
  const task = workingRows.reduce((a, b) =>
    (b.lastBusyAt ?? b.lastSeen ?? 0) > (a.lastBusyAt ?? a.lastSeen ?? 0)
      ? b
      : a,
  );
  const n = workingRows.length;
  const state = renderStateTemplate(
    pcfg.state_template,
    String(task.name ?? ""),
    n > 1 ? `${n} live` : "",
  );
  return {
    state: presenceSlice(state),
    status: presenceStatus(pcfg, "online"),
  };
}

// v2 (operator UX, 2026-09-27): the visible member-list line (the activity NAME)
// reads the ACTIVE conversation — the most-recently-active ROUTED working row's
// registered session name (the beacon carries it; heartbeats keep it fresh).
// v3 (2026-09-28, idle-name consistency): at idle the NAME mirrors the idle
// STATE text (pcfg.idle_state) — both lines read "listening"; the product name
// next to the account name was redundant. pcfg.name stays the deep fallback
// when idle_state is empty. Status/state stay machine-wide — untouched.
function deriveActiveName(workingRows, pcfg) {
  const routed = workingRows.filter((r) => r && r.routed === true);
  if (!routed.length)
    return (
      presenceSlice(String(pcfg.idle_state ?? "")) || presenceSlice(pcfg.name)
    ); // idle: the state text drives BOTH lines; empty -> the configured name
  const task = routed.reduce((a, b) =>
    (b.lastBusyAt ?? b.lastSeen ?? 0) > (a.lastBusyAt ?? a.lastSeen ?? 0)
      ? b
      : a,
  );
  return presenceSlice(String(task.name ?? "") || pcfg.name);
}

// op-3 payload shape (§2/§7): since/afk constants; type 4 forces "Custom Status";
// v2: the activity name is the desired visible line (active-conversation name;
// the idle state text at idle), falling back to the configured `name` when
// unset — no click-to-see
function presencePayload(desired, pcfg) {
  return {
    since: 0,
    activities: [
      {
        name:
          pcfg.type === 4
            ? "Custom Status"
            : presenceSlice(desired.name || pcfg.name),
        type: pcfg.type,
        state: desired.state,
      },
    ],
    status: desired.status,
    afk: false,
  };
}
const presenceKey = (p) =>
  `${p.activities[0].name}|${p.activities[0].type}|${p.activities[0].state}|${p.status}`;

// desired state in, debounced op-3 out (§3/§9): change detection first, trailing
// debounce, sliding-window hard cap; sends only on a connected gateway
function createPresence({
  wsSend,
  gatewayState,
  getConfig,
  now = Date.now,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  let lastSent = null; // key of the last op-3 actually sent (change detection)
  let lastPayload = null; // last sent payload — READY forceSync re-asserts it (§8.3)
  let pending = null; // latest desired pair awaiting debounce/slot/READY
  let timer = null; // trailing debounce (or cap-expiry resend) handle
  const window = []; // send timestamps inside the sliding 20s window

  function update(state, status, name) {
    const pcfg = getConfig()?.presence;
    if (!pcfg || !pcfg.enabled) return; // feature gate: zero op-3 sends, no timers (§6)
    const desired = {
      state: presenceSlice(state),
      status,
      name: presenceSlice(name),
    }; // name: "" = no active conversation -> payload falls back to the idle name
    if (presenceKey(presencePayload(desired, pcfg)) === lastSent) {
      // identical to what's sent — no timer, no slot (§9)
      if (!pending?.forced) {
        // a queued older pair is stale (flip-flip back to the sent state) — drop it, or the live truth went stale
        pending = null;
        if (timer) {
          cancel(timer);
          timer = null;
        }
      }
      return;
    }
    pending = desired;
    if (timer) cancel(timer);
    timer = schedule(firePending, pcfg.debounce_ms);
  }

  function refreshFromSessions(rows) {
    const pcfg = getConfig()?.presence;
    if (!pcfg || !pcfg.enabled) return;
    const working = [];
    for (const row of rows.values())
      if (row && row.status === "working") working.push(row);
    const { state, status } = derivePresence(working, pcfg);
    update(state, status, deriveActiveName(working, pcfg)); // v2: the visible name rides the same refresh (15s heartbeat worst case)
  }

  // READY path (§8.3): bypass debounce + change detection once — a fresh gateway
  // session resets client presence — but still consume a rate slot
  function forceSync() {
    const pcfg = getConfig()?.presence;
    if (!pcfg || !pcfg.enabled) return;
    const desired =
      pending ??
      (lastPayload
        ? {
            state: lastPayload.activities[0].state,
            status: lastPayload.status,
            name: lastPayload.activities[0].name,
          }
        : null); // v2: READY re-asserts the active-conversation name too
    if (!desired) return; // nothing derived yet — the first register refresh drives it
    if (timer) {
      cancel(timer);
      timer = null;
    }
    pending = { ...desired, forced: true };
    firePending();
  }

  function firePending() {
    timer = null;
    if (!pending) return;
    const pcfg = getConfig()?.presence;
    if (!pcfg || !pcfg.enabled) {
      pending = null;
      return;
    }
    const payload = presencePayload(pending, pcfg);
    if (!pending.forced && presenceKey(payload) === lastSent) {
      pending = null;
      return;
    } // collapsed back to the sent pair
    if (gatewayState() !== "connected") return; // deferred until READY (§9)
    const t = now();
    while (window.length && t - window[0] >= PRESENCE_WINDOW_MS) window.shift();
    if (window.length >= PRESENCE_MAX_SENDS) {
      // hard cap — re-fire when the oldest send exits the window
      timer = schedule(firePending, PRESENCE_WINDOW_MS - (t - window[0]) + 1);
      return;
    }
    window.push(t);
    lastSent = presenceKey(payload);
    lastPayload = payload;
    pending = null;
    wsSend(3, payload);
  }

  return { update, refreshFromSessions, forceSync };
}
// Harness-extracted region END

const presence = createPresence({
  wsSend,
  gatewayState: () => gatewayState,
  getConfig: loadConfig,
});

// ---------- admission ladder (D4; ordered, first reject wins, each gate logs one line) ----------
const listHas = (list, id) =>
  Array.isArray(list) && (list.includes("*") || list.includes(String(id)));
function warnOncePer(key, msg) {
  if (!warnOnce[key]) {
    warnOnce[key] = true;
    log("WARN:", msg);
  }
}
const mentionTokenPresent = (content, botId) =>
  !!botId && new RegExp(`<@!?${botId}>`).test(content ?? "");
function isMentioned(msg, botId) {
  // humans: mentions array is fine (a human reply-ping to the bot IS addressing it);
  // bots: raw <@id> token scan happens in the bot gate (reply-pings pollute message.mentions — HH gotcha 2)
  if (mentionTokenPresent(msg.content, botId)) return true;
  return (
    Array.isArray(msg.mentions) && msg.mentions.some((m) => m?.id === botId)
  );
}
const reject = (gate, reason) => ({ ok: false, gate, reason });

async function evaluateAdmission(msg, cfg) {
  // gate 1 — dedup: Discord RESUME replays events; pre-seed also covers the
  // create_thread starter-message replay (id == thread id, HH gotcha 9)
  if (!dedupAdd(String(msg.id)))
    return reject("dedup", "replayed or duplicate message id");
  // gate 2 — self-drop (other bots wait for gate 6 so allow_bots can admit them)
  if (botUserId && String(msg.author?.id) === botUserId)
    return reject("self", "own message");
  const isDm = !msg.guild_id;
  // gate 3 — guild (fail-closed: empty allowlist denies; a fresh bot would otherwise answer the whole server)
  if (isDm) {
    if (!cfg.allow_dm) return reject("dm", "allow_dm is off");
  } else {
    if (!cfg.allowed_guild_ids.includes(String(msg.guild_id))) {
      warnOncePer(
        "guild",
        `guild ${msg.guild_id} is not in allowed_guild_ids — add the guild ID to config.json; empty = deny all (fail-closed)`,
      );
      return reject("guild", "guild not allowlisted");
    }
    // gate 4 — channel whitelist then blacklist; thread messages match by parent channel too
    const info = await channelInfo(msg.channel_id);
    const keys = CHANNEL_KEYS(info);
    if (cfg.allowed_channels.length === 0) {
      warnOncePer(
        "channel",
        'allowed_channels is empty — every channel is denied (fail-closed); add channel IDs or "*"',
      );
      return reject("channel", "no channel allowlist");
    }
    if (!keys.some((k) => listHas(cfg.allowed_channels, k)))
      return reject("channel", "channel not allowlisted");
    if (keys.some((k) => listHas(cfg.ignored_channels, k)))
      return reject("channel", "channel blacklisted");
  }
  // gate 5 — user (fail-closed; username/role allowlists are deferred — IDs only)
  const userId = String(msg.author?.id ?? "");
  if (!cfg.allow_all_users && !listHas(cfg.allowed_users, userId)) {
    warnOncePer(
      "user",
      `user ${userId} is not in allowed_users — add the user ID to config.json (or allow_all_users for dev); empty = deny all (fail-closed)`,
    );
    return reject("user", "user not allowlisted");
  }
  // gate 6 — bot policy (raw token scan for bots: reply-pings silently add you to message.mentions)
  if (msg.author?.bot) {
    if (cfg.allow_bots === "none")
      return reject("bots", "bot author, allow_bots=none");
    if (
      cfg.allow_bots === "mentions" &&
      !mentionTokenPresent(msg.content, botUserId)
    )
      return reject("bots", "bot author without an inline <@bot> token");
  }
  return { ok: true, isDm };
}

// gate 7 — mention: required in shared channels/threads unless free-response
// or the conversation is already mapped (thread-participation semantics, HH #6)
function passesMentionGate(keys, convKey, cfg, mentioned) {
  if (!cfg.require_mention) return true;
  if (keys.some((k) => listHas(cfg.free_response_channels, k))) return true;
  if (convKey && (ledger.has(convKey) || routing.has(convKey))) return true; // follow-ups need no mention
  return mentioned;
}

function stripBotMentions(content, botId) {
  return String(content ?? "")
    .replace(new RegExp(`<@!?${botId}>`, "g"), "")
    .trim();
}
function threadNameFrom(content) {
  const s = String(content ?? "")
    .replace(/<@!?\d+>/g, "")
    .replace(/\s+/g, " ")
    .trim(); // mention tokens stripped, <=80 chars (hermes :5031-5048)
  return (s || "discord conversation").slice(0, 80);
}
// PRODUCTION 2026-09-23: every auto-thread came back PRIVATE (type 12) with
// bot-only membership — the operator could not see the thread or any reply in
// it, while delivery itself worked. From-message creates ignore the requested
// type, so the trigger author is PUT into the members right after creation.
// Visibility is the feature: retry once (house pattern), then say it loudly —
// the thread is invisible to its author until a member-add succeeds.
async function ensureThreadMember(threadId, userId, parentId) {
  if (!threadId || !userId) return;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await rest.addThreadMember(threadId, userId);
      return;
    } catch (e) {
      log(
        `thread member add ${attempt}/2 failed (${threadId} <- ${userId}): ${
          e?.message ?? e
        }`,
      );
      if (attempt < 2) await sleep(1000);
    }
  }
  log(
    `WARN: could not add the trigger author to thread ${threadId} — the thread stays private to the bot; fix my thread-members permission or re-trigger`,
  );
  await rest
    .sendMessage(
      parentId,
      "(created the thread but could not add you to it — it may be hidden from you; check my thread-members permission)",
      {},
    )
    .catch(() => {});
}

// ---------- inbound attachments (hermes-catalog #3 slice 1: text-doc injection ≤100KB) ----------
// An admitted message's text-compatible attachments inline INTO the dispatch
// text — the agent simply sees the content, zero agent-side changes. Only the
// first ATTACHMENT_INLINE_MAX attachments fetch; everything else (non-text,
// over-cap, beyond the limit, failed fetch) becomes a one-line placeholder in
// the same spot. Fetches are sequential, ride a dedicated bucket key (a slow
// CDN never parks message sends), and never block dispatch: a failure is a
// placeholder, not a lost message. The inflated text IS the dispatch text —
// the recovery ledger stores it, so a replay re-dispatches the content.
const ATTACHMENT_INLINE_MAX = 3; // per-message inline cap — beyond that, placeholders only
const ATTACHMENT_BUCKET_KEY = "attachments"; // dedicated bucket: a 429ing/slow CDN parks only attachment fetches
const ATTACHMENT_TEXT_EXTS = new Set([
  ".txt",
  ".log",
  ".yaml",
  ".yml",
  ".json",
  ".md",
  ".csv",
  ".toml",
  ".ini",
  ".conf",
  ".xml",
  ".env",
  ".ts",
  ".js",
  ".mjs",
  ".py",
  ".sh",
]); // extension allowlist — content_type text/* OR one of these; anything else is non-text
const attachmentFetchTimeoutMs = () => {
  const v = Number(process.env.DISCORD_ATTACHMENT_FETCH_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : 10000;
}; // per-fetch timeout, 10s like the REST layer; env lets the smoke drive the case fast
const attName = (att) => String(att?.filename ?? "attachment");
const attachmentIsTextual = (att) => {
  if (
    String(att?.content_type ?? "")
      .toLowerCase()
      .startsWith("text/")
  )
    return true;
  const name = attName(att).toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot >= 0 && ATTACHMENT_TEXT_EXTS.has(name.slice(dot));
};
const fmtCapBytes = (n) => (n === 102400 ? "100KB" : `${n}-byte`); // the placeholder reads the CONFIGURED cap
// CDN GET with the bot token — same REST discipline (dedicated bucket wait,
// bounded 429 retry, per-fetch AbortSignal). Reads at most cap+1 bytes and
// cancels the stream the moment the cap is crossed — never fetch-and-discard.
async function fetchAttachment(att, cfg, retried429 = false) {
  const url = String(att?.proxy_url || att?.url || "");
  if (!/^https?:\/\//.test(url)) throw new Error("no fetchable url"); // transport-level failures are not HTTP verdicts — the placeholder reason reads its message
  await bucketWaitKey(ATTACHMENT_BUCKET_KEY);
  let res;
  try {
    res = await fetch(url, {
      headers: { authorization: `Bot ${loadConfig().bot_token}` },
      signal: AbortSignal.timeout(attachmentFetchTimeoutMs()),
    });
  } catch (e) {
    throw new Error(
      e?.name === "TimeoutError" || e?.name === "AbortError"
        ? "timeout"
        : String(e?.message ?? e),
    );
  }
  if (res.status === 429) {
    const raw = await res.text().catch(() => "");
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {}
    const s = parseRetryAfter(data);
    const until = Date.now() + s * 1000 + RATE_LIMIT_MARGIN_MS;
    if (data?.global)
      globalCooldownUntil = Math.max(globalCooldownUntil, until);
    else
      bucketCooldowns.set(
        ATTACHMENT_BUCKET_KEY,
        Math.max(bucketCooldowns.get(ATTACHMENT_BUCKET_KEY) ?? 0, until),
      ); // only the attachments bucket parks — a slow CDN never parks message sends
    if (!retried429) return fetchAttachment(att, cfg, true); // bounded retry — the bucket is parked, the retry lands drained
    throw new RestError(429, raw.slice(0, 120));
  }
  if (res.status >= 400) {
    const t = await res.text().catch(() => "");
    throw new RestError(res.status, t.slice(0, 120));
  }
  const cap = cfg.attachment_max_bytes;
  let total = 0,
    over = false;
  const chunks = [];
  if (res.body) {
    // stream-read with the cap — the backstop for a lying/absent payload size
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > cap) {
        over = true;
        reader.cancel().catch(() => {});
        break;
      }
      chunks.push(value);
    }
  }
  if (over) return { tooLarge: true, bytes: total };
  return { text: Buffer.concat(chunks).toString("utf-8") };
}
// sequential fetches, bounded — returns the inline suffix ("" when nothing to say)
async function inlineAttachments(atts, cfg) {
  let out = "";
  let fetched = 0; // fetch attempts — the per-message bound that keeps a fetch storm out of admission
  for (const att of atts) {
    const name = attName(att);
    if (fetched >= ATTACHMENT_INLINE_MAX) {
      out += `\n\n[attachment ${name} skipped: only ${ATTACHMENT_INLINE_MAX} attachments inline per message]`;
      continue;
    }
    if (!attachmentIsTextual(att)) {
      out += `\n\n[attachment ${name} skipped: non-text]`;
      continue;
    }
    const size = Number(att?.size);
    const cap = cfg.attachment_max_bytes;
    if (Number.isFinite(size) && size > cap) {
      out += `\n\n[attachment ${name} skipped: ${size} bytes > ${fmtCapBytes(
        cap,
      )} cap]`;
      continue;
    } // the payload's own size — zero fetch
    try {
      fetched++;
      const r = await fetchAttachment(att, cfg);
      if (r.tooLarge)
        out += `\n\n[attachment ${name} skipped: ${
          r.bytes
        } bytes > ${fmtCapBytes(cap)} cap]`;
      else out += `\n\n[attached: ${name}]\n${r.text.replace(/\s+$/, "")}`;
    } catch (e) {
      const reason =
        e instanceof RestError ? `HTTP ${e.status}` : String(e?.message ?? e); // RestError = an HTTP verdict; everything else (timeout, refused, no url) reads its message
      out += `\n\n[attachment ${name} fetch failed: ${reason}]`; // the message still dispatches with what it has
    }
  }
  return out;
}

async function handleMessage(msg) {
  const cfg = loadConfig();
  const adm = await evaluateAdmission(msg, cfg);
  if (!adm.ok) {
    log(
      `admit: ${adm.gate}: ${adm.reason} (msg ${String(msg.id).slice(0, 12)})`,
    );
    return;
  }
  const info = await channelInfo(msg.channel_id);
  const keys = CHANNEL_KEYS(info);
  const mentioned = isMentioned(msg, botUserId);
  let convKey,
    channelId = String(msg.channel_id);
  if (adm.isDm) {
    convKey = `dm:${String(msg.author.id)}`; // DMs skip the mention gate (allow_dm already gated)
  } else if (isThreadType(info.type)) {
    convKey = `thread:${channelId}`;
    if (!passesMentionGate(keys, convKey, cfg, mentioned))
      return log(
        "admit: mention gate — un-mentioned message in a thread without a mapped conversation",
      );
  } else if (cfg.thread_policy === "always") {
    if (!passesMentionGate(keys, null, cfg, mentioned))
      return log(
        "admit: mention gate — shared channel message without mention",
      );
    const name = threadNameFrom(msg.content);
    try {
      const thread = await rest.createThread(channelId, msg.id, name); // auto-thread: each triggering mention becomes its own conversation (D3)
      convKey = `thread:${String(thread.id)}`; // thread id == starter message id in Discord
      channelId = String(thread.id);
      rememberConvName(convKey, thread?.name ?? name); // the chosen title IS the surface name — no fetch needed (the API-echoed name wins)
      log(
        `auto-thread ${thread.id} created (type ${
          thread.type ?? "?"
        }) — adding the trigger author to its members`,
      ); // record the ACTUAL returned type: production 2026-09-23 came back type 12 (private) against the type-11 request
      await ensureThreadMember(
        String(thread.id),
        String(msg.author?.id ?? ""),
        String(msg.channel_id),
      );
    } catch (e) {
      // auto-thread failure is fatal-for-the-message and VISIBLE — dumping the task back into a shared channel is worse (HH #7)
      log("auto-thread failed:", e?.message ?? e);
      await rest
        .sendMessage(
          channelId,
          "could not start a thread for this conversation — check my channel permissions",
          {},
        )
        .catch(() => {});
      return;
    }
  } else {
    convKey = `channel:${channelId}`; // thread_policy "agent" (the default): one shared session per channel, and the AGENT decides — quick answers stay here, substantial topics get promoted to a thread via the discord_thread tool
    if (!passesMentionGate(keys, convKey, cfg, mentioned))
      return log(
        "admit: mention gate — shared channel message without mention",
      );
  }
  const content = stripBotMentions(msg.content, botUserId);
  if (!content) return log("admit: bare mention with no text — dropped");
  // inbound attachments (hermes-catalog #3 slice 1): text-compatible
  // attachments inline INTO the dispatch text — the agent simply sees the
  // content, zero agent changes. Fetched BEFORE the recovery row lands, so
  // the ledger stores the inflated text (a replay re-dispatches the content);
  // a failure is a placeholder, never a lost message.
  const attSuffix =
    cfg.attachments && Array.isArray(msg.attachments) && msg.attachments.length
      ? await inlineAttachments(msg.attachments, cfg)
      : "";
  const text = `Discord message from ${
    msg.author?.username ?? "unknown"
  }: ${content}${attSuffix}`;
  // durable recovery (hermes-catalog #2): the pending row lands BEFORE dispatch —
  // a crash anywhere from here to dispatch acceptance replays this message on the
  // next boot (the raw dispatch text is what re-dispatch needs; files are 0600, gitignored)
  recoveryAdmit(
    {
      id: String(msg.id),
      ts: nowIso(),
      convKey,
      channelId,
      triggerChannelId: String(msg.channel_id),
      guildId: msg.guild_id ? String(msg.guild_id) : null,
      authorId: String(msg.author?.id ?? ""),
      authorBot: !!msg.author?.bot,
      mentioned,
      text,
    },
    cfg,
  );
  // the trigger lives in msg.channel_id — policy "always" re-points channelId at the
  // thread, and the reaction ack must hit the trigger where the operator sees it;
  // the trigger author rides along so the discord_thread promotion can add them to the new thread's members
  enqueueForDispatch(
    convKey,
    channelId,
    String(msg.channel_id),
    msg.id,
    text,
    cfg,
    String(msg.author?.id ?? ""),
  );
}

// ---------- text batching (D6): rapid successive messages coalesce into one turn ----------
function enqueueForDispatch(
  convKey,
  channelId,
  triggerChannelId,
  triggerMessageId,
  text,
  cfg,
  authorId,
) {
  let b = batchers.get(convKey);
  if (!b) {
    b = { items: [], timer: null, channelId };
    batchers.set(convKey, b);
  }
  b.channelId = channelId;
  b.items.push({
    triggerChannelId: String(triggerChannelId),
    triggerMessageId: String(triggerMessageId),
    text,
    authorId: authorId ?? null,
  });
  clearTimeout(b.timer);
  b.timer = setTimeout(
    () => {
      batchers.delete(convKey);
      flushBatch(convKey, b);
    },
    Math.max(0, cfg.text_batch_ms),
  );
}
async function flushBatch(convKey, b) {
  if (!b.items.length) return;
  const text = b.items.map((it) => it.text).join("\n\n");
  const last = b.items[b.items.length - 1];
  await dispatchToConversation(
    convKey,
    b.channelId,
    last.triggerChannelId,
    last.triggerMessageId,
    text,
    last.authorId,
  );
  recoveryMarkDone(
    convKey,
    b.items.map((it) => it.triggerMessageId),
  ); // dispatch accepted (beacon ok / spawn custody — spawn-path failures are already visible via failPending): the recovery rows' replay obligation ends
}

// ---------- dispatch + spawn/resume (D1/D3) ----------
const beaconSendTimeoutMs = () => {
  const v = Number(process.env.DISCORD_SEND_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : 8000;
}; // env: the smoke drives the wedged-beacon case fast (webui twin: 8s)
// the beacon's per-session traffic credential (2026-09-24 hardening lap):
// present the session token the beacon registered with; fall back to the
// machine token ONLY for beacons that registered without one (pre-hardening
// instances — their old /send gate accepts it, so live conversations survive
// the lap; hardening #1's window note lives in the README).
const beaconAuthHeaders = (route) => {
  const t = route?.sessionToken ?? TOKEN;
  return t ? { "x-prime-token": t } : {};
};
async function beaconSend(route, text) {
  // Returns { ok, unreachable }. ok = the beacon answered 200. unreachable = the
  // port is GONE (refused/reset before any response — respawn is safe, nothing was
  // delivered). A TIMEOUT is NOT unreachable — production 2026-09-26 double-reply
  // (thread 1552441595486408829): the 8s /send HAD reached the worker (its turn ran
  // and delivered) but the late response read as "dead", the self-heal respawn parked
  // the same text, the original's heartbeat re-claimed the id-matched route, and the
  // register flush re-delivered — two bot replies to one follow-up. On loopback a
  // dead port refuses instantly, so a timeout means the beacon was REACHABLE and the
  // /send is queued: treat as delivered, never respawn.
  try {
    const res = await fetch(`http://127.0.0.1:${route.controlPort}/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...beaconAuthHeaders(route),
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(beaconSendTimeoutMs()), // wedged-beacon guard (webui twin uses the same 8s)
    });
    return { ok: res.status === 200, unreachable: false };
  } catch (e) {
    const timedOut =
      e?.name === "TimeoutError" ||
      e?.name === "AbortError" ||
      /abort/i.test(String(e?.cause?.code ?? e?.code ?? ""));
    if (timedOut)
      log(
        "beacon /send timed out — treating as delivered (the beacon was reachable; no respawn, no re-dispatch)",
      );
    return { ok: false, unreachable: !timedOut };
  }
}
// ---------- /stop (busy-UX, hermes-catalog #1): stop the CURRENT turn, keep the session ----------
// NOT the /reset sledgehammer: /reset SIGTERMs the wrapper, and the turn keeps running
// in the daemon's worker for up to 30s more (it may still complete and burn tokens).
// /stop posts to the conversation's beacon, whose ctx.abort() is the REAL stop: it
// cancels the LLM stream + in-flight turn actions + child runs, PARKS queue-visible
// turns (the next message resumes them — agent-session requestAbort semantics), and
// agent_end still fires on abort, so the EXISTING busy:false settle resolves the ack
// (⚠️ if nothing landed — the operator stopped it; the provenance line reads via
// busy-settle, the same path a tool-only turn takes — no new ack path). The session,
// route, and wrapper all stay live. beaconSend's transport twin: token-gated loopback
// POST, never a signal to a worker (daemon workers are the operator's).
async function beaconStop(route) {
  try {
    const res = await fetch(`http://127.0.0.1:${route.controlPort}/stop`, {
      method: "POST",
      headers: { ...beaconAuthHeaders(route) },
      signal: AbortSignal.timeout(beaconSendTimeoutMs()), // the same wedged-beacon guard /send rides
    });
    return { ok: res.status === 200 };
  } catch {
    return { ok: false };
  } // refused/reset = dead port; a timeout = live-but-wedged — either way nothing was confirmed stopped, and no respawn ever happens from /stop
}
async function stopConv(inter, cfg) {
  let convKey;
  if (inter.guild_id) {
    const info = await channelInfo(inter.channel_id);
    convKey = isThreadType(info.type)
      ? `thread:${inter.channel_id}`
      : `channel:${inter.channel_id}`;
  } else {
    convKey = `dm:${String(inter.member?.user?.id ?? inter.user?.id ?? "")}`;
  }
  if (!ledger.has(convKey))
    return "no conversation mapped here (auto-thread conversations live in their threads — run /stop inside the thread)";
  const st = streamers.get(convKey);
  if (!(st?.busy || st?.pendingAck))
    return "nothing running — no turn is in flight"; // never abort an idle session
  const route = routing.get(convKey);
  if (!route)
    return "nothing running — the conversation has no live session (send a message to respawn it)";
  const res = await beaconStop(route);
  if (!res.ok)
    return "could not reach the conversation session — nothing stopped (send a message to check)";
  return "stopping the current turn — queued messages resume on your next message";
}

async function dispatchToConversation(
  convKey,
  channelId,
  triggerChannelId,
  triggerMessageId,
  text,
  authorId,
) {
  // dispatch-admission dedupe (2026-09-24 dm duplicate pairs): one message id,
  // one dispatch — ever. Any re-entry (a double flushBatch, a replay, a future
  // re-dispatch path) drops here with one audit line, before anything sends.
  const dedupeId = String(triggerMessageId ?? "");
  if (dedupeId && !dispatchAdmit(convKey, dedupeId)) {
    log(
      `dispatch dedupe: dropped a repeat of msg ${dedupeId.slice(
        0,
        12,
      )} (conv ${convKey}) — already dispatched inside the ${Math.round(
        DISPATCH_DEDUPE_WINDOW_MS / 3600000,
      )}h window`,
    );
    return;
  }
  await recoveryDrainDelivery(convKey).catch(() => {}); // owed replies from a terminally failed delivery land FIRST (at-least-once, recovery ledger #2) — the drain is fail-soft and bounded (one paced chunk-chain per row)
  const l = ledger.get(convKey);
  if (l) {
    l.lastActive = nowIso();
    saveLedger();
  }
  const route = routing.get(convKey);
  let stalePort = null;
  let ackedByLiveSession = false; // the /send verdict IS the ack (2026-09-24 dm triple duplicate, root cause): a beaconSend the live session accepted — or a timeout on a REACHABLE beacon (the turn queued there) — ends this dispatch; parking a second copy for a respawn would deliver the same message as two turns
  if (route) {
    const sent = await beaconSend(route, text);
    if (!sent.unreachable) {
      // 200 = the live session accepted the turn; a TIMEOUT on a reachable
      // beacon = the /send queued there (2026-09-26 lesson). Either way the
      // turn is the live session's obligation — no parked copy, no respawn.
      ackedByLiveSession = true;
    } else {
      // dead beacon (production 2026-09-24, thread 1552418888795291728: the daemon
      // recycled the worker mid-turn, the wrapper lived on as a zombie holding a
      // dead rpc, and the route kept pointing at the dead worker's port): SIGTERM
      // the stale wrapper WE spawned (never a daemon worker — those are the
      // operator's) and drop the stale route; spawnForConv below resumes the
      // session and the parked text re-dispatches on the new register.
      stalePort = route.controlPort; // the pre-heal beacon: if it is merely wedged (not dead), its later heartbeat must never re-claim the respawn's id-matched claim — the register flush would re-deliver (2026-09-26 double-reply guard)
      routing.delete(convKey);
      if (route.spawnPid != null) {
        const c = spawned.get(route.spawnPid);
        if (c) {
          try {
            c.kill("SIGTERM");
          } catch {}
        }
      }
      // a prior turn that never resolved (the dead worker's turn) fails visibly
      // BEFORE the re-anchor — the ⚠️ lands on the stalled turn's own trigger
      const stalled = streamers.get(convKey);
      if (
        stalled &&
        (stalled.pendingAck || stalled.busy || stalled.previewId != null)
      )
        await failTurn(
          convKey,
          "beacon died — dispatch self-heal respawned the session",
        );
    }
  }
  // anchor the streamer to THIS turn's channel + reply target before anything else
  const st = streamerOf(convKey);
  st.channelId = channelId;
  st.triggerMessageId = triggerMessageId;
  st.triggerChannelId = triggerChannelId;
  st.triggerAuthorId = authorId ?? null;
  st.turnToken = turnTokenOf(st) + 1; // TURN TOKEN BUMP: every in-flight writer of the PREVIOUS turn goes stale from here — its late tail (finalize resuming after the delivery awaits) can never clobber this turn's fresh ack state
  ackEyes(convKey); // reaction ack: the channel-visible "turn started" signal (fire-and-forget — never blocks dispatch)
  st.pendingAck = true; // this turn owes a ✅/⚠️ swap — finalize / failTurn / failPending / busy:false resolve it, never a silent strand
  st.resolved = null; // (#2) a new turn opens the verdict — the previous trigger's delivered verdict stays final on ITS trigger (the ack guard matches ch/mid)
  armTurnTimer(convKey); // the owed turn gets its watchdog at dispatch: a session that never starts streaming fails visibly after the window — no stranded 👀
  startTyping(convKey, loadConfig()); // dispatch-time typing (production 2026-09-27 "never is typing"): busy events are NOT a reliable start signal — the first agent_start races the register flush (the beacon's registered flag flips only after the register 200 resolves, and the flush's /send starts the turn inside that window — probe-confirmed 2026-09-24), and a wedged turn emits nothing at all. The bot DISPATCHED this turn, so the indicator starts here. Idempotent: a late busy:true re-entering startTyping is a no-op.
  if (!routing.get(convKey)) {
    // loud-warn (production 2026-09-27 stuck-👀): a live tagged session for THIS conversation registered display-only — no route means its events can never drive the streamer, exactly the silent state that strands a 👀. The register-reason line is already in server.log; this says where to look.
    for (const [sid, r] of sessions) {
      if (r.convKey === convKey) {
        log(
          `conv ${convKey}: registered-but-unrouted session ${String(sid).slice(
            0,
            8,
          )}… is live as display-only — its turn events cannot drive this conversation; check its register-reason line above, this dispatch respawns`,
        );
        break;
      }
    }
  }
  if (ackedByLiveSession) return; // the acked dispatch ends here: the anchor above arms this trigger's verdict, the live session's events drive it, and NO parked copy ever re-delivers the text (the 2026-09-24 dm duplicate pairs)
  await spawnForConv(convKey, channelId, text, triggerMessageId, stalePort);
}

let childLogFd = null;
function childLog() {
  if (childLogFd === null) {
    try {
      childLogFd = fs.openSync(path.join(HERE, "spawned-agents.log"), "a");
    } catch {
      childLogFd = "ignore";
    }
  }
  return childLogFd;
}
// webui resolveNewCwd: "~" expands, relative rejected, must exist
function resolveNewCwd(raw) {
  const pick = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const s = pick(raw) ?? "~";
  const expanded =
    s === "~"
      ? os.homedir()
      : s.startsWith("~/")
        ? path.join(os.homedir(), s.slice(2))
        : s;
  if (!path.isAbsolute(expanded))
    return { error: `invalid cwd: ${s}: must be absolute` };
  const abs = path.resolve(expanded);
  let st = null;
  try {
    st = fs.statSync(abs);
  } catch {}
  if (!st?.isDirectory())
    return { error: `invalid cwd: ${abs}: not a directory` };
  return { cwd: abs };
}

async function spawnForConv(
  convKey,
  channelId,
  text,
  triggerMessageId,
  stalePort = null,
) {
  const pending = pendingByConv.get(convKey);
  if (pending && Date.now() - pending.spawnAt < REGISTER_TIMEOUT_MS) {
    pending.texts.push({ text, triggerMessageId });
    return;
  } // spawn already in flight — ride along
  const convName = convNameFor(convKey); // cache-first — dispatch NEVER blocks on a fetch; unknown means this spawn goes unnamed and the beacon falls back
  if (!convNames.has(convKey) && !threadNameLastSet.has(convKey))
    primeConvName(convKey, channelId); // unresolved (or the bare "dm" fallback): fetch fire-and-forget — the NEXT spawn carries the name
  const spawnName = convName ? convNameSlice("discord " + convName) : null; // the session name the beacon uses verbatim — the "discord " prefix matches the convKey-slug fallback style
  if (SMOKE) {
    smokeSpawns.push({
      convKey,
      text,
      triggerMessageId,
      resumeId: ledger.get(convKey)?.sessionId ?? null,
      convName: spawnName ?? null,
    });
    return;
  } // smoke mode records the dispatch (incl. the --resume target and the DISCORD_CONV_NAME the env would carry); never spawns a real child
  pendingByConv.set(convKey, {
    texts: [{ text, triggerMessageId }],
    channelId,
    spawned: true,
    spawnAt: Date.now(),
  });
  const cfg = loadConfig();
  let cwd = ledger.get(convKey)?.cwd;
  if (!cwd) {
    const r = resolveNewCwd(cfg.default_cwd);
    if (r.error) return failPending(convKey, r.error);
    cwd = r.cwd;
  }
  const resumeId = ledger.get(convKey)?.sessionId ?? null;
  if (!ledger.has(convKey)) {
    ledger.set(convKey, {
      sessionId: null,
      cwd,
      channel_id: channelId,
      created: nowIso(),
      lastActive: nowIso(),
    });
    saveLedger();
  }
  // the causal claim (webui /internal/register pattern): a NEW spawn snapshots
  // SESSIONS_DIR before spawning and adopts the first register with a session
  // file absent from the snapshot, on this cwd, created after the spawn; a
  // RESUME spawn links by its preset sessionId. pid matching is unusable —
  // prime-agent delegates to the operator's daemon, so the beacon registers
  // the daemon-tree worker pid, never the wrapper pid we spawned (production
  // 2026-09-24: our own conversation registered display-only and timed out).
  claims.set(convKey, {
    at: Date.now(),
    cwd,
    known: resumeId ? null : new Set(diskSessions().map((d) => d.path)),
    sessionId: resumeId ?? null,
    spawnPid: null,
    stalePort,
  }); // stalePort: a live pre-heal beacon re-registering stays display-only (2026-09-26 double-reply guard)
  try {
    const child = spawn(
      "prime-agent",
      [
        "--mode",
        "rpc",
        "--session-dir",
        SESSIONS_DIR,
        "-e",
        path.join(HERE, "index.ts"), // the beacon; the child's session_start binds its control port and registers with us
        ...(resumeId ? ["--resume", resumeId] : []), // transcript continuity on bot restart (proven webui shape)
      ],
      {
        cwd,
        env: {
          ...process.env,
          DISCORD_CONV_KEY: convKey, // scope-guard tag: only sessions carrying this conversation's claim may route
          ...(spawnName ? { DISCORD_CONV_NAME: spawnName } : {}), // the surface-derived session name (new conversations AND resumes — the same env); absent on the first spawn before the fetch lands, and the beacon falls back to the convKey slug
          DISCORD_BOT_PORT: String(PORT),
          DISCORD_SESSIONS_DIR: SESSIONS_DIR,
          ...(TOKEN ? { DISCORD_EXT_TOKEN: TOKEN } : {}),
        },
        stdio: ["pipe", childLog(), childLog()], // stdin PIPE held open — the handle must stay referenced or the rpc child dies
      },
    );
    spawned.set(child.pid, child);
    pendingByConv.get(convKey).pid = child.pid;
    claims.get(convKey).spawnPid = child.pid; // route.spawnPid: the SIGTERM handle for /reset (the beacon pid belongs to the operator's daemon)
    child.on("error", (e) => {
      cleanupSpawn(child.pid);
      failPending(convKey, `spawn failed: ${e?.message ?? e}`);
    });
    child.on("exit", () => cleanupSpawn(child.pid));
    log(
      `conv ${convKey}: spawned prime-agent pid ${child.pid}${
        resumeId ? " (resume " + String(resumeId).slice(0, 8) + "…)" : ""
      }`,
    );
  } catch (e) {
    failPending(convKey, String(e?.message ?? e));
  }
}
// the claim's pre-spawn snapshot (webui diskSessions shape): session files
// already on disk are NOT claimable — only files the spawn itself creates
function diskSessions() {
  const out = [];
  try {
    for (const f of fs.readdirSync(SESSIONS_DIR)) {
      if (!f.endsWith(".jsonl")) continue;
      const p = path.join(SESSIONS_DIR, f);
      let st;
      try {
        st = fs.statSync(p);
      } catch {
        continue;
      } // deleted between readdir and stat: skip, never throw
      out.push({
        id: f.replace(/\.jsonl$/, ""),
        path: p,
        modified: st.mtimeMs,
      });
    }
  } catch {}
  return out.sort((a, b) => b.modified - a.modified);
}
function cleanupSpawn(pid) {
  spawned.delete(pid); // routing never follows the wrapper: a daemon session outlives its launcher — routes clear on beacon unregister / failed dispatch instead
}
async function failPending(convKey, why) {
  const p = pendingByConv.get(convKey);
  if (!p) return;
  pendingByConv.delete(convKey);
  claims.delete(convKey); // a failed spawn's late registers stay display-only (fail-closed)
  if (p.pid != null) {
    const c = spawned.get(p.pid);
    if (c) {
      try {
        c.kill("SIGTERM");
      } catch {}
    }
  } // production leak fix: the timeout path takes its own wrapper down — only the wrapper we spawned is ours; daemon workers are the operator's, never signalled
  log(`conv ${convKey}: ${why}`);
  const st = streamers.get(convKey); // a dead turn must not leave a stuck 👀 — swap the trigger to ⚠️ (fire-and-forget)
  const tok = turnTokenOf(st); // captured at entry — a stale turn's failure must never ack or clear the CURRENT turn's state (belt: sync-fresh today)
  if (tok !== turnTokenOf(st)) staleTurnSkip("failPending", tok, st);
  else {
    ackFinal(
      convKey,
      false,
      st?.triggerChannelId,
      st?.triggerMessageId,
      "failPending",
    );
    if (st) {
      st.pendingAck = false;
      clearTurnTimer(st);
      st.busy = false;
      st.previewId = null;
      st.previewShown = null;
      st.resolved = {
        ok: false,
        ch: st.triggerChannelId,
        mid: st.triggerMessageId,
      };
      stopTyping(convKey);
    } // the spawn died before the turn ran — resolve its pending state too (typing included: dispatch starts it now, so a dead spawn must stop it)
  }
  await rest
    .sendMessage(
      p.channelId,
      "(could not start the agent session — see the extension's server.log)",
      {},
    )
    .catch(() => {});
}
// a spawn that boots but never registers locks the conv for at most this long
function sweepPending() {
  for (const [convKey, p] of pendingByConv) {
    if (Date.now() - p.spawnAt > REGISTER_TIMEOUT_MS)
      failPending(convKey, "register timeout — session never registered");
  }
}
setInterval(sweepPending, 10000);

// ---------- streamer (D6): one preview per turn, throttled edits, reply-chained finalize ----------
function streamerOf(convKey) {
  let st = streamers.get(convKey);
  if (!st) {
    st = {};
    streamers.set(convKey, st);
  }
  return st;
}
// ---------- turn tokens (production 2026-09-28 under-ack): every dispatch bumps
// st.turnToken (a per-streamer counter — monotonic, so a "(N vs M)" anomaly line
// reads as "turn M superseded N" instead of two opaque ids). Turn-scoped writers
// capture the token at ENTRY and skip their streamer writes when a newer dispatch
// owns it. The bug: finalize's tail `pendingAck = false` runs after EVERY delivery
// await — a dispatch(N+1) landing mid-finalize(N) had its fresh pendingAck=true
// clobbered, stranding the new turn's 👀 (under-ack only, never over-ack).
// Machine-scoped state (typing timer, the channel/trigger anchor) is NOT
// token-gated: the next dispatch's own re-anchor owns that, per the existing
// anchor semantics. Sync paths gate as belt-and-braces — the await-spanning
// writers (finalize's tail, the preview writes) are the ones the guard lives for.
function turnTokenOf(st) {
  return st?.turnToken ?? 0;
}
function staleTurnSkip(what, tok, st) {
  // ONE anomaly line per skipped write set — the captured anchor's own ack still fires; only the SHARED state is left to the newer turn
  log(
    `ANOMALY: stale turn token — ${what} write skipped (${tok} vs ${turnTokenOf(
      st,
    )}) — a newer dispatch owns the streamer`,
  );
}
const truncatePreview = (text) =>
  text.length > SPLIT_THRESHOLD ? text.slice(0, SPLIT_THRESHOLD) + " …" : text;
function splitChunks(text, size) {
  const chunks = [];
  let s = String(text);
  while (s.length > size) {
    let cut = s.lastIndexOf("\n", size);
    let skip = 0; // a whitespace cut consumes the separator so the next chunk starts AT a token; the newline cut keeps the "\n" head (existing behavior)
    if (cut < size * 0.5) {
      // no newline in the back half: prefer a whitespace boundary — a hard cut lands mid-token and breaks a URL (2026-09-24 sizing defect, the agent-path twin of the /status fix)
      const floor = Math.ceil(size * 0.5);
      let ws = -1;
      for (let i = size; i >= floor; i--)
        if (/\s/.test(s[i])) {
          ws = i;
          break;
        }
      if (ws >= 0) {
        cut = ws;
        skip = 1;
      } else cut = size; // whitespace boundary; hard cut otherwise
    }
    chunks.push(s.slice(0, cut));
    s = s.slice(cut + skip);
  }
  if (s || !chunks.length) chunks.push(s);
  return chunks.filter((c) => c.length);
}
// ---------- reaction ack (deferred hermes "reactions"): turn lifecycle on the TRIGGER ----------
// The reply lands in the thread (or the channel) — the trigger needs its own signal:
// 👀 when the turn starts, ✅ when it lands, ⚠️ when nothing does. Every op is
// fire-and-forget: a failed reaction logs and never touches reply delivery.
// Reliability (production 2026-09-26 ⚠️-on-a-delivered-turn):
//  - ⚠️ means DELIVERY failure only. It is put by finalize(delivered=0), failTurn,
//    failPending, /reset, and the busy:false resolution of a textless turn — never
//    by a mid-turn textless assistant message end (every tool-call message used to
//    ack ⚠️ before the reply even existed) and never by a reaction failure.
//  - The swap is paced: reactions get their own per-message bucket, but back-to-back
//    ops on one trigger still 429 together (the incident's 👀 PUT and ✅ PUT both
//    429'd). rest.request's bucketWait re-checks the margin on every op; the pace
//    below just keeps the two ops from racing the same window.
//  - A failed reaction op gets ONE delayed retry — after that it logs and gives up;
//    the delivered verdict (✅) is already decided and never downgraded.
//  - The verdict is TERMINAL (production 2026-09-27 ⚠️-beside-✅): once a trigger
//    resolves delivered, a later ackFinal(false) on it is a logged NO-OP — no
//    event (late agent_end settle, watchdog, unregister, self-heal) may downgrade
//    it. The fail swap also strips a stale ✅ before ⚠️ lands, so a trigger can
//    never end with both marks even in the pre-resolution window.
//  - Provenance: every ackFinal/failTurn call logs its path + the streamer state
//    it fired on — the round logs verdicts, this names WHO decided them.
const REACTION_EYES = "👀",
  REACTION_OK = "✅",
  REACTION_FAIL = "⚠️";
const REACTION_SWAP_PACE_MS = 350; // ~0.3-0.5s DELETE->PUT gap (env: DISCORD_REACTION_PACE_MS drives the smoke)
const REACTION_RETRY_MS = 5000; // delayed retry window for a failed ack op — the bucket cools inside rest.request first (env: DISCORD_REACTION_RETRY_MS)
const reactionPaceMs = () => {
  const v = Number(process.env.DISCORD_REACTION_PACE_MS);
  return Number.isFinite(v) && v >= 0 ? v : REACTION_SWAP_PACE_MS;
};
const reactionRetryMs = () => {
  const v = Number(process.env.DISCORD_REACTION_RETRY_MS);
  return Number.isFinite(v) && v >= 0 ? v : REACTION_RETRY_MS;
};
async function ackOp(op, what) {
  // one attempt + one delayed retry; failures log and stop — never a delivery verdict
  try {
    await op();
    return;
  } catch (e) {
    log(
      `reaction ack failed (${what}): ${
        e?.message ?? e
      } — one delayed retry in ${Math.round(reactionRetryMs() / 1000)}s`,
    );
  }
  await sleep(reactionRetryMs());
  try {
    await op();
  } catch (e) {
    log(
      `reaction ack retry failed (${what}): ${
        e?.message ?? e
      } — giving up (never a delivery verdict)`,
    );
  }
}
function ackEyes(convKey) {
  const st = streamers.get(convKey);
  if (!loadConfig().reactions || !st?.triggerChannelId || !st?.triggerMessageId)
    return;
  ackOp(
    () =>
      rest.addReaction(st.triggerChannelId, st.triggerMessageId, REACTION_EYES),
    "eyes",
  ); // fire-and-forget
}
async function ackFinal(
  convKey,
  ok,
  triggerChannelId,
  triggerMessageId,
  via = "unattributed",
) {
  const st = streamers.get(convKey);
  const stLine = () =>
    `streamer { pendingAck: ${st?.pendingAck ?? null}, busy: ${
      st?.busy ?? null
    }, finalizing: ${st?.finalizing ?? 0}, turn: ${turnTokenOf(
      st,
    )}, resolved: ${
      st?.resolved ? (st.resolved.ok ? "delivered" : "failed") : "none"
    }, previewId: ${st?.previewId ?? null} }`;
  log(
    `ackFinal(${ok ? "delivered" : "failed"}) via ${via} — trigger ${
      triggerChannelId ?? "(none)"
    }/${triggerMessageId ?? "(none)"}; ${stLine()}`,
  ); // (#1 provenance) every terminal ack names its path + the state it fired on — the 2026-09-27 ⚠️-beside-✅ incident was invisible without it
  if (
    !ok &&
    st?.resolved?.ok === true &&
    st.resolved.ch === triggerChannelId &&
    st.resolved.mid === triggerMessageId
  ) {
    log(
      `ANOMALY: ackFinal(false) via ${via} on trigger ${triggerChannelId}/${triggerMessageId} whose turn already resolved DELIVERED — no-op, the delivered verdict is final`,
    ); // (#2 terminal state) once ✅ landed, no later event downgrades the same trigger
    return;
  }
  if (!loadConfig().reactions || !triggerChannelId || !triggerMessageId) return;
  // the swap removes stale marks BEFORE the verdict lands: a stale ⚠️ must never sit
  // beside a ✅ (the delivered incident trigger ended with BOTH) — a never-added
  // emoji DELETE 404s harmlessly
  await ackOp(
    () =>
      rest.removeReaction(triggerChannelId, triggerMessageId, REACTION_EYES),
    "remove eyes",
  );
  await sleep(reactionPaceMs());
  if (ok) {
    await ackOp(
      () =>
        rest.removeReaction(triggerChannelId, triggerMessageId, REACTION_FAIL),
      "remove stale fail",
    );
    await sleep(reactionPaceMs());
  } else {
    await ackOp(
      () =>
        rest.removeReaction(triggerChannelId, triggerMessageId, REACTION_OK),
      "remove stale ok",
    ); // (#3 asymmetric cleanup) a genuine failure strips a stale ✅ too — the trigger can never end with both marks
    await sleep(reactionPaceMs());
  }
  await ackOp(
    () =>
      rest.addReaction(
        triggerChannelId,
        triggerMessageId,
        ok ? REACTION_OK : REACTION_FAIL,
      ),
    ok ? "ok" : "fail",
  );
}

const typingIntervalMs = () => {
  const v = Number(process.env.DISCORD_TYPING_INTERVAL_MS);
  return Number.isFinite(v) && v >= 0 ? v : TYPING_INTERVAL_MS;
}; // env: the smoke drives the failure counter fast
function startTyping(convKey, cfg) {
  const st = streamerOf(convKey);
  if (!cfg.typing_indicator || st.typingTimer || !st.channelId) return;
  let fails = 0; // consecutive failures — silent-but-dying is how the 12s/10s indicator gap happened; once per 5 keeps the log honest without spamming
  const tick = () =>
    rest.typing(st.channelId).then(
      () => {
        fails = 0;
      },
      () => {
        if (++fails % 5 === 1)
          log(
            `typing indicator failing (${fails} consecutive) on channel ${st.channelId}`,
          );
      },
    ); // DM typing events are unreliable — own loop (hermes :3999-4034)
  tick();
  st.typingTimer = setInterval(tick, typingIntervalMs());
}
function stopTyping(convKey) {
  const st = streamers.get(convKey);
  if (st?.typingTimer) {
    clearInterval(st.typingTimer);
    st.typingTimer = null;
  }
}

// ---------- mid-turn death visibility (production 2026-09-24 worker recycle: a
// turn died silently and the thread went permanently mute — no self-heal, no
// failure notice, a zombie wrapper leaked). A turn that can never complete
// (worker death, unregister mid-turn, stream silence past the window) must
// fail VISIBLY: ⚠️ on the stalled turn's trigger + a short channel notice. ----------
const turnTimeoutMs = () => {
  const v = Number(process.env.DISCORD_TURN_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : TURN_TIMEOUT_MS;
}; // env: the smoke drives the watchdog fast
function clearTurnTimer(st) {
  if (st?.turnTimer) {
    clearTimeout(st.turnTimer);
    st.turnTimer = null;
  }
}
function armTurnTimer(convKey) {
  // last-event-reset watchdog: every stream event re-arms; a silent turn fails visibly when it fires
  const st = streamerOf(convKey);
  clearTurnTimer(st);
  st.turnTimer = setTimeout(() => {
    st.turnTimer = null;
    failTurn(
      convKey,
      `turn timeout — no stream events for ${Math.round(
        turnTimeoutMs() / 1000,
      )}s`,
    );
  }, turnTimeoutMs());
}
async function failTurn(convKey, why) {
  const st = streamers.get(convKey);
  const tok = turnTokenOf(st); // captured at ENTRY — the failure belongs to the turn that was current when it fired
  const stLine = () =>
    `streamer { pendingAck: ${st?.pendingAck ?? null}, busy: ${
      st?.busy ?? null
    }, finalizing: ${st?.finalizing ?? 0}, turn: ${turnTokenOf(
      st,
    )}, resolved: ${
      st?.resolved ? (st.resolved.ok ? "delivered" : "failed") : "none"
    }, previewId: ${st?.previewId ?? null} }`;
  if (tok !== turnTokenOf(st)) {
    // a newer dispatch owns the streamer — failing HERE would ack and clear the CURRENT turn's state on the wrong anchor (belt: sync-fresh today, the guard holds if an await ever lands above)
    staleTurnSkip("failTurn", tok, st);
    return;
  }
  if (st && st.finalizing > 0) {
    // (#2) finalize owns the verdict while it delivers — a mid-delivery watchdog/unregister can never ⚠️ a delivering turn
    log(
      `failTurn no-op (${why}) — finalize is in flight and owns the verdict; ${stLine()}`,
    );
    return;
  }
  if (
    !st ||
    !st.channelId ||
    !(st.pendingAck || st.busy || st.previewId != null)
  ) {
    // nothing in flight (or never anchored to a channel) — nothing to fail visibly
    if (st?.resolved)
      log(
        `ANOMALY: late failTurn (${why}) on a turn already resolved (${
          st.resolved.ok ? "delivered" : "failed"
        }) — no-op, the verdict is final`,
      ); // (#2) the post-verdict watchdog / self-heal / unregister is inert — and now visible
    return;
  }
  log(`failTurn: ${why} — ${stLine()}`); // (#1 provenance) which path failed the turn + the state it fired on
  stopTyping(convKey);
  clearTurnTimer(st);
  st.busy = false;
  st.previewId = null;
  st.previewShown = null;
  st.lastEditAt = null;
  st.parkedText = null; // parked preview deltas die with the turn — finalize was their only delivery
  ackFinal(
    convKey,
    false,
    st.triggerChannelId,
    st.triggerMessageId,
    "failTurn",
  ); // stalled 👀 -> ⚠️ (fire-and-forget; a never-added 👀 DELETE 404s harmlessly)
  st.pendingAck = false;
  st.resolved = {
    ok: false,
    ch: st.triggerChannelId,
    mid: st.triggerMessageId,
  }; // (#2) terminal failed verdict
  const uiLink = webuiLink(ledger.get(convKey)?.sessionId, loadConfig()); // hermes notice pattern: the failure tells you where to look (adapter.py unauthorized alert carries its context lines)
  await rest
    .sendMessage(
      st.channelId,
      "(the conversation session died — send another message to respawn it)" +
        (uiLink ? `\nopen this conversation in the ui: ${uiLink}` : ""),
      {},
    )
    .catch(() => {});
  log(`conv ${convKey}: turn failed visibly — ${why}`);
}

async function previewEdit(convKey, st, cfg, text) {
  const tok = turnTokenOf(st); // captured at entry — the preview bookkeeping belongs to the turn this delta arrived on; a mid-await dispatch makes the resumed writes stale
  const shown = truncatePreview(text);
  if (st.previewShown === shown) return; // saturated-preview dedup: past the cap every edit truncates to the same string (HH #8)
  const now = Date.now();
  const minEditMs = Number(cfg?.preview_min_edit_ms); // the knob (default 2500ms): intermediate edits collapse inside the window — less REST spam, no flicker; finalize's chunk-1 edit always lands the final text
  if (
    st.previewId &&
    st.lastEditAt &&
    now - st.lastEditAt <
      (Number.isFinite(minEditMs) && minEditMs >= 0
        ? minEditMs
        : PREVIEW_MIN_INTERVAL_MS)
  )
    return;
  if (!st.previewId) {
    // preview-create resilience (production 2026-09-25): a failed create used to re-POST on EVERY delta — now deltas park and one bounded retry chain runs
    if (tok !== turnTokenOf(st)) {
      staleTurnSkip("preview park", tok, st);
      return;
    } // belt: entry-fresh today — a stale park would leave the OLD turn's delta for the new turn's preview
    st.parkedText = shown;
    if (st.creating) return; // a chain is in flight — its next attempt picks up the freshest parked text
    if (st.createCooldownUntil && now < st.createCooldownUntil) return; // post-give-up breath — finalize still delivers the full reply
    st.creating = ensurePreview(st, cfg).finally(() => {
      st.creating = null;
    });
    return;
  }
  try {
    await rest.editMessage(st.channelId, st.previewId, shown);
    if (tok !== turnTokenOf(st)) {
      staleTurnSkip("preview edit", tok, st);
      return;
    } // a newer turn owns the bookkeeping — its preview must never be marked with this turn's text
    st.previewShown = shown;
    st.lastEditAt = now;
  } catch (e) {
    if (isUnknownMessageError(e)) {
      // the preview was deleted mid-stream — start a fresh one instead of dying on every delta
      log(`preview ${st.previewId} is gone — recreating`);
      if (tok !== turnTokenOf(st)) {
        staleTurnSkip("preview recreate", tok, st);
        return;
      } // the preview id may now be the NEW turn's — never null its bookkeeping from the old turn
      st.previewId = null;
      st.previewShown = null;
      st.lastEditAt = null;
      return previewEdit(convKey, st, cfg, text); // depth 1: this recursion lands in the create path, which never recurses
    }
    log(`preview edit failed: ${e?.message ?? e}`);
  }
}

const PREVIEW_CREATE_MAX_ATTEMPTS = 4;
const PREVIEW_CREATE_COOLDOWN_MS = 8000;
const previewBackoffMs = () => {
  const v = Number(process.env.DISCORD_PREVIEW_BACKOFF_MS);
  return Number.isFinite(v) && v >= 0 ? v : 2000;
}; // env: the smoke keeps the bounded chain fast
async function ensurePreview(st, cfg) {
  const tok = turnTokenOf(st); // the chain retries across SECONDS of awaits — a dispatch landing mid-chain strands it; never adopt its landed message as the new turn's preview bookkeeping
  for (let attempt = 1; attempt <= PREVIEW_CREATE_MAX_ATTEMPTS; attempt++) {
    const text = st.parkedText; // freshest parked delta at attempt time — the preview lands current, not stale
    if (!text) return;
    try {
      const m = await rest.sendMessage(st.channelId, text, {
        replyTo: cfg.reply_to_mode !== "off" ? st.triggerMessageId : undefined,
      });
      if (m) {
        if (tok !== turnTokenOf(st)) {
          staleTurnSkip("preview create", tok, st);
          return;
        } // the landed message belongs to a superseded turn's stream — the newer turn parks and creates its own
        st.previewId = m.id;
        st.previewShown = text;
        st.lastEditAt = Date.now();
        st.parkedText = null;
        return;
      }
    } catch (e) {
      log(
        `preview create attempt ${attempt}/${PREVIEW_CREATE_MAX_ATTEMPTS} failed: ${
          e?.message ?? e
        }`,
      );
    }
    if (attempt < PREVIEW_CREATE_MAX_ATTEMPTS) await sleep(previewBackoffMs());
  }
  st.createCooldownUntil = Date.now() + PREVIEW_CREATE_COOLDOWN_MS; // bounded give-up — parked deltas wait for finalize (machine latch: a rate-limit artifact, not turn content — ungated)
  log(
    "preview create gave up after bounded retries — deltas stay parked; finalize will deliver the reply",
  );
}

const sendPaceMs = () => {
  const v = Number(process.env.DISCORD_SEND_PACE_MS);
  return Number.isFinite(v) && v >= 0 ? v : SEND_PACE_MS;
}; // env: the smoke proves the mechanism with a short pace

async function finalize(convKey, st, cfg, fullText) {
  const tok = turnTokenOf(st); // captured at ENTRY — every streamer write below is gated on the turn that opened it; a dispatch landing mid-delivery makes the tail stale
  stopTyping(convKey);
  st.finalizing = (st.finalizing ?? 0) + 1; // (#2) while finalize is in flight it owns the verdict: a concurrent busy:false settle (the agent_end races finalize's delivery awaits — production 2026-09-27 ⚠️-beside-✅) can never fire its own fail swap beside the delivered one
  st.finalizingToken = tok; // the ownership window is TURN-scoped: a busy:false of a NEWER turn must not stand down behind this finalize (the tool-only N+1 witness) — the settle compares its own token
  try {
    const ackCh = st.triggerChannelId,
      ackMid = st.triggerMessageId; // captured before the awaits — a mid-flight turn N+1 re-anchor must not steal the swap
    const shownBefore = st.previewShown; // (#4) the preview's current LANDED content — captured pre-detach so a mid-flight N+1 edit cannot skew the identical-text skip
    const maxSplits = cfg.max_splits;
    let chunks = splitChunks(fullText, SPLIT_THRESHOLD);
    if (chunks.length > maxSplits) {
      // flood cap — beyond it a truncation notice replaces the tail (hermes :2805-2825)
      chunks = chunks.slice(0, maxSplits);
      const notice =
        "\n\n*(output truncated — full text is in the agent session)*";
      chunks[chunks.length - 1] =
        chunks[chunks.length - 1].slice(0, SPLIT_THRESHOLD - notice.length) +
        notice;
    }
    const replyTo =
      cfg.reply_to_mode !== "off" ? st.triggerMessageId : undefined; // reply_to_mode governs chunk 1's reference to the trigger ("all" is rejected at config load — not implemented)
    // first-response deeplink (2026-09-24 operator feedback, delivery-UX round 2):
    // the FIRST finalized reply of a conversation appends the webui "view this
    // conversation" line — later replies stay clean; /status keeps its links row.
    // Reserved on the ledger BEFORE delivery (a concurrent finalize never
    // double-appends); a zero-delivery turn un-reserves below so the next reply
    // carries the one-shot instead.
    let firstLinkRsv = false,
      firstLinkLine = "",
      firstLinkInChunk = false;
    if (cfg.first_response_link && chunks.length) {
      const lrow = ledger.get(convKey);
      const uiLink = webuiLink(lrow?.sessionId ?? null, cfg);
      if (uiLink && lrow && lrow.firstLinkShown !== true) {
        lrow.firstLinkShown = true;
        saveLedger(); // reserve — the ride is one-shot per conversation
        firstLinkRsv = true;
        firstLinkLine = `view this conversation: ${uiLink}`;
        const last = chunks[chunks.length - 1];
        if (last.length + 2 + firstLinkLine.length <= SPLIT_THRESHOLD) {
          chunks[chunks.length - 1] = `${last}\n\n${firstLinkLine}`;
          firstLinkInChunk = true;
        } // rides the last chunk when it fits
        // no room: the line posts as one extra message after the chunks (the extra-send below)
      }
    }
    if (st.creating) {
      try {
        await st.creating;
      } catch {}
    } // an in-flight create chain settles first — a late create must never land next to the reply as a duplicate
    // detach + reset BEFORE the awaited REST calls (review finding 3): a turn N+1
    // update arriving mid-finalize must never edit turn N's chunk-1, and the new
    // preview it creates mid-flight must survive finalize's settles
    let previewId = st.previewId;
    st.previewId = null;
    st.previewShown = null;
    st.lastEditAt = null; // next text-bearing assistant message starts a fresh preview — UNGATED on purpose: the detach IS the anti-clobber for a mid-flight N+1 preview (finding 3); a stale token here means no N+1 preview exists yet, and detaching still frees the bookkeeping for the one it will create
    if (tok !== turnTokenOf(st)) staleTurnSkip("finalize busy settle", tok, st);
    // this turn's settle must not clear the NEW turn's busy (its busy:true may already be landed)
    else st.busy = false; // turn-end settle (production 2026-09-26): busy cleared only by agent_end left a completed turn looking in-flight — a lost agent_end made the next self-heal failTurn (⚠️) a DELIVERED trigger
    let delivered = 0;
    try {
      if (previewId) {
        if (shownBefore === chunks[0]) {
          // (#4) short replies: the last preview delta IS the final text — an edit with identical bytes is a no-op Discord renders as "(edited)" (production UX nit); the preview message simply stays
          log(
            "finalize: the preview already shows the final text — skipping the chunk-1 edit",
          );
          delivered = 1;
        } else {
          try {
            await rest.editMessage(st.channelId, previewId, chunks[0]);
            delivered = 1;
          } catch (e) {
            if (isUnknownMessageError(e)) {
              log(
                `finalize: preview ${previewId} is gone — falling back to a fresh send`,
              );
              previewId = null;
            } else throw e;
          }
        }
      }
      if (!delivered) {
        const m = await rest.sendMessage(st.channelId, chunks[0], { replyTo }); // a rejected reference degrades to a fresh send inside sendMessage
        if (m) {
          previewId = m.id;
          delivered = 1;
        }
      }
      for (const chunk of chunks.slice(1)) {
        await sleep(sendPaceMs()); // split pacing: stay under the 5/5s channel bucket; rest.request's bucket wait stacks on top
        const m = await rest.sendMessage(st.channelId, chunk, {}); // chunks 2..N post PLAIN (2026-09-24 operator rule: the message_reference rides a block's FIRST chunk only — adjacency associates the rest, the reply header never repeats)
        if (!m) break; // a failed chunk stops the chain — no silent gaps
        delivered++;
      }
      if (firstLinkRsv && !firstLinkInChunk) {
        // the last chunk had no room — the link posts as one final paced message of this block
        await sleep(sendPaceMs());
        const m = await rest.sendMessage(st.channelId, firstLinkLine, {});
        if (m) delivered++;
      }
    } catch (e) {
      log(`finalize failed: ${e?.message ?? e}`);
    }
    if (!delivered)
      delivered = (await consolidatedFallback(st, fullText)) ? 1 : 0; // zero chunks landed — never drop the reply silently; the consolidated send still counts as delivered
    if (!delivered)
      recoveryPersistDelivery(convKey, st.channelId, fullText, cfg); // TERMINAL failure (every split path + the fallback): the finalized reply is now a durable delivery obligation — the drain retries it on the next dispatch / the 60s sweep (hermes delivery_ledger.py:37-49 at-least-once)
    if (!delivered && firstLinkRsv) {
      // the reply never landed — un-reserve the one-shot so the NEXT delivered reply carries the link instead
      const lrow = ledger.get(convKey);
      if (lrow) {
        lrow.firstLinkShown = false;
        saveLedger();
      }
    }
    // turn-token guard (production 2026-09-28 under-ack): this tail runs after
    // EVERY delivery await — a dispatch(N+1) that landed mid-delivery owns the
    // streamer now, and clearing ITS fresh pendingAck=true here is what stranded
    // the new turn's 👀. The verdict still lands: ackFinal below fires on the
    // CAPTURED anchor, so this turn's ✅/⚠️ resolves its own trigger regardless.
    if (tok !== turnTokenOf(st)) staleTurnSkip("finalize tail", tok, st);
    else {
      st.pendingAck = false; // the verdict is decided — an in-flight paced ack swap must never count as a failing turn to a later self-heal
      st.resolved = { ok: delivered > 0, ch: ackCh, mid: ackMid }; // (#2) terminal verdict — delivered is FINAL: no later event may downgrade this trigger
    }
    ackFinal(convKey, delivered > 0, ackCh, ackMid, "finalize"); // 👀 (and a stale ⚠️) -> ✅ (delivered, even degraded) or ⚠️ (nothing landed) — fire-and-forget, never blocks the reply; captured anchor: fires for THIS turn even when a newer one owns the streamer
  } finally {
    st.finalizing = Math.max(0, (st.finalizing ?? 0) - 1);
    if (st.finalizing === 0) st.finalizingToken = null;
  } // the ownership window closes on every path — a stuck counter would stand the settle down forever
}

async function consolidatedFallback(st, fullText) {
  // last resort after every split path failed: ONE best-effort send of the whole
  // reply (rest.request has already waited out the bucket); capped with a visible notice
  const notice =
    "\n\n*(delivery degraded — full text is in the agent session)*";
  let content = String(fullText);
  if (content.length > SPLIT_THRESHOLD - notice.length)
    content = content.slice(0, SPLIT_THRESHOLD - notice.length) + notice;
  try {
    await rest.sendMessage(st.channelId, content, {});
    log("finalize: delivered one consolidated message after degraded delivery");
    return true;
  } catch (e) {
    log(`finalize: could not deliver the reply at all — ${e?.message ?? e}`); // loud on purpose: a dead thread must be visible in server.log
    return false;
  }
}

// ---------- beacon events -> streamer ----------
async function onBeaconEvent(sessionId, event, data) {
  // presence rows track busy for EVERY registered session — untagged included:
  // agent_start/agent_end flips are instant, the 15s register heartbeat is the
  // fallback (presence-plan §8.2). Above the routing scope guard on purpose —
  // presence derives machine-wide and never routes Discord traffic.
  if (event === "busy") {
    const prow = sessions.get(sessionId);
    if (prow) {
      prow.status = data?.busy ? "working" : "idle";
      prow.lastBusyAt = Date.now();
      presence.refreshFromSessions(sessions);
    }
  }
  // scope guard: only conversations this bot spawned and routed are driven —
  // the operator's interactive sessions never receive Discord traffic
  let convKey = null;
  for (const [k, r] of routing)
    if (r.sessionId === sessionId) {
      convKey = k;
      break;
    }
  if (!convKey) return;
  const cfg = loadConfig();
  const st = streamerOf(convKey);
  const tok = turnTokenOf(st); // captured at ENTRY — the settles below act for the turn that was current when the event arrived
  if (event === "busy") {
    if (data?.busy) {
      if (tok !== turnTokenOf(st)) staleTurnSkip("busy start", tok, st);
      // belt: sync-fresh today — a stale flip would mark the NEW turn busy
      else {
        st.busy = true;
        startTyping(convKey, cfg);
        armTurnTimer(convKey);
      }
    } else {
      if (tok !== turnTokenOf(st)) staleTurnSkip("busy settle", tok, st);
      // belt: sync-fresh today — a stale settle must never touch the NEW turn's ack state
      else {
        st.busy = false;
        stopTyping(convKey);
        clearTurnTimer(st);
        if (
          st.finalizing > 0 &&
          (st.finalizingToken ?? turnTokenOf(st)) === tok
        ) {
          // token-aware: the window is TURN-scoped — a finalize of an OLDER turn never stands this settle down (the tool-only N+1 witness acked late, or never)
          // (#2, production 2026-09-27 ⚠️-beside-✅) the agent_end raced finalize's
          // delivery awaits: pendingAck is still true (finalize clears it only after
          // them), so the OLD code fired ackFinal(false) CONCURRENTLY with finalize's
          // own delivered swap — the paced stale-mark cleanups crossed (the delivered
          // swap's DELETE ⚠️ ran before the fail swap's PUT ⚠️) and the ⚠️ landed
          // beside the ✅ (the PUT even 429'd into a 5s-delayed retry landing AFTER
          // the ✅ settled). Finalize owns the verdict while in flight; the settle
          // stands down — no second verdict can cross it.
          log(
            `conv ${convKey}: busy:false while finalize is in flight — finalize owns the verdict, the settle stands down`,
          );
        } else if (st.pendingAck) {
          // turn-end settle (production 2026-09-26): pendingAck still set here means the
          // whole turn produced no text message_end (a tool-only turn) — nothing landed,
          // resolve the trigger now (⚠️), never strand its 👀 (reviewer finding,
          // relocated from the textless message_end branch that used to misfire ⚠️
          // mid-turn on every tool-call message before the reply even existed)
          st.previewId = null;
          st.previewShown = null;
          st.lastEditAt = null;
          st.parkedText = null;
          ackFinal(
            convKey,
            false,
            st.triggerChannelId,
            st.triggerMessageId,
            "busy-settle",
          );
          st.pendingAck = false;
          st.resolved = {
            ok: false,
            ch: st.triggerChannelId,
            mid: st.triggerMessageId,
          }; // (#2) terminal failed verdict
        } else if (
          st.resolved &&
          st.resolved.ch === st.triggerChannelId &&
          st.resolved.mid === st.triggerMessageId
        ) {
          log(
            `ANOMALY: late busy:false on a turn already resolved (${
              st.resolved.ok ? "delivered" : "failed"
            }) — no-op, the verdict is final`,
          ); // (#2) a stale agent_end replay / duplicate settle after the verdict: visible, never a re-resolve
        }
      }
    }
  } else if (event === "message_update") {
    if (st.busy) armTurnTimer(convKey); // stream event — reset the silence watchdog
    if (typeof data?.text === "string" && data.text)
      await previewEdit(convKey, st, cfg, data.text);
  } else if (event === "message_end") {
    armTurnTimer(convKey); // the end is a stream event — the window re-arms until busy:false clears it; a fully settled streamer makes the late watchdog a no-op
    if (typeof data?.text === "string" && data.text.trim()) {
      await finalize(convKey, st, cfg, data.text); // finalize detaches + resets the streamer BEFORE its awaits — a turn N+1 preview created mid-flight survives it
    } else if (
      st.resolved &&
      st.resolved.ch === st.triggerChannelId &&
      st.resolved.mid === st.triggerMessageId
    ) {
      // (#2) a textless end AFTER the verdict (a stale replay landing on the
      // resolved turn's anchor): the verdict is final — no state reset, no ack,
      // and now it is VISIBLE instead of another silent late event
      log(
        `ANOMALY: late textless message_end on a turn already resolved (${
          st.resolved.ok ? "delivered" : "failed"
        }) — no-op, the verdict is final`,
      );
    } else {
      // textless assistant message end = a tool-call message (thinking+toolCall, no
      // text block). Mid-turn state reset ONLY — production 2026-09-26: this branch
      // acked ⚠️ on the trigger for EVERY textless end, so a delivered turn whose
      // first assistant message was a tool call ended with BOTH ⚠️ and ✅ on its
      // trigger. Nothing landed YET ≠ nothing will land: the ack resolves at
      // finalize, at busy:false (tool-only turn), or at failTurn — never here.
      if (tok !== turnTokenOf(st)) staleTurnSkip("textless end reset", tok, st);
      // belt: sync-fresh today — a stale reset would null the NEW turn's preview
      else {
        st.previewId = null;
        st.previewShown = null;
        st.busy = false; // settle: a lost agent_end must not leave busy stale — a later self-heal/unregister must never failTurn a completed turn
      }
    }
  }
}

// ---------- slash commands (D7): /ping /status /reset, guild-scoped, authz mirrors D4 ----------
const SLASH_COMMANDS = [
  { name: "ping", description: "Bot gateway state and uptime" },
  { name: "status", description: "Live conversations and registered sessions" },
  {
    name: "reset",
    description:
      "Reset this channel/thread conversation — next message starts fresh",
  },
  {
    name: "stop",
    description:
      "Stop the current turn — queued messages resume on your next message",
  },
];
const commandFingerprint = crypto
  .createHash("sha256")
  .update(JSON.stringify(SLASH_COMMANDS))
  .digest("hex")
  .slice(0, 16);
const registeredGuilds = new Map(); // guildId -> fingerprint this process PUT (persistence deferred by design; one PUT per boot, one 429 tolerated)

async function syncSlashCommands(guildIds) {
  const cfg = loadConfig();
  if (!cfg.application_id) {
    log("slash: no application_id — commands not registered");
    return;
  }
  for (const gid of guildIds) {
    if (!cfg.allowed_guild_ids.includes(String(gid))) continue; // guild-scoped for allowlisted guilds only
    if (registeredGuilds.get(String(gid)) === commandFingerprint) continue;
    try {
      await rest.registerGuildCommands(
        cfg.application_id,
        String(gid),
        SLASH_COMMANDS,
      );
      registeredGuilds.set(String(gid), commandFingerprint);
      log(
        `slash: registered ${SLASH_COMMANDS.length} guild-scoped commands for ${gid}`,
      );
    } catch (e) {
      log(`slash: registration failed for guild ${gid}: ${e?.message ?? e}`);
    }
  }
}

async function interactionAuthorized(inter, cfg) {
  const userId = String(inter.member?.user?.id ?? inter.user?.id ?? "");
  // the gate-5 user mirror runs for DMs too: allow_dm must never act as an
  // implicit user allowlist (fail-closed; review finding 1)
  if (!cfg.allow_all_users && !listHas(cfg.allowed_users, userId)) return false; // mirrors gate 5
  if (!inter.guild_id) return cfg.allow_dm; // DM interaction: user gate above + allow_dm decide
  if (!cfg.allowed_guild_ids.includes(String(inter.guild_id))) return false; // mirrors gate 3
  const info = await channelInfo(inter.channel_id);
  const keys = CHANNEL_KEYS(info);
  if (cfg.allowed_channels.length === 0) return false; // mirrors gate 4 (fail-closed)
  if (!keys.some((k) => listHas(cfg.allowed_channels, k))) return false;
  if (keys.some((k) => listHas(cfg.ignored_channels, k))) return false;
  return true;
}

function webuiLink(sessionId, cfg) {
  // "" = feature off; contract: the webui's hash route #/s/<sessionId> (dashboard.js parses it once at load, showSession writes it on every switch)
  if (!cfg?.webui_base_url || !sessionId) return "";
  return `${cfg.webui_base_url}#/s/${encodeURIComponent(String(sessionId))}`;
}
const relAge = (ms) => {
  // compact age for /status rows: 45s | 30m | 2h | 3d (floor — stable between render and assert)
  if (!Number.isFinite(ms) || ms < 0) return "?";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};
function otherSessions() {
  // /status aggregate (2026-09-23 operator: the operator cares about their CONVERSATIONS, not every prime-agent session on the box) — non-conversation rows: count + working count
  const convSids = new Set();
  for (const r of routing.values()) convSids.add(r.sessionId);
  let n = 0,
    w = 0;
  for (const s of sessions.values()) {
    if (convSids.has(s.sessionId)) continue; // the live sessions of displayed conversations
    n++;
    if (s.status === "working") w++;
  }
  return { n, w };
}
// /status fit-aware sizing (2026-09-24 review gap: at today's production size the
// 1900-char slice silently cut the deeplink line MID-URL, and at >=22 rows it cut
// inside the fenced table — unterminated fence, whole reply broken; the root
// trap: padEnd column math let ONE wide legacy session-name cell inflate every
// row). The reply is rendered to a budget INSIDE SPLIT_THRESHOLD so neither
// knife (the trailing slice below, the type-4 callback slice in
// rest.interactionCallback) can ever fire. Two caps make any ledger fit, both
// losses EXPLICIT:
//  - conversations cap: most-recent-first priority (lastActive/created) — shown
//    rows keep ledger order, and the table ends with a "+N more conversations"
//    row INSIDE the fence; the fence and the aggregate line are structural and
//    never sacrificed;
//  - links cap: deeplinks ride the remaining budget, trimmed from the end with
//    a "(+N more)" tail.
// Column widths are computed over the SHOWN rows only — a dropped wide row
// re-narrows its column for everyone.
const STATUS_BUDGET = SPLIT_THRESHOLD - 200; // 200 = slack between the fit target and the hard knives — the render measures itself exactly, the margin is insurance
function statusText(cfg) {
  const head = [
    `gateway: ${gatewayState} · uptime ${Math.round(
      (Date.now() - startedAt) / 1000,
    )}s`,
    `conversations (${ledger.size}):`,
  ];
  const header = ["#", "conversation", "state", "session", "up", "last"];
  const entries = []; // ledger order — cells minus the # column (the ordinal rides the SHOWN rows, so a capped subset renumbers); recent = the cap's priority key
  for (const [k, v] of ledger) {
    const route = routing.get(k);
    const row = route ? sessions.get(route.sessionId) : null;
    const live = !!(route && row); // a route whose session row expired (2+ missed heartbeats) is a dead beacon — down
    let state = live ? (row.status === "working" ? "working" : "live") : "down";
    if (!live && verdicts.has(k))
      state = `down ${ellipsize(verdicts.get(k), 20)}`; // the LATEST claim verdict, capped into the state column — the register log lines stay the source of truth
    const name = v.name ?? sessions.get(v.sessionId)?.name ?? null; // presence v2: routed registers stamp the name on the ledger row, so dead rows keep the last known name
    entries.push({
      key: k,
      cells: [
        convNameFor(k) ?? convKeySlug(k), // the resolved surface name; the convKey slug only before the fetch lands
        state,
        name ??
          (v.sessionId ? String(v.sessionId).slice(0, 8) + "…" : "(none)"), // registered name -> truncated uuid fallback
        relAge(Date.now() - Date.parse(v.created ?? "")),
        relAge(Date.now() - Date.parse(v.lastActive ?? "")),
      ],
      url: webuiLink(v.sessionId, cfg) || null, // markdown links are not clickable inside code blocks — they ride ONE numbered line under the table instead
      recent: Math.max(
        Date.parse(v.lastActive ?? "") || 0,
        Date.parse(v.created ?? "") || 0,
      ),
    });
  }
  const { n: other, w } = otherSessions();
  const agg = `${other} other sessions on this box (${w} working)`; // ONE aggregate line — no per-session row dump (2026-09-23 operator: a 39-row "(untagged) idle" wall was unreadable, and UUIDv7 ids born in the same ~65.5s window truncated to identical prefixes — the witnessed "duplicates")
  const tableLines = (sel) => {
    // widths over the SHOWN rows only — the subset recomputes its own columns
    const rows = [header, ...sel.map((e, i) => [String(i + 1), ...e.cells])];
    const widths = header.map((_, c) =>
      Math.max(...rows.map((r) => r[c].length)),
    );
    return rows.map((r) =>
      r
        .map((cell, c) => cell.padEnd(widths[c]))
        .join(" | ")
        .trimEnd(),
    );
  };
  const render = (sel, moreRow, linksLine) =>
    [
      ...head,
      "```",
      ...tableLines(sel),
      ...(moreRow ? [moreRow] : []),
      "```",
      ...(linksLine ? [linksLine] : []),
      agg,
    ].join("\n");
  let sel = entries,
    moreRow = null;
  if (render(sel, null, null).length > STATUS_BUDGET) {
    // conversations cap: drop the least-recent row one at a time — exact strings, no estimates
    const byRecent = [...entries].sort((a, b) => b.recent - a.recent); // stable — ties keep ledger order
    for (let keep = entries.length - 1; keep >= 1; keep--) {
      const keepSet = new Set(byRecent.slice(0, keep));
      sel = entries.filter((e) => keepSet.has(e)); // the shown rows keep ledger order
      moreRow = `+${entries.length - keep} more conversations`;
      if (render(sel, moreRow, null).length <= STATUS_BUDGET) break;
    } // ponytail: keep=1 only overflows if one row alone exceeds ~1.4k chars (every cell source is capped/sliced today — unreachable); the trailing slice stays the backstop
  }
  let linksLine = ""; // links cap: the deeplinks fill the remaining budget, trimmed from the end
  const links = [];
  sel.forEach((e, i) => {
    if (e.url) links.push(`[${i + 1}](${e.url})`);
  });
  if (links.length) {
    const remaining = STATUS_BUDGET - render(sel, moreRow, null).length - 1; // -1: the newline the links line adds
    let dropped = 0;
    while (
      links.length &&
      (links.join(" ") + (dropped ? ` (+${dropped} more)` : "")).length >
        remaining
    ) {
      links.pop();
      dropped += 1;
    }
    const line = [links.join(" "), dropped ? `(+${dropped} more)` : ""]
      .filter(Boolean)
      .join(" ");
    if (line.length <= remaining) linksLine = line; // zero links fit -> the marker alone still lands; no room at all -> no line (the fence and aggregate already won)
  }
  for (const e of sel)
    if (!SMOKE && !convNames.has(e.key) && !threadNameLastSet.has(e.key))
      primeConvName(e.key, ledger.get(e.key)?.channel_id); // fire-and-forget: only SHOWN rows warm their names (never in the smoke — no fetch may run before its REST stub exists)
  return render(sel, moreRow, linksLine).slice(0, SPLIT_THRESHOLD); // the trailing slice is a dead backstop — the fit render lands <= STATUS_BUDGET
}
const pingText = () =>
  `gateway ${gatewayState} · uptime ${Math.round(
    (Date.now() - startedAt) / 1000,
  )}s · conversations ${ledger.size} · sessions ${sessions.size}`;

async function resetConv(inter, cfg) {
  let convKey;
  if (inter.guild_id) {
    const info = await channelInfo(inter.channel_id);
    convKey = isThreadType(info.type)
      ? `thread:${inter.channel_id}`
      : `channel:${inter.channel_id}`;
  } else {
    convKey = `dm:${String(inter.member?.user?.id ?? inter.user?.id ?? "")}`;
  }
  if (!ledger.has(convKey))
    return "no conversation mapped here (auto-thread conversations live in their threads — run /reset inside the thread)";
  const route = routing.get(convKey);
  if (route) {
    const child = spawned.get(route.spawnPid);
    if (child) {
      try {
        child.kill("SIGTERM");
      } catch {}
    } // stop the live wrapper too, else routing keeps steering the old session
    routing.delete(convKey);
    claims.delete(convKey); // the reset session's beacon outlives its wrapper (daemon) — without this its ~15s heartbeat re-claims routing
  }
  const st = streamers.get(convKey);
  const tok = turnTokenOf(st); // captured at entry — /reset resolves the turn anchored when it read the streamer; a newer dispatch's ack debt is the watchdog's, not this ⚠️'s (belt: sync-fresh today)
  if (st && (st.pendingAck || st.busy || st.previewId != null)) {
    // reviewer finding: /reset cleared routing/ledger without resolving the
    // in-flight turn's trigger — the turn dies with the wrapper, so swap its 👀
    // for ⚠️ (the interaction reply carries the explanation; no extra notice)
    if (tok !== turnTokenOf(st)) staleTurnSkip("/reset settle", tok, st);
    else {
      stopTyping(convKey);
      clearTurnTimer(st);
      st.busy = false;
      st.previewId = null;
      st.previewShown = null;
      st.lastEditAt = null;
      st.pendingAck = false;
      st.resolved = {
        ok: false,
        ch: st.triggerChannelId,
        mid: st.triggerMessageId,
      }; // (#2) /reset resolves the in-flight turn as failed
      ackFinal(
        convKey,
        false,
        st.triggerChannelId,
        st.triggerMessageId,
        "/reset",
      );
    }
  }
  ledger.delete(convKey); // sessionId record is dropped — a reset conversation resumes from nothing
  verdicts.delete(convKey); // the dropped row can never display a verdict — no orphaned display state
  saveLedger();
  return "conversation reset — the next message starts a fresh session";
}

async function handleInteraction(inter) {
  const cfg = loadConfig();
  const name = inter?.data?.name;
  try {
    if (!(await interactionAuthorized(inter, cfg)))
      return await rest.interactionCallback(
        inter.id,
        inter.token,
        "not authorized",
      );
    if (name === "ping")
      return await rest.interactionCallback(inter.id, inter.token, pingText());
    if (name === "status")
      return await rest.interactionCallback(
        inter.id,
        inter.token,
        statusText(cfg),
      );
    if (name === "reset")
      return await rest.interactionCallback(
        inter.id,
        inter.token,
        await resetConv(inter, cfg),
      );
    if (name === "stop")
      return await rest.interactionCallback(
        inter.id,
        inter.token,
        await stopConv(inter, cfg),
      ); // busy-UX /stop: authz mirrors the ladder gates above — same interactionAuthorized path /ping /status /reset ride
    return await rest.interactionCallback(
      inter.id,
      inter.token,
      `unknown command: ${String(name)}`,
    );
  } catch (e) {
    log(`interaction ${String(name)} failed: ${e?.message ?? e}`);
    try {
      await rest.interactionCallback(
        inter.id,
        inter.token,
        "command failed — see server.log",
      );
    } catch {}
  }
}

// ---------- agent-decided threading (thread_policy "agent"): the discord_thread tool's server side ----------
// The beacon's discord_thread tool (registered in discord-tagged sessions) POSTs
// /internal/thread; the bot promotes the LIVE channel conversation to a thread
// created from its current trigger message — public type 11 + trigger-author
// member-add, exactly like the auto-thread path — and re-keys every map under
// thread:<newId>. SAME session: no respawn, transcript continuity preserved.
function remapConversationToThread(oldKey, threadId, st) {
  const newKey = `thread:${threadId}`;
  const l = ledger.get(oldKey);
  if (l) {
    ledger.delete(oldKey);
    ledger.set(newKey, { ...l, channel_id: threadId, lastActive: nowIso() });
  }
  const route = routing.get(oldKey);
  if (route) {
    routing.delete(oldKey);
    routing.set(newKey, route);
  }
  const claim = claims.get(oldKey);
  if (claim) {
    claims.delete(oldKey);
    claims.set(newKey, claim);
  }
  // deleting the old claim is the point: the beacon's env tag (DISCORD_CONV_KEY) is
  // frozen at spawn time, so its heartbeats keep registering under channel:<id> —
  // with the old claim gone they stay display-only and cannot resurrect the old
  // route. Events still drive the conversation: the scope guard matches by sessionId.
  const b = batchers.get(oldKey);
  if (b) {
    clearTimeout(b.timer);
    batchers.delete(oldKey);
    b.timer = setTimeout(
      () => {
        batchers.delete(newKey);
        flushBatch(newKey, b);
      },
      Math.max(0, loadConfig().text_batch_ms),
    );
    batchers.set(newKey, b);
  } // a batcher mid-debounce would flush under the dead old key — re-arm under the new one
  recoveryRemap(oldKey, newKey); // admitted-but-unflushed rows move with the conversation (flushBatch marks them done under the NEW key)
  streamers.delete(oldKey);
  streamers.set(newKey, st);
  st.channelId = threadId; // replies land in the thread from now on; the ack keeps hitting the channel trigger where the operator sees it
  saveLedger();
}
async function onThreadPromote(body) {
  const sessionId = String(body?.sessionId ?? "");
  const name = String(body?.name ?? "").trim();
  let convKey = null;
  for (const [k, r] of routing)
    if (r.sessionId === sessionId) {
      convKey = k;
      break;
    } // same lookup as onBeaconEvent — the live conversation of THIS session
  if (!convKey)
    return {
      code: 409,
      body: {
        error:
          "no live conversation for this session — answer in place; the thread tool needs the conversation's live route",
      },
    };
  if (!convKey.startsWith("channel:"))
    return {
      code: 409,
      body: {
        error: `this conversation is ${
          convKey.startsWith("thread:") ? "already a thread" : "a DM"
        } — nothing to promote`,
      },
    };
  const st = streamers.get(convKey);
  if (!st?.triggerChannelId || !st?.triggerMessageId)
    return {
      code: 409,
      body: {
        error:
          "no trigger message anchored yet — call the tool once the conversation has a message to thread from",
      },
    };
  if (!name) return { code: 400, body: { error: "thread name required" } };
  try {
    const thread = await rest.createThread(
      st.triggerChannelId,
      st.triggerMessageId,
      name,
    ); // type 11 + member-add, exactly like the auto-thread path
    const threadId = String(thread.id);
    rememberConvName(`thread:${threadId}`, thread?.name ?? name); // the agent-chosen title rides the re-keyed conversation — no fetch needed
    await ensureThreadMember(
      threadId,
      st.triggerAuthorId ?? null,
      st.triggerChannelId,
    );
    remapConversationToThread(convKey, threadId, st);
    log(
      `conv ${convKey} promoted to thread:${threadId} by the agent (discord_thread tool)`,
    );
    return {
      code: 200,
      body: { ok: true, threadId, convKey: `thread:${threadId}` },
    };
  } catch (e) {
    log(`thread promotion failed (${convKey}): ${e?.message ?? e}`);
    return {
      code: 500,
      body: { error: `thread creation failed: ${e?.message ?? e}` },
    };
  }
}

// ---------- TUI relay (discord-visibility lap): external user input lands on the surface ----------
// A conversation session is shared: the operator can talk to it through the
// TUI / any daemon client while the conversation is also live on Discord. The
// REPLY to such a turn already lands on the surface (the beacon's message_end
// finalize path) — but the question itself was invisible there: the surface
// saw an answer to an unseen question. The beacon relays exactly that input
// (the pi `input` event minus everything that arrived via the bot's own /send
// — that text IS a Discord message already) to /internal/relay, and this
// handler posts it on the conversation's surface with a provenance tag.
// The agent transcript keeps exactly ONE copy (the session's own write):
// this path never dispatches — the relay handler holds no dispatch call, and
// the bot's own surface posts are dropped by the admission ladder's self gate
// (gate 2) even if the gateway echoed them back.
async function onRelayExternal(body) {
  const sessionId = String(body?.sessionId ?? "");
  const text = typeof body?.text === "string" ? body.text : "";
  if (!sessionId || !text.trim())
    return {
      code: 400,
      body: { error: "bad relay payload (sessionId + non-empty text)" },
    };
  const cfg = loadConfig();
  if (cfg.relay_external === false)
    return {
      code: 200,
      body: { ok: true, relayed: false, reason: "relay_external off" },
    }; // belt-and-braces: the beacon gates first; a stale beacon still posts nothing
  const convKey = sessions.get(sessionId)?.convKey ?? null;
  const route = convKey ? routing.get(convKey) : null;
  if (!convKey || !route || route.sessionId !== sessionId)
    return {
      code: 409,
      body: {
        error:
          "no routed conversation for this session (display-only or untagged) — nothing to relay",
      },
    }; // the /internal/thread 409 shape
  const channelId =
    ledger.get(convKey)?.channel_id ?? streamers.get(convKey)?.channelId ?? ""; // the durable ledger row first, the live streamer anchor as fallback — a conversation with no known surface yet has nothing to relay onto
  if (!channelId)
    return {
      code: 409,
      body: {
        error:
          "no surface channel known for this conversation yet — nothing to relay onto",
      },
    };
  const label = ["interactive", "rpc"].includes(String(body?.source ?? ""))
    ? "tui"
    : String(body?.source ?? "") || "external"; // the pi input sources: interactive/rpc are both the operator's non-Discord clients; anything else names itself
  const delivered = await postRelayChunks(
    channelId,
    `*(via ${label}):*\n${text}`,
    cfg,
  );
  if (delivered > 0)
    log(
      `relay: conv ${convKey}: ${delivered} message(s) landed on the surface (via ${label})`,
    );
  // never the text — the audit discipline
  else
    log(
      `WARN: relay: conv ${convKey}: nothing landed (via ${label}) — the text stays in the agent session`,
    );
  return { code: 200, body: { ok: true, relayed: delivered > 0 } };
}
// the finalize split discipline, minus the ack/preview machinery: chunked,
// flood-capped, paced, reference-free (2026-09-24 operator rule). Display-only — never dispatches.
async function postRelayChunks(channelId, content, cfg) {
  let chunks = splitChunks(String(content), SPLIT_THRESHOLD);
  if (chunks.length > cfg.max_splits) {
    // the finalize flood cap — same discipline, same notice
    chunks = chunks.slice(0, cfg.max_splits);
    const notice =
      "\n\n*(output truncated — full text is in the agent session)*";
    chunks[chunks.length - 1] =
      chunks[chunks.length - 1].slice(0, SPLIT_THRESHOLD - notice.length) +
      notice;
  }
  let prevId = null,
    delivered = 0;
  try {
    for (const chunk of chunks) {
      if (prevId != null) await sleep(sendPaceMs()); // split pacing: the same 5/5s channel-bucket discipline finalize rides
      const m = await rest.sendMessage(channelId, chunk, {}); // every chunk PLAIN (2026-09-24 operator rule: the last message in the conversation is the agent's own — a relay block references nothing; adjacency associates the splits)
      if (!m) break; // a failed chunk stops the chain — no silent gaps
      prevId = m.id;
      delivered++;
    }
  } catch (e) {
    log(
      `relay: delivery failed after ${delivered} message(s): ${
        e?.message ?? e
      }`,
    );
  }
  return delivered;
}

// ---------- control server (the beacon contract; D1/D8/D9) ----------
function sendJson(res, code, payload) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}
async function readJson(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const bytes = Buffer.concat(chunks).length;
  try {
    return { json: JSON.parse(Buffer.concat(chunks).toString()), bytes };
  } catch {
    return { json: undefined, bytes };
  }
}

// ---------- inbound control audit (send-route-audit 2026-09-24) ----------
// One line per /internal/* request: who called (source socket/port), which
// session, which credential class authenticated (never the value), the
// verdict, the outcome, payload bytes. Never the token value, never the
// message text — bytes + timestamp correlate with the receiving transcript.
// 401s log ALWAYS (a wrong-token probe on the loopback port is the
// highest-signal event the pre-audit build swallowed — the 2026-09-23
// invisible /send mystery was invisible for exactly this reason).
// Heartbeat registers SAMPLE (first-seen per session, then at most one line
// per ~10 min) — the register spam-guard's lesson: N live sessions
// re-register every 15s; per-request lines would bury the log.
const REG_AUDIT_SAMPLE_MS = 10 * 60 * 1000;
const regAuditAt = new Map(); // sessionId -> ms of the last emitted register audit line (pruned with the sessions row)
const srcOf = (req) =>
  `${req.socket.remoteAddress ?? "?"}:${req.socket.remotePort ?? 0}`;
const shortId = (sid) => (sid ? String(sid).slice(0, 8) + "…" : "none");
function auditControl(route, req, sid, tokenSource, auth, outcome, bytes) {
  log(
    `audit route=${route} src=${srcOf(req)} sessionId=${shortId(
      sid,
    )} tokenSource=${tokenSource} auth=${auth} outcome=${outcome} bytes=${bytes}`,
  );
}

async function onRegister(body) {
  const sessionId = String(body?.sessionId ?? "");
  if (!sessionId || !body?.controlPort)
    return { code: 400, body: { error: "bad register payload" } };
  const pid = Number(body.pid ?? 0) || null;
  const row = {
    sessionId,
    controlPort: Number(body.controlPort) || 0,
    pid,
    sessionToken: body.sessionToken ? String(body.sessionToken) : null, // the per-session /send+/stop credential (2026-09-24 hardening): null = a pre-hardening beacon — beaconSend falls back to the machine token for it
    convKey: body.convKey ? String(body.convKey) : null,
    name: body.name ? String(body.name) : null,
    cwd: body.cwd ? String(body.cwd) : null,
    status: body.status ? String(body.status) : "unknown",
    lastSeen: Date.now(),
    lastBusyAt: sessions.get(sessionId)?.lastBusyAt ?? null, // presence v1 (§8.2): busy flips stamp it — carry over re-register, the row object is replaced every heartbeat
  };
  const firstRegister = !sessions.has(sessionId); // beacons re-register on every ~15s heartbeat — only the first logs (spam guard, review finding 4)
  const prevRouted = sessions.get(sessionId)?.routed ?? null; // carried across heartbeats like lastBusyAt — a route FLIP (routed -> display-only) is the recovery-loss moment and must log even mid-session
  row.routed = false; // set below once the claim verdict is known
  sessions.set(sessionId, row); // every session is recorded — /status display
  for (const [k, s] of sessions)
    if (Date.now() - s.lastSeen > 90000) {
      sessions.delete(k);
      regAuditAt.delete(k);
    } // prune rows past 2 missed heartbeats (the register-audit sample stamps ride along — no unbounded map)
  presence.refreshFromSessions(sessions); // presence v1: heartbeat name/status changes + row expiry, 15s worst case (§8.1)
  // scope guard: routing only for the session this conversation's spawn CLAIMED.
  // prime-agent delegates to the operator's daemon, so the beacon registers the
  // DAEMON-TREE worker pid — never the wrapper pid we spawned (production
  // 2026-09-24: our own conversation registered "tagged pid … not spawned
  // here", waited for a register that already happened, and timed out).
  // The webui-proven causal claim replaces pid matching: a new spawn adopts
  // the first register with a NEW session file (absent from the pre-spawn
  // snapshot) on the spawn's cwd, created after the spawn; a resume spawn
  // links by its preset sessionId. DISCORD_CONV_KEY tags the conversation —
  // a subagent that inherits the tag registers a DIFFERENT sessionId (after
  // the claim) and stays display-only; an untagged session never enters here.
  let routed = false;
  let reason = null; // the claim verdict for a REJECTED register — production 2026-09-27 stuck-👀: a silently display-only register (no route -> no events -> stranded 👀) left nothing to diagnose; every reject names its failing leg now
  const claim = row.convKey ? claims.get(row.convKey) : null;
  // 2026-09-26 double-reply guard: a self-heal respawn claims by its preset
  // sessionId, and the ORIGINAL (merely wedged) worker's heartbeat registers the
  // SAME sessionId — without the stale-port check it re-claims the route and the
  // register flush re-delivers the parked text (two replies to one follow-up).
  const staleBeacon = !!(
    claim?.stalePort && row.controlPort === claim.stalePort
  );
  const file = typeof body.file === "string" ? body.file : null;
  const createdMs =
    typeof body.created === "number"
      ? body.created
      : Date.parse(String(body.created ?? ""));
  const causalPass = !!(
    claim &&
    file &&
    file.startsWith(SESSIONS_DIR + path.sep) &&
    !claim.known?.has(file) &&
    row.cwd === claim.cwd &&
    Number.isFinite(createdMs) &&
    createdMs >= claim.at
  );
  if (staleBeacon)
    reason = "stale pre-heal beacon port (2026-09-26 double-reply guard)";
  else if (claim && claim.sessionId === sessionId)
    routed = true; // claimed/resumed earlier — heartbeats keep the route
  else if (claim && claim.sessionId && causalPass) {
    // worker-recovery hand-over (probe-proven 2026-09-24): a crashed worker's daemon recovery resumes the conversation as a NEW session id — the claim still holds the DEAD id and this register would go display-only, stranding the turn on 👀 with no route (the production 01a0d0fb incident). A NEW session file on the claim's cwd, created after the spawn, IS the conversation's continuation: hand the claim over. Same-tag subagents stay excluded (their session files live outside SESSIONS_DIR and fail causalPass); the wedged pre-heal beacon is already stopped by the stale-port guard above.
    const deadId = claim.sessionId;
    claim.sessionId = sessionId;
    routed = true;
    log(
      `conv ${row.convKey}: claim handed over ${String(deadId).slice(
        0,
        8,
      )}… -> ${sessionId.slice(
        0,
        8,
      )}… (new session file on the claim's cwd — a worker-recovery branch or branched resume)`,
    );
  } else if (claim && claim.sessionId)
    reason = `the claim holds session ${String(claim.sessionId).slice(
      0,
      8,
    )}… (a same-tag subagent, or the claimed session's successor failed the causal file check)`;
  else if (claim && causalPass) {
    // new spawn, unclaimed: the causal claim
    claim.sessionId = sessionId;
    routed = true;
  } else if (claim) {
    // the causal claim failed — name the failing leg on reject
    if (!file) reason = "the beacon sent no session file (degraded getter)";
    else if (!file.startsWith(SESSIONS_DIR + path.sep))
      reason = "the session file lives outside SESSIONS_DIR";
    else if (claim.known?.has(file))
      reason = "the session file predates the spawn (pre-spawn snapshot hit)";
    else if (row.cwd !== claim.cwd)
      reason = `cwd mismatch (registered ${row.cwd}, claim ${claim.cwd})`;
    else if (!Number.isFinite(createdMs))
      reason = "the register carried no created timestamp";
    else reason = "the session was created before the spawn";
  } else if (row.convKey) {
    // no claim at all: failPending (register timeout / failed spawn) or /reset dropped it. A RECOVERED session re-registering within the grace still claims (production 2026-09-27: the worker died on the name_session unhandled rejection, the daemon recovered it, but the claim was gone — the recovered session went display-only and the turn stuck on 👀 with no route and no events). The grace matches the ledger's known session id and cwd; the route (if any) must point at this session or nowhere — a route held by a DIFFERENT session is never stolen.
    const l = ledger.get(row.convKey);
    const lastActiveMs = l ? Date.parse(l.lastActive ?? "") : NaN;
    const route = routing.get(row.convKey);
    if (
      l &&
      l.sessionId === sessionId &&
      row.cwd === l.cwd &&
      Number.isFinite(lastActiveMs) &&
      Date.now() - lastActiveMs <= 2 * REGISTER_TIMEOUT_MS &&
      (!route || route.sessionId === sessionId)
    ) {
      claims.set(row.convKey, {
        at: Date.now(),
        cwd: row.cwd,
        known: null,
        sessionId,
        spawnPid: route?.spawnPid ?? null,
        stalePort: null,
      }); // resume-shaped claim: heartbeats keep the route by sessionId from here
      routed = true;
      log(
        `conv ${row.convKey}: session ${sessionId.slice(
          0,
          8,
        )}… re-claimed after claim loss (ledger-matched recovery register within ${
          2 * REGISTER_TIMEOUT_MS
        }ms of last dispatch)`,
      );
    } else if (
      l &&
      l.sessionId === sessionId &&
      route &&
      route.sessionId !== sessionId
    )
      reason = "no claim; the route is held by another session";
    else if (l && l.sessionId === sessionId && row.cwd !== l.cwd)
      reason = `no claim; cwd mismatch (registered ${row.cwd}, ledger ${l.cwd})`;
    else if (l && l.sessionId === sessionId)
      reason = `no claim; outside the recovery grace (${
        Number.isFinite(lastActiveMs)
          ? Math.round(Date.now() - lastActiveMs)
          : "?"
      }ms since last dispatch, grace ${2 * REGISTER_TIMEOUT_MS}ms)`;
    else
      reason =
        "no claim for this conversation (register timeout, failed spawn, or /reset) and the ledger names another session";
  }
  row.routed = routed;
  if (row.convKey) {
    if (reason) verdicts.set(row.convKey, reason);
    else if (routed) verdicts.delete(row.convKey);
  } // /status "down" rows surface the LATEST claim verdict (display-only state; the log lines above stay the source of truth)
  if (routed) {
    const prevRoute = routing.get(row.convKey); // captured before the overwrite — a same-id register from a DIFFERENT port/pid is the worker-recovery shape (probe-proven) and also the multi-worker anomaly signature; log it once per flip
    routing.set(row.convKey, {
      sessionId,
      controlPort: row.controlPort,
      pid,
      sessionToken: row.sessionToken,
      spawnPid: claim?.spawnPid ?? claims.get(row.convKey)?.spawnPid ?? null,
    }); // re-fetch: the recovery re-claim REPLACED the claim object — its spawnPid (carried from the old route) must still reach the route (the /reset SIGTERM handle); sessionToken rides the route so beaconSend/beaconStop present it
    const l = ledger.get(row.convKey);
    if (l) {
      l.sessionId = sessionId;
      l.lastActive = nowIso();
      if (row.name) l.name = row.name;
      saveLedger();
    } // the REGISTERED name rides the ledger row — /status keeps the last known name after the session dies
    maybeRenameThread(row.convKey, row.name); // hermes-catalog #10: the routed thread mirrors the registered session name — fire-and-forget, a rename can never block or fail the register
    const pending = pendingByConv.get(row.convKey);
    if (pending) {
      // queued dispatches ride the register — EXACTLY-ONCE (production 2026-09-27 triple-delivery): the pending is consumed BEFORE any send, so no later register (a worker recovery, a re-spawn) can ever flush the same text again
      pendingByConv.delete(row.convKey);
      const route = routing.get(row.convKey);
      for (const it of pending.texts) {
        if (!route) {
          await failPending(row.convKey, "delivery after register failed");
          break;
        }
        const sent = await beaconSend(route, it.text);
        if (!sent.ok && sent.unreachable) {
          await failPending(row.convKey, "delivery after register failed");
          break;
        } // port refused/reset: nothing reached the beacon — fail visibly
        // !ok && !unreachable: the /send TIMED OUT on a reachable beacon — the turn is already queued there (the 2026-09-26 double-reply lesson): treated as delivered; never re-dispatched, never falsely failed
      }
    }
    if (firstRegister)
      log(
        `conv ${row.convKey}: session ${sessionId.slice(
          0,
          8,
        )}… registered (pid ${pid})`,
      );
    else if (
      prevRoute &&
      (prevRoute.controlPort !== row.controlPort || prevRoute.pid !== pid)
    )
      log(
        `conv ${row.convKey}: route re-bound ${prevRoute.controlPort}/pid ${
          prevRoute.pid
        } -> ${row.controlPort}/pid ${pid} for session ${sessionId.slice(
          0,
          8,
        )}… (a worker recovery or re-register — three of these in a minute means multiple live bots, check the boot lines)`,
      ); // the 2026-09-27 triple-delivery anomaly made visible: same-id registers from different workers
  } else {
    // claim-reject diagnostics (production 2026-09-27): the first register AND every
    // route flip log the verdict — a display-only register was silent before, and the
    // silent display-only state is exactly how stuck 👀 happen (witnessed 01a0d0fb:
    // the register rejected with no reason and no route, so no events ever arrived)
    if (firstRegister)
      log(
        `session ${sessionId.slice(0, 8)}… registered ${
          row.convKey
            ? `display-only: ${reason ?? "unclaimed"}`
            : "(untagged — display only)"
        }`,
      );
    else if (row.convKey && prevRouted === true)
      log(
        `session ${sessionId.slice(
          0,
          8,
        )}… LOST its route (was claimed, now display-only): ${
          reason ?? "unclaimed"
        } — its events will not drive conv ${row.convKey}`,
      );
  }
  return {
    code: 200,
    body: { ok: true, routed, ...(reason ? { reason } : {}) },
  };
}

const control = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  } catch {
    return sendJson(res, 400, { error: "bad request" });
  }
  try {
    if (req.method === "GET" && url.pathname === "/healthz") {
      return sendJson(res, 200, {
        ok: true,
        gateway: gatewayState,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        conversations: ledger.size,
        sessions: sessions.size,
      });
    }
    if (url.pathname.startsWith("/internal/")) {
      if (!authed(req)) {
        auditControl(
          url.pathname,
          req,
          null,
          "none",
          "fail",
          "401",
          Number(req.headers["content-length"] ?? 0) || 0,
        );
        return sendJson(res, 401, { error: "unauthorized" });
      } // fail-closed, constant-time compare (D9); 401s always audit
      const { json: body, bytes } =
        req.method === "POST"
          ? await readJson(req)
          : { json: undefined, bytes: 0 };
      if (url.pathname === "/internal/register" && req.method === "POST") {
        const sid = String(body?.sessionId ?? "");
        const first = !!sid && !sessions.has(sid); // first-seen per session — the sample stamps live on regAuditAt
        const r = await onRegister(body);
        const sample =
          r.code !== 200 ||
          first ||
          Date.now() - (regAuditAt.get(sid) ?? 0) >= REG_AUDIT_SAMPLE_MS; // non-200s always audit (rare); 200s: first + 10-min sampled, heartbeats stay silent
        if (sample) {
          if (sid) regAuditAt.set(sid, Date.now());
          auditControl(
            "/internal/register",
            req,
            sid,
            TOKEN_SOURCE,
            "ok",
            r.code === 200
              ? r.body?.routed
                ? "routed"
                : "display-only"
              : String(r.code),
            bytes,
          );
        }
        return sendJson(res, r.code, r.body);
      }
      if (url.pathname === "/internal/event" && req.method === "POST") {
        const sessionId = String(body?.sessionId ?? "");
        if (!sessionId || typeof body?.event !== "string") {
          auditControl(
            "/internal/event",
            req,
            sessionId,
            TOKEN_SOURCE,
            "ok",
            "400",
            bytes,
          );
          return sendJson(res, 400, { error: "bad event payload" });
        }
        await onBeaconEvent(sessionId, body.event, body.data ?? {});
        auditControl(
          "/internal/event",
          req,
          sessionId,
          TOKEN_SOURCE,
          "ok",
          String(body.event),
          bytes,
        ); // the event name rides outcome — message_update/message_end/busy tell the story without the text
        return sendJson(res, 200, { ok: true });
      }
      if (url.pathname === "/internal/thread" && req.method === "POST") {
        const t = await onThreadPromote(body);
        auditControl(
          "/internal/thread",
          req,
          String(body?.sessionId ?? ""),
          TOKEN_SOURCE,
          "ok",
          String(t.code),
          bytes,
        );
        return sendJson(res, t.code, t.body);
      }
      if (url.pathname === "/internal/relay" && req.method === "POST") {
        const t = await onRelayExternal(body);
        auditControl(
          "/internal/relay",
          req,
          String(body?.sessionId ?? ""),
          TOKEN_SOURCE,
          "ok",
          String(t.code),
          bytes,
        );
        return sendJson(res, t.code, t.body);
      }
      if (url.pathname === "/internal/unregister" && req.method === "POST") {
        const sessionId = String(body?.sessionId ?? "");
        const row = sessions.get(sessionId);
        const convKey = row?.convKey ?? null;
        const r = convKey ? routing.get(convKey) : null;
        if (r && r.sessionId === sessionId) {
          routing.delete(convKey);
          // reviewer finding: unregister used to clear the route silently — a
          // turn in flight on the dead session must fail visibly (⚠️ + notice);
          // the idle case stays silent (nothing to strand, no spam)
          await failTurn(convKey, "session unregistered mid-turn");
        }
        sessions.delete(sessionId);
        regAuditAt.delete(sessionId);
        auditControl(
          "/internal/unregister",
          req,
          sessionId,
          TOKEN_SOURCE,
          "ok",
          "unregistered",
          bytes,
        );
        return sendJson(res, 200, { ok: true });
      }
      auditControl(
        url.pathname,
        req,
        String(body?.sessionId ?? ""),
        TOKEN_SOURCE,
        "ok",
        "404",
        bytes,
      ); // an authed caller probing an unknown internal route — rare, always worth a line
      return sendJson(res, 404, { error: "not found" });
    }
    return sendJson(res, 404, { error: "not found" });
  } catch (e) {
    log(`control request error: ${e?.message ?? e}`);
    return sendJson(res, 500, { error: "internal error" });
  }
});

// ---------- main / shutdown ----------
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log(
    "shutting down: SIGTERM to spawned sessions, closing gateway, flushing ledger",
  );
  for (const c of spawned.values()) {
    try {
      c.kill("SIGTERM");
    } catch {}
  } // hold-until-shutdown lifecycle (webui ceiling; D3)
  closeGateway(1000);
  saveLedger();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function main() {
  const cfg = loadConfig(); // startup snapshot for credentials (gates re-read per message)
  if (!cfg.bot_token) {
    log(
      "no bot_token configured — exiting (fill config.json; any session's beacon respawns the bot once fixed)",
    );
    process.exit(1);
  }
  if (/^\d+$/.test(cfg.bot_token)) {
    log(
      "bot_token is purely numeric — that is the application ID, not the bot token. Paste the token from the Developer Portal's Bot tab (numeric mispaste guard, hermes :6828-6857)",
    );
    process.exit(1);
  }
  if (!cfg.application_id) {
    log(
      "no application_id configured — exiting (slash commands and callbacks need it)",
    );
    process.exit(1);
  }
  log(`token source: ${TOKEN_SOURCE}`); // webui-beacon alignment: same wording as the webui bot/beacon pair
  // the control port is the single-instance lock (D8): bind failure means
  // another bot owns it — exit 0, the existing instance keeps running
  await new Promise((resolve, reject) => {
    control.once("error", (e) => {
      if (e?.code === "EADDRINUSE") {
        log(
          `control port ${PORT} busy — another instance owns the lock; exiting`,
        );
        process.exit(0);
      }
      reject(e);
    });
    control.listen(PORT, "127.0.0.1", () => {
      log(`control port on 127.0.0.1:${PORT}`);
      resolve();
    });
  }).catch((e) => {
    log("control bind error:", e?.message ?? e);
    process.exit(1);
  });
  await connectGateway();
}

// ---------- smoke mode (node server.mjs --smoke) ----------
// Local checks WITHOUT connecting to Discord's live gateway and without
// spawning real prime-agent children. Exercises: config schema, the
// admission ladder, credential presence (booleans only — values never
// printed), the beacon contract over real loopback HTTP (control port +
// index.ts beacon factory with a mock pi), and the streaming discipline
// against a recorded REST layer.
let smokeSpawns = [];
async function smoke() {
  delete process.env.DISCORD_TURN_TIMEOUT_MS; // hermetic: the smoke arms real turn-watchdog timers and drives the window explicitly (section 5c) — an external tiny knob would fire mid-test
  let failed = 0;
  const check = (name, cond, detail) => {
    if (cond) log(`SMOKE PASS: ${name}`);
    else {
      failed++;
      log(`SMOKE FAIL: ${name}${detail ? " — " + detail : ""}`);
    }
  };
  // ackFinal is async AND paced (the swap sleeps ~0.35s between ops) — settle-poll
  // instead of reading reaction arrays the instant an event handler returns
  const until = async (cond, ms = 3000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (cond()) return true;
      await sleep(25);
    }
    return cond();
  };

  // ---- 1. config schema ----
  const live = readConfigFile();
  const SCHEMA = {
    bot_token: "string",
    application_id: "string",
    public_key: "string",
    client_secret: "string",
    allowed_guild_ids: "array",
    allowed_users: "array",
    allow_all_users: "boolean",
    allowed_channels: "array",
    ignored_channels: "array",
    free_response_channels: "array",
    allow_dm: "boolean",
    require_mention: "boolean",
    auto_thread: "boolean",
    thread_policy: "string",
    thread_rename: "boolean",
    home_channel: "string",
    allow_bots: "string",
    reply_to_mode: "string",
    max_splits: "number",
    default_cwd: "string",
    text_batch_ms: "number",
    typing_indicator: "boolean",
    reactions: "boolean",
    guidelines: "boolean",
    guidelines_file: "string", // beacon prompt-injection knobs (read by index.ts)
    relay_external: "boolean", // TUI relay knob (the beacon relays non-/send user input onto the conversation's surface)
    webui_base_url: "string", // webui conversation deeplinks base ("" = feature off)
    first_response_link: "boolean", // delivery-UX round 2: the one-shot webui line on a conversation's first delivered reply
    preview_min_edit_ms: "number", // delivery-UX round 2: minimum interval between streaming-preview edits
    recovery: "boolean", // durable recovery ledgers (hermes-catalog #2 + #7)
    attachments: "boolean", // inbound attachments (hermes-catalog #3 slice 1)
    attachment_max_bytes: "number", // per-attachment inline cap (default 102400)
    ext_token: "string", // internal: beacon<->bot token in config.json (file/env normally used)
    presence: "object", // presence v1 (presence-plan §6): nested block — sub-keys validated in loadConfig
  };
  let schemaOk = true,
    schemaDetail = "";
  for (const [k, v] of Object.entries(live)) {
    const want = SCHEMA[k];
    if (!want) {
      schemaOk = false;
      schemaDetail = `unknown key: ${k}`;
      continue;
    }
    const got = Array.isArray(v) ? "array" : typeof v;
    if (got !== want && !(want === "number" && got === "number")) {
      schemaOk = false;
      schemaDetail = `${k} is ${got}, expected ${want}`;
    }
  }
  check("config.json matches schema", schemaOk, schemaDetail);
  const merged = loadConfig();
  check(
    "config defaults resolve",
    merged.max_splits === 8 &&
      merged.reply_to_mode === "first" &&
      merged.require_mention === true &&
      merged.auto_thread === true &&
      merged.text_batch_ms === 600 &&
      merged.allow_bots === "none" &&
      merged.relay_external === true,
    `max_splits=${merged.max_splits} reply_to_mode=${merged.reply_to_mode} require_mention=${merged.require_mention} auto_thread=${merged.auto_thread} text_batch_ms=${merged.text_batch_ms} allow_bots=${merged.allow_bots} relay_external=${merged.relay_external}`,
  );
  check(
    "config: thread_policy defaults to agent (the agent decides; channel conversations, no auto-thread)",
    DEFAULTS.thread_policy === "agent" &&
      (process.env.DISCORD_THREAD_POLICY
        ? merged.thread_policy === process.env.DISCORD_THREAD_POLICY
        : merged.thread_policy === "agent"),
    `thread_policy=${merged.thread_policy}`,
  );
  // thread_policy validation mirrors reply_to_mode: anything but "agent"|"always"
  // fails loud at config load, never silently keeps-or-drops threading
  const tpEnvPrev = process.env.DISCORD_THREAD_POLICY; // a shell-provided policy must survive the smoke
  process.env.DISCORD_THREAD_POLICY = "bogus";
  let tpErr = "";
  try {
    loadConfig();
  } catch (e) {
    tpErr = String(e?.message ?? e);
  }
  process.env.DISCORD_THREAD_POLICY = "always";
  let tpAlwaysErr = "";
  try {
    loadConfig();
  } catch (e) {
    tpAlwaysErr = String(e?.message ?? e);
  }
  process.env.DISCORD_THREAD_POLICY = "agent";
  let tpAgentErr = "";
  try {
    loadConfig();
  } catch (e) {
    tpAgentErr = String(e?.message ?? e);
  }
  if (tpEnvPrev === undefined) delete process.env.DISCORD_THREAD_POLICY;
  else process.env.DISCORD_THREAD_POLICY = tpEnvPrev; // restore
  check(
    'config: thread_policy "bogus" errors at load (agent|always only)',
    tpErr.includes('must be "agent" or "always"') === true,
    tpErr,
  );
  check(
    'config: thread_policy "always" (legacy auto-thread) and "agent" load clean',
    tpAlwaysErr === "" && tpAgentErr === "",
    tpAlwaysErr || tpAgentErr,
  );
  check(
    "config: reaction ack defaults on and resolves as a boolean",
    DEFAULTS.reactions === true && typeof merged.reactions === "boolean",
    `reactions=${merged.reactions}`,
  );
  check(
    "config: recovery defaults on (durable missed-message + delivery ledgers)",
    DEFAULTS.recovery === true && typeof merged.recovery === "boolean",
    `recovery=${merged.recovery}`,
  );
  process.env.DISCORD_RECOVERY = "false";
  check(
    "config: DISCORD_RECOVERY=false disables the ledgers (no writes, no boot replay)",
    loadConfig().recovery === false,
  );
  delete process.env.DISCORD_RECOVERY;
  // inbound attachments (hermes-catalog #3 slice 1): text-doc injection knobs
  check(
    "config: attachments default on (text-compatible attachments inline into the dispatch text)",
    DEFAULTS.attachments === true && typeof merged.attachments === "boolean",
    `attachments=${merged.attachments}`,
  );
  check(
    "config: attachment_max_bytes defaults to 102400 (100KB inline cap)",
    DEFAULTS.attachment_max_bytes === 102400 &&
      merged.attachment_max_bytes === 102400,
    `attachment_max_bytes=${merged.attachment_max_bytes}`,
  );
  process.env.DISCORD_ATTACHMENTS = "false";
  check(
    "config: DISCORD_ATTACHMENTS=false disables the inline path (zero fetches)",
    loadConfig().attachments === false,
  );
  delete process.env.DISCORD_ATTACHMENTS;
  process.env.DISCORD_ATTACHMENT_MAX_BYTES = "5000";
  check(
    "config: DISCORD_ATTACHMENT_MAX_BYTES env overrides the cap",
    loadConfig().attachment_max_bytes === 5000,
  );
  process.env.DISCORD_ATTACHMENT_MAX_BYTES = "junk";
  check(
    "config: junk attachment_max_bytes falls back to the 102400 default (fail loud never applies to a tunable cap)",
    loadConfig().attachment_max_bytes === 102400,
  );
  delete process.env.DISCORD_ATTACHMENT_MAX_BYTES;
  // thread renames (hermes-catalog #10): the knob + its env override
  check(
    "config: thread rename defaults on (the thread sidebar mirrors session names)",
    DEFAULTS.thread_rename === true &&
      typeof merged.thread_rename === "boolean",
    `thread_rename=${merged.thread_rename}`,
  );
  const trEnvPrev = process.env.DISCORD_THREAD_RENAME; // a shell-provided knob must survive the smoke (the thread_policy precedent)
  process.env.DISCORD_THREAD_RENAME = "false";
  check(
    "config: DISCORD_THREAD_RENAME=false disables thread renames (zero PATCHes)",
    loadConfig().thread_rename === false,
  );
  if (trEnvPrev === undefined) delete process.env.DISCORD_THREAD_RENAME;
  else process.env.DISCORD_THREAD_RENAME = trEnvPrev;
  const legacyFile = { ...live };
  delete legacyFile.require_mention;
  legacyFile.mention_only = true;
  const legacyCfg = { ...DEFAULTS, ...legacyFile };
  const legacyMerged = (() => {
    const m = { ...legacyCfg };
    for (const [o, n] of Object.entries(LEGACY_ALIASES))
      if (m[o] !== undefined && m[n] === undefined) m[n] = m[o];
    return m;
  })();
  check(
    "legacy key aliases carry over",
    legacyMerged.require_mention === true,
    `require_mention=${legacyMerged.require_mention}`,
  );
  // reply_to_mode validation (review finding 2): "all" is not implemented — it must
  // fail loud at config load, never silently behave as "first"; off/first load clean
  process.env.DISCORD_REPLY_TO_MODE = "all";
  let allErr = "";
  try {
    loadConfig();
  } catch (e) {
    allErr = String(e?.message ?? e);
  }
  delete process.env.DISCORD_REPLY_TO_MODE;
  check(
    'config: reply_to_mode "all" errors at load (not implemented)',
    allErr.includes("not implemented") === true,
    allErr,
  );
  process.env.DISCORD_REPLY_TO_MODE = "off";
  let offErr = "";
  try {
    loadConfig();
  } catch (e) {
    offErr = String(e?.message ?? e);
  }
  delete process.env.DISCORD_REPLY_TO_MODE;
  process.env.DISCORD_REPLY_TO_MODE = "first";
  let firstErr = "";
  try {
    loadConfig();
  } catch (e) {
    firstErr = String(e?.message ?? e);
  }
  delete process.env.DISCORD_REPLY_TO_MODE;
  check(
    'config: reply_to_mode "off" and "first" load clean',
    offErr === "" && firstErr === "",
    offErr || firstErr,
  );
  // delivery-UX round 2 knobs (2026-09-24 operator feedback): the first-response
  // deeplink gate + the preview-edit throttle interval
  check(
    "config: first_response_link defaults true, preview_min_edit_ms defaults 2500 (delivery-UX round 2)",
    DEFAULTS.first_response_link === true &&
      merged.first_response_link === true &&
      DEFAULTS.preview_min_edit_ms === 2500 &&
      merged.preview_min_edit_ms === 2500,
    `first_response_link=${merged.first_response_link} preview_min_edit_ms=${merged.preview_min_edit_ms}`,
  );
  process.env.DISCORD_PREVIEW_MIN_EDIT_MS = "100";
  check(
    "config: DISCORD_PREVIEW_MIN_EDIT_MS env override loads (the smoke drives the throttle fast)",
    loadConfig().preview_min_edit_ms === 100,
  );
  process.env.DISCORD_PREVIEW_MIN_EDIT_MS = "junk";
  check(
    "config: junk preview_min_edit_ms falls back to 2500 (never a silently-broken throttle)",
    loadConfig().preview_min_edit_ms === 2500,
  );
  delete process.env.DISCORD_PREVIEW_MIN_EDIT_MS;
  process.env.DISCORD_FIRST_RESPONSE_LINK = "false";
  check(
    "config: DISCORD_FIRST_RESPONSE_LINK=false disables the first-response deeplink",
    loadConfig().first_response_link === false,
  );
  delete process.env.DISCORD_FIRST_RESPONSE_LINK;
  // webui deeplinks (discord-visibility feedback lap): the knob, the helper, and /status
  const wuiEnvPrev = process.env.DISCORD_WEBUI_BASE_URL; // env wins over config.json — the checks below set their own values and restore
  process.env.DISCORD_WEBUI_BASE_URL = "http://127.0.0.1:8788/"; // trailing slash must normalize away
  const wuiCfg = loadConfig();
  check(
    "config: webui_base_url env override loads with the trailing slash normalized",
    wuiCfg.webui_base_url === "http://127.0.0.1:8788",
    `webui_base_url=${JSON.stringify(wuiCfg.webui_base_url)}`,
  );
  check(
    "webui: link generation builds <base>#/s/<sessionId>",
    webuiLink("smoke-sess-1", wuiCfg) ===
      "http://127.0.0.1:8788#/s/smoke-sess-1",
    webuiLink("smoke-sess-1", wuiCfg),
  );
  process.env.DISCORD_WEBUI_BASE_URL = "ftp://bad";
  let wuiErr = "";
  try {
    loadConfig();
  } catch (e) {
    wuiErr = String(e?.message ?? e);
  }
  check(
    "webui: a non-http(s) webui_base_url fails config load loud",
    wuiErr.includes("webui_base_url must be an http(s):// URL"),
    wuiErr,
  );
  if (wuiEnvPrev === undefined) delete process.env.DISCORD_WEBUI_BASE_URL;
  else process.env.DISCORD_WEBUI_BASE_URL = wuiEnvPrev;
  check(
    "webui: the link is disabled when webui_base_url is empty (DEFAULTS) or unset",
    DEFAULTS.webui_base_url === "" &&
      webuiLink("smoke-sess-1", { webui_base_url: "" }) === "" &&
      webuiLink("smoke-sess-1", {}) === "",
    `DEFAULTS.webui_base_url=${JSON.stringify(DEFAULTS.webui_base_url)}`,
  );
  {
    ledger.set("channel:wui", {
      sessionId: "sess-wui-1",
      cwd: "/tmp",
      channel_id: "cw",
      created: nowIso(),
      lastActive: nowIso(),
    });
    convNames.set("channel:wui", "ask-homelab"); // a primed surface name (fetched, or createThread-remembered, in production)
    const onText = statusText({ webui_base_url: "http://127.0.0.1:8788" });
    const offText = statusText({ webui_base_url: "" });
    check(
      "webui: /status renders the v2 table — fenced, column headers, SURFACE name in the conversation column, ONE numbered deeplink line outside the code block",
      onText.includes("```") &&
        onText
          .split("\n")
          .some((l) =>
            l
              .replace(/\s/g, "")
              .startsWith("#|conversation|state|session|up|last"),
          ) &&
        onText.includes("| ask-homelab") &&
        onText.includes("](http://127.0.0.1:8788#/s/sess-wui-1)") &&
        !onText.includes("open:"),
      onText,
    );
    check(
      "webui: /status carries no deeplink line when webui_base_url is empty (the table still renders)",
      offText.includes("ask-homelab") &&
        !offText.includes("#/s/") &&
        !offText.includes("]("),
      offText,
    );
    ledger.delete("channel:wui");
    convNames.delete("channel:wui");
  }
  let example = null;
  try {
    example = JSON.parse(
      fs.readFileSync(path.join(HERE, "config.example.json"), "utf-8"),
    );
  } catch {}
  const exampleKeys = example ? Object.keys(example).sort().join(",") : "";
  const defaultKeys = Object.keys(DEFAULTS).concat("presence").sort().join(","); // presence is a nested block — deliberately not a flat DEFAULTS key
  check(
    "config.example.json matches the schema key set",
    exampleKeys === defaultKeys,
    `example has [${exampleKeys}]`,
  );
  check(
    "config.example.json is token-free",
    example
      ? !example.bot_token &&
          !example.application_id &&
          !example.public_key &&
          !example.client_secret
      : false,
  );

  // ---- 2. credential presence (booleans only; values are never printed) ----
  const viaEnv = !!envStr("DISCORD_BOT_TOKEN");
  const creds = {
    fromConfig: !!merged.bot_token,
    fromEnv: viaEnv,
    applicationId: !!merged.application_id,
    publicKey: !!merged.public_key,
    clientSecret: !!merged.client_secret,
    allowDm: merged.allow_dm,
  };
  log(
    `credential presence (booleans only): config.bot_token=${creds.fromConfig} env.bot_token=${creds.fromEnv} application_id=${creds.applicationId} public_key=${creds.publicKey}(reserved) client_secret=${creds.clientSecret}(reserved) allow_dm=${creds.allowDm}`,
  );
  check("bot_token present (config or env)", creds.fromConfig || creds.fromEnv);
  check(
    "bot_token is not the numeric application id (mispaste guard)",
    !(merged.bot_token && /^\d+$/.test(merged.bot_token)),
  );
  check("application_id present", creds.applicationId);

  // ---- 3. admission ladder (synthetic config + messages; recorded REST) ----
  botUserId = "555000111222333444"; // realistic snowflake — mention-strip regexes expect numeric ids
  channels.set("c1", { id: "c1", type: 0, parent_id: null });
  channels.set("t1", { id: "t1", type: 11, parent_id: "c1" });
  channels.set("dmch", { id: "dmch", type: 1, parent_id: null });
  const sent = [],
    edits = [],
    typings = [],
    threads = [],
    callbacks = [],
    reactions = [],
    memberAdds = [],
    chanPatches = [];
  const realRequest = rest.request; // the production request (bucket cooldowns live inside it) — the pause test swaps it back in
  let scripted = []; // 429/failure simulation: FIFO of {match?(method,p,body), error} — consumed on the first matching call AFTER recording, so POST counts stay honest
  // hermetic: the base request becomes a fail-loud loopback backend — modeled
  // paths are recorded WITH the payload the real sendMessage/editMessage/
  // interactionCallback builders produced (so allowed_mentions assertions hit
  // the true transport shape); un-modeled paths throw, so nothing can ever
  // reach discord.com
  const stubbedRequest = async (method, p, body) => {
    let m;
    if (method === "POST" && (m = p.match(/^\/channels\/([^/]+)\/messages$/))) {
      sent.push({
        channelId: m[1],
        content: body?.content,
        opts: { replyTo: body?.message_reference?.message_id },
        body,
        at: Date.now(),
      });
    } else if (
      method === "PATCH" &&
      (m = p.match(/^\/channels\/([^/]+)\/messages\/([^/]+)$/))
    ) {
      edits.push({
        channelId: m[1],
        messageId: m[2],
        content: body?.content,
        body,
      });
    } else if (method === "PATCH" && (m = p.match(/^\/channels\/([^/]+)$/))) {
      chanPatches.push({
        threadId: m[1],
        name: body?.name,
        body,
        at: Date.now(),
      });
    } // thread rename (hermes-catalog #10) — record, then fall through so scripted failures consume like every other mode
    else if (
      (method === "PUT" || method === "DELETE") &&
      (m = p.match(
        /^\/channels\/([^/]+)\/messages\/([^/]+)\/reactions\/([^/]+)\/@me$/,
      ))
    ) {
      reactions.push({
        op: method,
        channelId: m[1],
        messageId: m[2],
        emoji: decodeURIComponent(m[3]),
        path: p,
        at: Date.now(),
      });
    } // add/remove own reaction — record, then fall through so scripted failures consume like every other mode (`at` proves the ack swap's pacing)
    else if (
      method === "POST" &&
      (m = p.match(/^\/channels\/([^/]+)\/typing$/))
    ) {
      typings.push({ channelId: m[1] });
      return null;
    } else if (
      method === "PUT" &&
      (m = p.match(/^\/channels\/([^/]+)\/thread-members\/([^/]+)$/))
    ) {
      memberAdds.push({ threadId: m[1], userId: m[2], at: Date.now() });
    } // add thread member — record, then fall through so scripted failures consume like every other mode (visibility is the feature)
    else if (
      method === "POST" &&
      (m = p.match(/^\/channels\/([^/]+)\/threads$/))
    ) {
      threads.push({
        channelId: m[1],
        messageId: body?.message_id,
        name: body?.name,
        type: body?.type,
      });
      return { id: `t-${body?.message_id}`, type: body?.type };
    } // the payload's requested type is recorded — production returns the ACTUAL type in this field
    else if (
      method === "POST" &&
      (m = p.match(/^\/interactions\/([^/]+)\/[^/]+\/callback$/))
    ) {
      callbacks.push({ id: m[1], content: body?.data?.content, body });
      return {};
    } else throw new Error(`smoke: unexpected live REST call ${method} ${p}`);
    const at = scripted.findIndex((s) => !s.match || s.match(method, p, body));
    if (at >= 0) {
      const s = scripted.splice(at, 1)[0];
      if (s.error) throw s.error;
    }
    return p.includes("/messages/") ? {} : { id: `msg-${sent.length}` };
  };
  rest.request = stubbedRequest;
  rest.getChannel = async (id) => {
    const c = channels.get(String(id));
    return c
      ? {
          id: c.id,
          type: c.type,
          parent_id: c.parent_id,
          name: c.name,
          recipients: c.recipients,
        }
      : { id: String(id), type: 0, parent_id: null }; // name/recipients ride for the surface-name resolver (discord-visibility lap); channelInfo only reads id/type/parent_id
  };
  rest.gatewayBot = async () => {
    throw new Error("smoke: gatewayBot must never be called");
  };

  // ---- 2b. conversation surface names (discord-visibility feedback lap) ----
  // convNameFor is cache-first and NEVER fetches; primeConvName is the
  // fire-and-forget getChannel populating the cache. The spawn-record checks
  // assert exactly what DISCORD_CONV_NAME would carry (spawnForConv's SMOKE
  // branch records it — the real env line is production-only).
  {
    const stubGetChannel = rest.getChannel;
    // (a) channel path: nothing before priming (dispatch never blocks), the fetched name caches
    channels.set("c-named", {
      id: "c-named",
      type: 0,
      parent_id: null,
      name: "ask-homelab",
    });
    check(
      "names: convNameFor is cache-first — an unprimed channel resolves nothing and no fetch is in flight",
      convNameFor("channel:c-named") === null && convNameFetching.size === 0,
      JSON.stringify([...convNames.keys()]),
    );
    primeConvName("channel:c-named");
    check(
      "names: primeConvName fetches through the bucket-aware getChannel and the NEXT lookup resolves the channel's Discord name",
      (await until(() => convNameFor("channel:c-named") === "ask-homelab")) &&
        convNameFetching.size === 0,
      JSON.stringify({
        names: [...convNames.entries()],
        fetching: convNameFetching.size,
      }),
    );
    check(
      "names: a primed key never refetches (a second prime is a no-op)",
      (primeConvName("channel:c-named"), true) &&
        convNameFor("channel:c-named") === "ask-homelab" &&
        convNameFetching.size === 0,
      JSON.stringify(convNames.get("channel:c-named")),
    );
    // (b) thread path: the rename mirror and createThread's chosen name beat the fetch
    threadNameLastSet.set("thread:t-named", "mirror title lap");
    check(
      "names: a thread resolves from the rename-mirror cache first (the freshest title we set)",
      convNameFor("thread:t-named") === "mirror title lap",
      JSON.stringify(threadNameLastSet.get("thread:t-named")),
    );
    check(
      "names: createThread's chosen name is remembered eagerly and sanitized (trim + collapse, no newline)",
      rememberConvName("thread:t-create", "  the   agent-chosen\ntitle  ") ===
        "the agent-chosen title" &&
        convNameFor("thread:t-create") === "the agent-chosen title",
      JSON.stringify(convNames.get("thread:t-create")),
    );
    // (c) dm path: recipients[0] display name; the "dm" fallback until it lands
    channels.set("dmch-2", {
      id: "dmch-2",
      type: 1,
      parent_id: null,
      recipients: [
        { id: "u9", username: "recipient_user", global_name: "Recipient Name" },
      ],
    });
    check(
      "names: an unresolved dm resolves the 'dm' fallback (never the raw key — the spawn env still carries a readable name)",
      convNameFor("dm:u9") === "dm",
      JSON.stringify(convNameFor("dm:u9")),
    );
    primeConvName("dm:u9", "dmch-2"); // dm keys hold the RECIPIENT id — the fetch needs the DM channel id
    check(
      "names: a dm primes from the channel fetch's recipients[0] display name (global_name wins over username)",
      await until(() => convNameFor("dm:u9") === "Recipient Name"),
      JSON.stringify(convNames.get("dm:u9")),
    );
    // (d) fetch failure: nothing caches — the fallback stays, the next spawn retries
    rest.getChannel = async () => {
      throw new RestError(403, "forbidden");
    };
    primeConvName("dm:u-fail", "dmch-x");
    check(
      "names: a failing fetch caches nothing (failure never pins a name) — the fallback stays and the next spawn retries",
      (await until(() => convNameFetching.size === 0)) &&
        convNames.has("dm:u-fail") === false &&
        convNameFor("dm:u-fail") === "dm",
      JSON.stringify({
        cached: convNames.has("dm:u-fail"),
        names: [...convNames.keys()],
      }),
    );
    rest.getChannel = stubGetChannel; // restore — the later sections ride the recording stub
    // (e) the sanitizer: no newlines, no pings, the 26-char picker clamp
    check(
      "names: convNameSlice strips newlines and @pings, collapses spaces, clamps to the 26-char picker limit",
      convNameSlice("ping @everyone\nnow  " + "x".repeat(40)) ===
        "ping everyone now xxxxxxxx",
      JSON.stringify(convNameSlice("ping @everyone\nnow  " + "x".repeat(40))),
    );
    // (f) the spawn record: a known surface -> the DISCORD_CONV_NAME value; unknown -> null (the beacon falls back)
    smokeSpawns.length = 0;
    await spawnForConv(
      "channel:c-named",
      "c-named",
      "env-name check",
      "trig-env",
    );
    check(
      "names: a known surface name rides the spawn record as the DISCORD_CONV_NAME value ('discord ' + surface, <=26)",
      smokeSpawns.length === 1 &&
        smokeSpawns[0].convName === "discord ask-homelab" &&
        smokeSpawns[0].convName.length <= 26,
      JSON.stringify(smokeSpawns),
    );
    await spawnForConv(
      "channel:c-unnamed",
      "c-unnamed",
      "env-unnamed check",
      "trig-env2",
    );
    check(
      "names: an unknown surface spawns WITHOUT a name (null record — the beacon's convKey-slug fallback covers it)",
      smokeSpawns.length === 2 && smokeSpawns[1].convName == null,
      JSON.stringify(smokeSpawns),
    );
    smokeSpawns.length = 0; // hygiene — section 3 starts from a clean record
    for (const k of ["channel:c-named", "thread:t-create", "dm:u9"])
      convNames.delete(k); // hygiene: no state survives the section
    threadNameLastSet.delete("thread:t-named");
    channels.delete("c-named");
    channels.delete("dmch-2");
  }

  const baseCfg = () => ({
    ...DEFAULTS,
    bot_token: "TEST-TOKEN",
    application_id: "APP",
    allowed_guild_ids: ["g1"],
    allowed_users: ["u1"],
    allowed_channels: ["c1"],
    allow_dm: true,
    require_mention: true,
    auto_thread: true,
  });
  const msg = (over = {}) => ({
    id: "m-" + Math.random().toString(36).slice(2, 10),
    guild_id: "g1",
    channel_id: "c1",
    author: { id: "u1", username: "alice" },
    content: "hello",
    mentions: [],
    ...over,
  });

  let r = await evaluateAdmission(msg(), baseCfg());
  check("ladder: allowed message passes", r.ok === true, JSON.stringify(r));
  r = await evaluateAdmission(
    msg({ author: { id: "555000111222333444", username: "bot" } }),
    baseCfg(),
  );
  check(
    "ladder: own message drops (self gate)",
    r.ok === false && r.gate === "self",
  );
  r = await evaluateAdmission(msg({ id: "dup-1" }), baseCfg());
  r = await evaluateAdmission(msg({ id: "dup-1" }), baseCfg());
  check(
    "ladder: duplicate message id drops (dedup)",
    r.ok === false && r.gate === "dedup",
  );
  r = await evaluateAdmission(msg({ guild_id: "g2" }), baseCfg());
  check(
    "ladder: non-allowlisted guild denies + one-time warning",
    r.ok === false && r.gate === "guild" && warnOnce.guild === true,
  );
  const warnedBefore = Object.keys(warnOnce).length;
  await evaluateAdmission(msg({ guild_id: "g3", id: "m-g3" }), baseCfg());
  check(
    "ladder: guild warning fires once",
    Object.keys(warnOnce).length === warnedBefore,
  );
  r = await evaluateAdmission(msg({ guild_id: "g1" }), {
    ...baseCfg(),
    allowed_guild_ids: [],
  });
  check(
    "ladder: empty guild allowlist denies (fail-closed)",
    r.ok === false && r.gate === "guild",
  );
  r = await evaluateAdmission(msg({ channel_id: "c9" }), baseCfg());
  check(
    "ladder: non-allowlisted channel denies",
    r.ok === false && r.gate === "channel",
  );
  r = await evaluateAdmission(msg({ channel_id: "c1" }), {
    ...baseCfg(),
    allowed_channels: [],
  });
  check(
    "ladder: empty channel allowlist denies (fail-closed)",
    r.ok === false && r.gate === "channel" && warnOnce.channel === true,
  );
  r = await evaluateAdmission(msg({ channel_id: "c1" }), {
    ...baseCfg(),
    ignored_channels: ["*"],
  });
  check(
    "ladder: ignored_channels '*' denies",
    r.ok === false && r.gate === "channel",
  );
  r = await evaluateAdmission(
    msg({ author: { id: "u2", username: "eve" } }),
    baseCfg(),
  );
  check(
    "ladder: non-allowlisted user denies + one-time warning",
    r.ok === false && r.gate === "user" && warnOnce.user === true,
  );
  r = await evaluateAdmission(msg({ author: { id: "u2", username: "eve" } }), {
    ...baseCfg(),
    allow_all_users: true,
  });
  check("ladder: allow_all_users admits", r.ok === true);
  r = await evaluateAdmission(
    msg({ author: { id: "u1", username: "otherbot", bot: true } }),
    baseCfg(),
  );
  check(
    "ladder: bot author denies when allow_bots=none",
    r.ok === false && r.gate === "bots",
  );
  r = await evaluateAdmission(
    msg({
      author: { id: "u1", username: "otherbot", bot: true },
      content: "yo <@555000111222333444> do it",
    }),
    { ...baseCfg(), allow_bots: "mentions" },
  );
  check(
    "ladder: bot author with allow_bots=mentions + inline token passes",
    r.ok === true,
    JSON.stringify(r),
  );
  r = await evaluateAdmission(
    msg({
      author: { id: "u1", username: "otherbot", bot: true },
      content: "just a reply-ping",
      mentions: [{ id: "BOTID" }],
    }),
    { ...baseCfg(), allow_bots: "mentions" },
  );
  check(
    "ladder: bot reply-ping (mentions array, no raw token) denies",
    r.ok === false && r.gate === "bots",
  );
  r = await evaluateAdmission(
    msg({ guild_id: null, channel_id: "dmch" }),
    baseCfg(),
  );
  check("ladder: DM passes when allow_dm", r.ok === true && r.isDm === true);
  r = await evaluateAdmission(msg({ guild_id: null, channel_id: "dmch" }), {
    ...baseCfg(),
    allow_dm: false,
  });
  check(
    "ladder: DM denies when allow_dm=false",
    r.ok === false && r.gate === "dm",
  );

  // mention gate + participation
  ledger.set("thread:t1", {
    sessionId: "s-old",
    cwd: "/tmp",
    channel_id: "t1",
    created: nowIso(),
    lastActive: nowIso(),
  });
  check(
    "mention gate: mapped thread passes without mention",
    passesMentionGate(["t1", "c1"], "thread:t1", baseCfg(), false) === true,
  );
  check(
    "mention gate: unmapped thread needs mention",
    passesMentionGate(["t1", "c1"], "thread:tX", baseCfg(), false) === false,
  );
  check(
    "mention gate: unmapped thread with mention passes",
    passesMentionGate(["t1", "c1"], "thread:tX", baseCfg(), true) === true,
  );
  check(
    "mention gate: free-response channel passes without mention",
    passesMentionGate(
      ["c1"],
      null,
      { ...baseCfg(), free_response_channels: ["c1"] },
      false,
    ) === true,
  );
  check(
    "mention gate: require_mention=false passes without mention",
    passesMentionGate(
      ["c1"],
      null,
      { ...baseCfg(), require_mention: false },
      false,
    ) === true,
  );

  // end-to-end: mention in a shared channel -> (policy "always") auto-thread -> dispatch queued
  // (spawn guarded in smoke). handleMessage reads live config — inject the synthetic
  // allowlists through the documented env overrides (which also proves the env
  // precedence chain). Under the default policy "agent" NO thread is created: the
  // conversation maps to channel:<id> and the AGENT decides (discord_thread tool).
  smokeSpawns = [];
  process.env.DISCORD_ALLOWED_GUILDS = "g1";
  process.env.DISCORD_ALLOWED_USERS = "u1";
  process.env.DISCORD_ALLOWED_CHANNELS = "c1";
  process.env.DISCORD_REQUIRE_MENTION = "true";
  const m2 = msg({
    content: "<@555000111222333444> summarize the PR",
    mentions: [{ id: "555000111222333444" }],
  });
  await handleMessage(m2);
  await new Promise((res) => setTimeout(res, 700)); // live text_batch_ms (600) flush
  delete process.env.DISCORD_ALLOWED_GUILDS;
  delete process.env.DISCORD_ALLOWED_USERS;
  delete process.env.DISCORD_ALLOWED_CHANNELS;
  delete process.env.DISCORD_REQUIRE_MENTION;
  if (loadConfig().thread_policy === "always") {
    // policy "always" (legacy behavior): every triggering mention spawns a thread
    check(
      "e2e: auto-thread created with stripped name <=80",
      threads.length === 1 && threads[0].name === "summarize the PR",
      threads[0]?.name,
    );
    check(
      "e2e: dispatch routed to the thread conversation",
      smokeSpawns.length === 1 &&
        smokeSpawns[0].convKey === `thread:t-${m2.id}`,
      JSON.stringify(smokeSpawns),
    );
    check(
      "e2e: prompt carries the triggering user",
      smokeSpawns.length === 1 &&
        smokeSpawns[0].text.includes("alice") &&
        smokeSpawns[0].text.includes("summarize the PR"),
      smokeSpawns[0]?.text,
    );
    // thread visibility (production 2026-09-23: every auto-thread came back PRIVATE
    // type 12, bot-only — the operator could not see the thread or any reply)
    check(
      "e2e: auto-thread create payload requests a PUBLIC thread (type 11) — belt-and-braces with the member-add",
      threads.length === 1 && threads[0].type === 11,
      JSON.stringify(threads),
    );
    check(
      "e2e: the trigger author is added to the new thread right after creation",
      memberAdds.length === 1 &&
        memberAdds[0].threadId === `t-${m2.id}` &&
        memberAdds[0].userId === "u1",
      JSON.stringify(memberAdds),
    );
    // reaction ack gate: the checks follow the resolved setting — a DISCORD_REACTIONS=false
    // run proves the off path here (zero reaction calls) instead of asserting the on path
    if (loadConfig().reactions) {
      check(
        "e2e: turn start reacts 👀 on the trigger in its PARENT channel (the thread gets the reply, the channel gets the ack)",
        reactions.length === 1 &&
          reactions[0].op === "PUT" &&
          reactions[0].emoji === "👀" &&
          reactions[0].channelId === "c1" &&
          reactions[0].messageId === m2.id,
        JSON.stringify(reactions),
      );
    } else {
      check(
        "e2e: reactions off — zero reaction calls recorded",
        reactions.length === 0,
        JSON.stringify(reactions),
      );
    }
  } else {
    // policy "agent" (the NEW default): a channel mention does NOT auto-thread —
    // the conversation is channel:<id>, replies post to the channel, and the agent
    // promotes a substantial topic via the discord_thread tool (checked below)
    check(
      "e2e: agent policy — a channel mention creates NO thread (the agent decides)",
      threads.length === 0,
      JSON.stringify(threads),
    );
    check(
      "e2e: agent policy — the conversation maps to the channel itself",
      smokeSpawns.length === 1 && smokeSpawns[0].convKey === "channel:c1",
      JSON.stringify(smokeSpawns),
    );
    check(
      "e2e: prompt carries the triggering user",
      smokeSpawns.length === 1 &&
        smokeSpawns[0].text.includes("alice") &&
        smokeSpawns[0].text.includes("summarize the PR"),
      smokeSpawns[0]?.text,
    );
    check(
      "e2e: agent policy — the streamer anchors the reply to the channel and keeps the trigger author for a tool promotion",
      (() => {
        const st = streamers.get("channel:c1");
        return (
          st?.channelId === "c1" &&
          st?.triggerChannelId === "c1" &&
          st?.triggerMessageId === m2.id &&
          st?.triggerAuthorId === "u1" &&
          st?.pendingAck === true
        );
      })(),
      JSON.stringify({
        ...streamers.get("channel:c1"),
        turnTimer:
          streamers.get("channel:c1")?.turnTimer != null ? "<armed>" : null,
        typingTimer:
          streamers.get("channel:c1")?.typingTimer != null ? "<running>" : null,
      }),
    );
    if (loadConfig().reactions) {
      check(
        "e2e: agent policy — turn start reacts 👀 on the trigger in the channel",
        reactions.length === 1 &&
          reactions[0].op === "PUT" &&
          reactions[0].emoji === "👀" &&
          reactions[0].channelId === "c1" &&
          reactions[0].messageId === m2.id,
        JSON.stringify(reactions),
      );
    } else {
      check(
        "e2e: reactions off — zero reaction calls recorded",
        reactions.length === 0,
        JSON.stringify(reactions),
      );
    }
  }
  ledger.delete("thread:t1");
  ledger.clear();

  // slash-command surface: authorization mirrors the ladder gates; /reset drops the mapping
  const inter = {
    id: "i1",
    token: "tk",
    guild_id: "g1",
    channel_id: "c1",
    member: { user: { id: "u1" } },
    data: { name: "ping" },
  };
  check(
    "slash: authorized guild/channel/user interaction passes the mirror gates",
    (await interactionAuthorized(inter, baseCfg())) === true,
  );
  check(
    "slash: foreign user denied",
    (await interactionAuthorized(
      { ...inter, member: { user: { id: "u9" } } },
      baseCfg(),
    )) === false,
  );
  check(
    "slash: DM interaction honors allow_dm",
    (await interactionAuthorized({ ...inter, guild_id: null }, baseCfg())) ===
      true &&
      (await interactionAuthorized(
        { ...inter, guild_id: null },
        { ...baseCfg(), allow_dm: false },
      )) === false,
  );
  process.env.DISCORD_ALLOWED_GUILDS = "g1"; // handleInteraction reads live config — same env injection as the e2e
  process.env.DISCORD_ALLOWED_USERS = "u1";
  process.env.DISCORD_ALLOWED_CHANNELS = "c1";
  await handleInteraction(inter);
  delete process.env.DISCORD_ALLOWED_GUILDS;
  delete process.env.DISCORD_ALLOWED_USERS;
  delete process.env.DISCORD_ALLOWED_CHANNELS;
  check(
    "slash: /ping responds through the interaction callback",
    callbacks.some((c) => c.content.includes("gateway")),
    JSON.stringify(callbacks),
  );
  ledger.set("thread:t1", {
    sessionId: "s-old",
    cwd: "/tmp",
    channel_id: "t1",
    created: nowIso(),
    lastActive: nowIso(),
  });
  const resetReply = await resetConv(
    { guild_id: "g1", channel_id: "t1" },
    baseCfg(),
  );
  check(
    "slash: /reset drops the thread conversation mapping",
    resetReply.includes("reset") && !ledger.has("thread:t1"),
    resetReply,
  );
  const resetNone = await resetConv(
    { guild_id: "g1", channel_id: "c1" },
    baseCfg(),
  );
  check(
    "slash: /reset in a channel without a mapping says so",
    resetNone.includes("no conversation"),
    resetNone,
  );

  // DM interaction authz matrix (review finding 1): the gate-5 user mirror runs for DM
  // interactions too — allow_dm alone must never be an implicit allow-all (fail-closed)
  const dmInter = (name, userId) => ({
    id: `i-${name}-${userId}`,
    token: "tk",
    guild_id: null,
    channel_id: "dmch",
    user: { id: userId },
    data: { name },
  });
  check(
    "slash: DM interaction with empty allowed_users denies (fail-closed)",
    (await interactionAuthorized(dmInter("ping", "u2"), {
      ...baseCfg(),
      allowed_users: [],
    })) === false,
  );
  check(
    "slash: DM interaction with the invoking user in allowed_users allows",
    (await interactionAuthorized(dmInter("ping", "u2"), {
      ...baseCfg(),
      allowed_users: ["u2"],
    })) === true,
  );
  check(
    "slash: DM interaction allow_dm=false still denies even when allowlisted",
    (await interactionAuthorized(dmInter("ping", "u2"), {
      ...baseCfg(),
      allowed_users: ["u2"],
      allow_dm: false,
    })) === false,
  );
  process.env.DISCORD_ALLOW_DM = "true"; // handleInteraction reads live config — env injection keeps the matrix hermetic
  process.env.DISCORD_ALLOWED_USERS = "u1";
  const dmDenied = [];
  for (const name of ["ping", "status", "reset", "stop"]) {
    callbacks.length = 0;
    await handleInteraction(dmInter(name, "u2")); // u2 is not in the allowlist
    dmDenied.push(callbacks[0]?.content === "not authorized");
  }
  check(
    "slash: DM /ping /status /reset /stop all deny a non-allowlisted user",
    dmDenied.length === 4 && dmDenied.every(Boolean),
    JSON.stringify(callbacks),
  );
  callbacks.length = 0;
  await handleInteraction(dmInter("ping", "u1"));
  check(
    "slash: DM /ping responds for the invoking allowlisted user",
    (callbacks[0]?.content ?? "").includes("gateway"),
    JSON.stringify(callbacks),
  );
  callbacks.length = 0;
  await handleInteraction(dmInter("status", "u1"));
  check(
    "slash: DM /status responds for the invoking allowlisted user",
    (callbacks[0]?.content ?? "").includes("conversations"),
    JSON.stringify(callbacks),
  );
  callbacks.length = 0;
  await handleInteraction(dmInter("reset", "u1"));
  check(
    "slash: DM /reset runs for the invoking allowlisted user (no mapping -> says so)",
    (callbacks[0]?.content ?? "").includes("no conversation"),
    JSON.stringify(callbacks),
  );
  callbacks.length = 0;
  await handleInteraction(dmInter("stop", "u1"));
  check(
    "slash: DM /stop runs for the invoking allowlisted user (no mapping -> says so, aborts nothing)",
    (callbacks[0]?.content ?? "").includes("no conversation"),
    JSON.stringify(callbacks),
  );
  delete process.env.DISCORD_ALLOW_DM;
  delete process.env.DISCORD_ALLOWED_USERS;

  // ---- 4. streaming discipline against the recorded REST ----
  process.env.DISCORD_SEND_PACE_MS = "50"; // finalize's split pacing stays fast here — the pacing mechanism itself is checked explicitly in section 4b
  routing.set("conv:s", { sessionId: "s1", controlPort: 0, pid: 111 });
  const st4 = streamerOf("conv:s");
  st4.channelId = "chan-1";
  st4.triggerMessageId = "trig-1";
  const rtmPrev4 = process.env.DISCORD_REPLY_TO_MODE; // the live config may carry "off" — the chunk-reference rule needs "first" here
  process.env.DISCORD_REPLY_TO_MODE = "first";
  await onBeaconEvent("s1", "busy", { busy: true });
  check("stream: typing indicator started on turn", typings.length >= 1);
  await onBeaconEvent("s1", "message_update", { text: "first partial" });
  await st4.creating; // the preview-create chain runs detached — settle before asserting
  check(
    "stream: preview created once",
    sent.length === 1 && sent[0].content === "first partial",
    JSON.stringify(sent),
  );
  const editsAfterFirst = edits.length;
  await onBeaconEvent("s1", "message_update", { text: "first partial (more)" }); // within the 2s throttle -> skipped
  check(
    "stream: rapid second edit throttled",
    edits.length === editsAfterFirst,
    `edits=${edits.length}`,
  );
  await onBeaconEvent("s1", "message_update", { text: "first partial" }); // identical truncated text -> saturated dedup
  check(
    "stream: identical truncated preview is never re-edited (saturated dedup)",
    sent.length === 1 && edits.length === editsAfterFirst,
  );
  const longText =
    "x".repeat(1900) +
    "\n" +
    "y".repeat(1900) +
    "\n" +
    "z".repeat(1900) +
    "\nfinal part";
  const sentBeforeFinal = sent.length;
  await onBeaconEvent("s1", "message_end", { text: longText });
  check(
    "stream: finalize edits the preview into chunk 1",
    edits.some((e) => e.content === "x".repeat(1900)),
  );
  check(
    "stream: the preview (a block's chunk 1) references the trigger under reply_to_mode=first",
    sent.some((s) => s.channelId === "chan-1" && s.opts.replyTo === "trig-1"),
    JSON.stringify(
      sent
        .filter((s) => s.channelId === "chan-1")
        .map((s) => [s.opts.replyTo, String(s.content).slice(0, 14)]),
    ),
  );
  const tail = sent.slice(sentBeforeFinal);
  check(
    "stream: overflow chunks 2..N post PLAIN — the reference rides a block's first chunk only (2026-09-24 operator rule: adjacency associates the rest, the header never repeats)",
    tail.length === 3 && tail.every((s) => !s.opts.replyTo),
    JSON.stringify(
      tail.map((s) => [s.opts.replyTo, String(s.content).slice(0, 14)]),
    ),
  );
  check(
    "stream: every outbound chunk <=1900 chars",
    sent.every((s) => s.content.length <= 1900),
  );
  process.env.DISCORD_MAX_SPLITS = "2"; // finalize reads live config — env is the honest injection point
  await onBeaconEvent("s1", "message_end", { text: "a".repeat(1900 * 4) });
  delete process.env.DISCORD_MAX_SPLITS;
  check(
    "stream: overflow beyond max_splits replaced by a truncation notice",
    sent.some((s) => s.content.includes("output truncated")),
  );
  delete process.env.DISCORD_SEND_PACE_MS;
  if (rtmPrev4 === undefined) delete process.env.DISCORD_REPLY_TO_MODE;
  else process.env.DISCORD_REPLY_TO_MODE = rtmPrev4; // restore
  await onBeaconEvent("s1", "busy", { busy: false });
  check(
    "stream: typing stops at turn end",
    streamers.get("conv:s")?.typingTimer === null,
  );
  routing.delete("conv:s");
  streamers.delete("conv:s");

  // inter-turn race (review finding 3): a turn N+1 preview arriving mid-finalize must
  // edit nothing of turn N — chunk-1 keeps its finalized text, and the mid-flight
  // preview survives finalize instead of being wiped after the awaited REST calls
  routing.set("conv:r", { sessionId: "sr", controlPort: 0, pid: 222 });
  const stR = streamerOf("conv:r");
  stR.channelId = "chan-r";
  stR.triggerMessageId = "trig-r";
  await onBeaconEvent("sr", "busy", { busy: true });
  await onBeaconEvent("sr", "message_update", { text: "turn one preview" }); // turn N's preview
  await stR.creating; // settle the create chain before snapshotting the preview id
  const detachedId = stR.previewId;
  const realEdit = rest.editMessage;
  let releaseChunk1;
  const chunk1Gate = new Promise((r) => (releaseChunk1 = r));
  rest.editMessage = async (channelId, messageId, content) => {
    if (messageId === detachedId && content === "turn one final")
      await chunk1Gate; // pause finalize mid-flight
    return realEdit(channelId, messageId, content);
  };
  const finalizePromise = onBeaconEvent("sr", "message_end", {
    text: "turn one final",
  }); // finalize starts, parks on the chunk-1 edit
  await new Promise((r) => setTimeout(r, 50)); // let finalize reach the gate
  await onBeaconEvent("sr", "message_update", { text: "turn two preview" }); // turn N+1 arrives mid-finalize
  await stR.creating; // the mid-flight preview chain settles before the snapshot
  const midPreviewId = stR.previewId;
  releaseChunk1();
  await finalizePromise;
  rest.editMessage = realEdit;
  await onBeaconEvent("sr", "busy", { busy: false });
  check(
    "race: turn N+1 preview mid-finalize is its own message, never turn N's chunk-1",
    midPreviewId !== detachedId && midPreviewId != null,
    `mid=${midPreviewId} detached=${detachedId}`,
  );
  const detachedEdits = edits.filter((e) => e.messageId === detachedId);
  check(
    "race: turn N's chunk-1 keeps its finalized text (no mid-flight corruption)",
    detachedEdits.length === 1 && detachedEdits[0].content === "turn one final",
    JSON.stringify(detachedEdits),
  );
  check(
    "race: turn N+1's preview survives finalize (state not wiped after the awaits)",
    stR.previewId === midPreviewId,
    `previewId=${stR.previewId}`,
  );
  routing.delete("conv:r");
  streamers.delete("conv:r");

  // ---- 4b. rate-limit resilience: 429 simulation against the recorded REST ----
  // production 2026-09-25 (thread 1552402301740654662): a saturated channel
  // bucket turned every streaming delta into a fresh POST and the reply died.
  // These prove the new delivery layer end to end against the stubbed REST.
  process.env.DISCORD_PREVIEW_BACKOFF_MS = "30"; // keep the bounded retry chain fast — mechanics, not the wall clock, are under test
  const rl429 = () =>
    new RestError(
      429,
      JSON.stringify({
        message: "You are being rate limited.",
        retry_after: 0.05,
        global: false,
      }),
    );
  // (a) flood: the first creates 429 — deltas park, ONE bounded chain retries
  routing.set("conv:rl", { sessionId: "s-rl", controlPort: 0, pid: 331 });
  const stRl = streamerOf("conv:rl");
  stRl.channelId = "chan-rl";
  stRl.triggerMessageId = "trig-rl";
  for (let i = 0; i < PREVIEW_CREATE_MAX_ATTEMPTS - 1; i++)
    scripted.push({
      match: (me, p) => me === "POST" && p === "/channels/chan-rl/messages",
      error: rl429(),
    });
  for (let i = 1; i <= 8; i++)
    await onBeaconEvent("s-rl", "message_update", { text: `delta ${i}` }); // 8 deltas, 3 scripted 429s
  await stRl.creating;
  const rlPosts = sent.filter((s) => s.channelId === "chan-rl");
  check(
    "rl: first-create 429s park deltas — bounded retries, never one POST per delta",
    rlPosts.length === PREVIEW_CREATE_MAX_ATTEMPTS && stRl.previewId != null,
    `events=8 posts=${rlPosts.length}`,
  );
  check(
    "rl: the landed preview carries the freshest parked delta",
    rlPosts[rlPosts.length - 1].content === "delta 8",
    JSON.stringify(rlPosts.map((s) => s.content)),
  );
  // (a2) give-up: a dead channel exhausts the chain bounded; finalize still delivers
  routing.set("conv:rl2", { sessionId: "s-rl2", controlPort: 0, pid: 332 });
  const stRl2 = streamerOf("conv:rl2");
  stRl2.channelId = "chan-rl2";
  stRl2.triggerMessageId = "trig-rl2";
  for (let i = 0; i < PREVIEW_CREATE_MAX_ATTEMPTS; i++)
    scripted.push({
      match: (me, p) => me === "POST" && p === "/channels/chan-rl2/messages",
      error: rl429(),
    });
  await onBeaconEvent("s-rl2", "message_update", {
    text: "parks while the channel is dead",
  });
  await stRl2.creating;
  check(
    "rl: a dead channel exhausts the create chain bounded (give-up, no preview)",
    stRl2.previewId == null &&
      sent.filter((s) => s.channelId === "chan-rl2").length ===
        PREVIEW_CREATE_MAX_ATTEMPTS,
  );
  await onBeaconEvent("s-rl2", "message_update", {
    text: "still parked after give-up",
  }); // inside the post-give-up cooldown — must not restart the chain
  check(
    "rl: post-give-up deltas park without new POSTs",
    stRl2.creating == null &&
      sent.filter((s) => s.channelId === "chan-rl2").length ===
        PREVIEW_CREATE_MAX_ATTEMPTS,
  );
  await onBeaconEvent("s-rl2", "message_end", {
    text: "the reply that must still land",
  }); // finalize is the delivery of last resort
  check(
    "rl: finalize delivers the full reply even after preview give-up",
    sent.some(
      (s) =>
        s.channelId === "chan-rl2" &&
        s.content === "the reply that must still land",
    ),
    JSON.stringify(
      sent.filter((s) => s.channelId === "chan-rl2").map((s) => s.content),
    ),
  );
  // (b) bucket pause: a 429 parks EVERY request to the bucket — concurrent calls wait out the cooldown (real request, fake fetch)
  {
    const realFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async () => {
      // hermetic: never reaches discord.com
      calls.push(Date.now());
      if (calls.length === 1)
        return new Response(
          JSON.stringify({
            message: "You are being rate limited.",
            retry_after: 0.12,
            global: false,
          }),
          { status: 429 },
        );
      return new Response(JSON.stringify({ id: `rt-${calls.length}` }), {
        status: 200,
      });
    };
    rest.request = realRequest; // the production request — bucket cooldowns live inside it
    try {
      const first = rest.request("POST", "/channels/ch-pause/messages", {
        content: "a",
      }); // 429s, parks the bucket, retries once
      await sleep(30); // let the 429 land and set the pause
      const second = rest.request("POST", "/channels/ch-pause/messages", {
        content: "b",
      }); // must wait out the pause
      const [a, b] = await Promise.all([first, second]);
      const pauseMs = 0.12 * 1000 + RATE_LIMIT_MARGIN_MS; // the pause both later calls had to respect
      check(
        "rl: a 429 parks every concurrent request for the retry_after window (+margin)",
        calls.length === 3 &&
          calls[1] - calls[0] >= pauseMs - 20 &&
          calls[2] - calls[0] >= pauseMs - 20,
        `calls=${JSON.stringify(
          calls.map((t) => t - calls[0]),
        )} pause=${pauseMs}`,
      );
      const retryIds = new Set([a?.id, b?.id]); // both parked requests wake at the same deadline — retry order is timing noise; assert the set
      check(
        "rl: a parked request still succeeds on its single retry",
        retryIds.size === 2 && retryIds.has("rt-2") && retryIds.has("rt-3"),
        `a=${a?.id} b=${b?.id}`,
      );
    } finally {
      globalThis.fetch = realFetch;
      rest.request = stubbedRequest;
    }
  }
  // (c) finalize pacing: split sends serialize with >= pace gaps
  {
    process.env.DISCORD_SEND_PACE_MS = "120";
    routing.set("conv:pace", { sessionId: "s-pace", controlPort: 0, pid: 333 });
    const stP = streamerOf("conv:pace");
    stP.channelId = "chan-pace";
    stP.triggerMessageId = "trig-pace";
    await onBeaconEvent("s-pace", "message_end", {
      text:
        "p".repeat(1900) +
        "\n" +
        "q".repeat(1900) +
        "\n" +
        "r".repeat(1900) +
        "\n" +
        "s".repeat(500),
    });
    const paced = sent.filter((s) => s.channelId === "chan-pace");
    const gaps = paced.slice(1).map((s, i) => s.at - paced[i].at);
    check(
      "rl: finalize paces its split sends (>= injected 100ms between POSTs)",
      paced.length === 4 && gaps.every((g) => g >= 100),
      `posts=${paced.length} gaps=${JSON.stringify(gaps)}`,
    );
    delete process.env.DISCORD_SEND_PACE_MS;
  }
  // (d) a rejected reply reference degrades to a fresh send (production 400 MESSAGE_REFERENCE_UNKNOWN)
  {
    routing.set("conv:ref", { sessionId: "s-ref", controlPort: 0, pid: 334 });
    const stRef = streamerOf("conv:ref");
    stRef.channelId = "chan-ref";
    stRef.triggerMessageId = "gone-trig";
    process.env.DISCORD_REPLY_TO_MODE = "first"; // the live config may carry the operator's "off" workaround — inject the mode this scenario needs
    scripted.push({
      match: (me, p, b) =>
        me === "POST" &&
        p === "/channels/chan-ref/messages" &&
        b?.message_reference?.message_id === "gone-trig",
      error: new RestError(
        400,
        JSON.stringify({
          message: "Invalid Form Body",
          code: 50035,
          errors: {
            message_reference: {
              _errors: [
                {
                  code: "MESSAGE_REFERENCE_UNKNOWN_MESSAGE",
                  message: "Unknown message",
                },
              ],
            },
          },
        }),
      ),
    });
    await onBeaconEvent("s-ref", "message_update", {
      text: "preview that must land anyway",
    });
    await stRef.creating;
    const refPosts = sent.filter((s) => s.channelId === "chan-ref");
    check(
      "rl: unknown reply-reference degrades to a reference-free fresh send",
      refPosts.length === 2 &&
        refPosts[0].opts.replyTo === "gone-trig" &&
        refPosts[1].opts.replyTo === undefined &&
        refPosts[1].content === "preview that must land anyway",
      JSON.stringify(refPosts.map((s) => [s.opts.replyTo, s.content])),
    );
    delete process.env.DISCORD_REPLY_TO_MODE;
  }
  // preview lifecycle across the reference-reject retry (sibling-observed "empty
  // preview" 2026-09-23, 21:01:04Z): the 400'd reference attempt throws BEFORE
  // any message exists, sendMessage returns the retried fresh send, and
  // ensurePreview points previewId at the LANDED id — later edits must target
  // exactly that message, never a dead/never-landed one
  {
    routing.set("conv:pvretry", {
      sessionId: "s-pvretry",
      controlPort: 1,
      pid: 345,
    });
    const stP = streamerOf("conv:pvretry");
    stP.channelId = "chan-pvretry";
    stP.triggerMessageId = "parent-trig";
    stP.triggerChannelId = "chan-pvretry";
    process.env.DISCORD_REPLY_TO_MODE = "first"; // the auto-thread shape: the trigger lives in the parent channel, so the create's reference 400s
    scripted.push({
      match: (me, p, b) =>
        me === "POST" &&
        p === "/channels/chan-pvretry/messages" &&
        b?.message_reference?.message_id === "parent-trig",
      error: new RestError(
        400,
        JSON.stringify({
          message: "Invalid Form Body",
          code: 50035,
          errors: {
            message_reference: {
              _errors: [
                {
                  code: "MESSAGE_REFERENCE_UNKNOWN_MESSAGE",
                  message: "Unknown message",
                },
              ],
            },
          },
        }),
      ),
    });
    await onBeaconEvent("s-pvretry", "message_update", { text: "first delta" }); // create: reference 400 -> retry fresh -> lands
    await stP.creating;
    const landedId = stP.previewId;
    check(
      "preview: a reference-rejected create retries fresh and previewId points at the LANDED message id",
      landedId != null &&
        sent.some(
          (s) =>
            s.channelId === "chan-pvretry" &&
            !s.opts.replyTo &&
            s.content === "first delta",
        ),
      JSON.stringify({
        landedId,
        posts: sent
          .filter((s) => s.channelId === "chan-pvretry")
          .map((s) => [s.opts.replyTo, s.content]),
      }),
    );
    await new Promise((r) =>
      setTimeout(
        r,
        (loadConfig().preview_min_edit_ms ?? PREVIEW_MIN_INTERVAL_MS) + 100,
      ),
    ); // past the edit throttle (the knob, not the const)
    const pvEditsBefore = edits.length;
    await onBeaconEvent("s-pvretry", "message_update", {
      text: "first delta and more",
    });
    await new Promise((r) => setTimeout(r, 50));
    check(
      "preview: subsequent preview edits target the retried fresh message's id",
      edits.length === pvEditsBefore + 1 &&
        edits[edits.length - 1]?.messageId === landedId &&
        edits[edits.length - 1]?.content === "first delta and more",
      JSON.stringify(edits.slice(-1)),
    );
    delete process.env.DISCORD_REPLY_TO_MODE;
    routing.delete("conv:pvretry");
    streamers.delete("conv:pvretry");
  }
  // (e) a deleted preview degrades to a fresh chunk-1; total failure degrades to one consolidated send
  {
    routing.set("conv:gone", { sessionId: "s-gone", controlPort: 0, pid: 335 });
    const stGone = streamerOf("conv:gone");
    stGone.channelId = "chan-gone";
    stGone.triggerMessageId = "trig-gone";
    stGone.previewId = "preview-deleted";
    stGone.previewShown = "stale";
    scripted.push({
      match: (me, p) =>
        me === "PATCH" && p === "/channels/chan-gone/messages/preview-deleted",
      error: new RestError(
        404,
        JSON.stringify({ message: "Unknown Message", code: 10008 }),
      ),
    });
    await onBeaconEvent("s-gone", "message_end", {
      text: "reply over a deleted preview",
    });
    const gonePosts = sent.filter((s) => s.channelId === "chan-gone");
    check(
      "rl: finalize recovers a deleted preview via a fresh chunk-1 send",
      gonePosts.length === 1 &&
        gonePosts[0].content === "reply over a deleted preview",
      JSON.stringify(gonePosts.map((s) => s.content)),
    );
  }
  {
    routing.set("conv:cf", { sessionId: "s-cf", controlPort: 0, pid: 336 });
    const stCf = streamerOf("conv:cf");
    stCf.channelId = "chan-cf";
    stCf.triggerMessageId = "trig-cf";
    scripted.push({
      match: (me, p) => me === "POST" && p === "/channels/chan-cf/messages",
      error: rl429(),
    });
    await onBeaconEvent("s-cf", "message_end", {
      text: "the consolidated last resort",
    });
    const cfPosts = sent.filter((s) => s.channelId === "chan-cf");
    check(
      "rl: zero-delivery finalize degrades to one consolidated send",
      cfPosts.length === 2 &&
        cfPosts[1].content === "the consolidated last resort" &&
        cfPosts[1].opts.replyTo === undefined,
      JSON.stringify(cfPosts.map((s) => [s.opts.replyTo, s.content])),
    );
  }
  // ---- 4c. reaction ack lifecycle: swap at finalize (✅ delivered / ⚠️ undeliverable) ----
  check(
    "rl: reactions get their own bucket key — a saturated message bucket must not queue the ack",
    bucketKeyOf("/channels/ch/messages/m1/reactions/%F0%9F%91%80/@me") ===
      "reactions:ch" &&
      bucketKeyOf("/channels/ch/messages/m1") === "messages:ch",
    bucketKeyOf("/channels/ch/messages/m1/reactions/%F0%9F%91%80/@me"),
  );
  if (loadConfig().reactions) {
    routing.set("conv:react", {
      sessionId: "s-react",
      controlPort: 0,
      pid: 337,
    });
    const stRe = streamerOf("conv:react");
    stRe.channelId = "chan-react";
    stRe.triggerChannelId = "parent-react";
    stRe.triggerMessageId = "trig-react"; // the trigger lives in the parent channel — the ack targets it there while the reply lands in the thread
    const rOk = reactions.length;
    await onBeaconEvent("s-react", "message_end", { text: "ack this reply" }); // delivered -> swap (async + paced)
    check(
      "reack: delivered turn removes 👀 (+ a stale ⚠️) and adds ✅ on the trigger (parent channel)",
      await until(() => {
        const s = reactions.slice(rOk);
        return (
          s.length === 3 &&
          s.some((r) => r.op === "DELETE" && r.emoji === "👀") &&
          s.some((r) => r.op === "DELETE" && r.emoji === "⚠️") &&
          s.some((r) => r.op === "PUT" && r.emoji === "✅") &&
          s.every(
            (r) =>
              r.channelId === "parent-react" && r.messageId === "trig-react",
          )
        );
      }),
      JSON.stringify(reactions.slice(rOk)),
    );
    const okSwap = reactions.slice(rOk);
    check(
      "reack: reaction paths match the documented endpoint (URL-encoded emoji, @me)",
      okSwap.every(
        (r) =>
          r.path ===
          `/channels/parent-react/messages/trig-react/reactions/${encodeURIComponent(
            r.emoji,
          )}/@me`,
      ),
      JSON.stringify(okSwap.map((r) => r.path)),
    );
    // the swap paces its ops (production 2026-09-26: the eyes PUT and the ok PUT both
    // 429'd on one trigger — back-to-back reaction ops race the same per-message bucket)
    const okDel = okSwap.find((r) => r.op === "DELETE" && r.emoji === "👀"),
      okPut = okSwap.find((r) => r.op === "PUT" && r.emoji === "✅");
    check(
      "reack: the ack swap paces its DELETE->PUT (>= 300ms gap, per-message reaction bucket)",
      okDel && okPut && okPut.at - okDel.at >= 300,
      `gap=${okDel && okPut ? okPut.at - okDel.at : "?"}ms`,
    );
    // the NEXT turn on this conversation (a NEW trigger — dispatch re-anchors and
    // clears resolved; the old ✅ verdict is final on ITS trigger): its delivery
    // dies on both paths -> ⚠️ with the stale marks stripped FIRST — a genuine
    // failure never ends with both marks (#3), and the delivered trigger keeps
    // its ✅ untouched (#2)
    stRe.triggerMessageId = "trig-react-2";
    stRe.pendingAck = true;
    stRe.resolved = null; // the next dispatch's re-anchor shape
    const rFail = reactions.length;
    scripted.push({
      match: (me, p) => me === "POST" && p === "/channels/chan-react/messages",
      error: rl429(),
    }); // chunk-1 dies
    scripted.push({
      match: (me, p) => me === "POST" && p === "/channels/chan-react/messages",
      error: rl429(),
    }); // the consolidated fallback dies too
    await onBeaconEvent("s-react", "message_end", {
      text: "cannot deliver this",
    });
    check(
      "reack: nothing lands -> the NEW trigger swaps to ⚠️ with the stale marks stripped first (asymmetric cleanup: eyes, ok, then fail — never both marks)",
      await until(() => {
        const s = reactions.slice(rFail);
        return (
          s.length === 3 &&
          s[0].op === "DELETE" &&
          s[0].emoji === "👀" &&
          s[1].op === "DELETE" &&
          s[1].emoji === "✅" &&
          s[2].op === "PUT" &&
          s[2].emoji === "⚠️" &&
          s.every(
            (r) =>
              r.channelId === "parent-react" && r.messageId === "trig-react-2",
          )
        );
      }),
      JSON.stringify(reactions.slice(rFail)),
    );
    check(
      "reack: the delivered verdict is final — the previous trigger's ✅ is untouched by the next turn's failure",
      reactions.slice(rFail).every((r) => r.messageId !== "trig-react") &&
        reactions.some(
          (r) =>
            r.op === "PUT" && r.emoji === "✅" && r.messageId === "trig-react",
        ),
      JSON.stringify(
        reactions.filter(
          (r) => r.messageId === "trig-react" || r.messageId === "trig-react-2",
        ),
      ),
    );
    routing.delete("conv:react");
    streamers.delete("conv:react");
    // degraded delivery still counts as delivered — the consolidated send acks ✅, not ⚠️
    routing.set("conv:react2", {
      sessionId: "s-react2",
      controlPort: 0,
      pid: 339,
    });
    const stRe2 = streamerOf("conv:react2");
    stRe2.channelId = "chan-react2";
    stRe2.triggerChannelId = "parent-react2";
    stRe2.triggerMessageId = "trig-react2";
    const rCf = reactions.length;
    scripted.push({
      match: (me, p) => me === "POST" && p === "/channels/chan-react2/messages",
      error: rl429(),
    }); // chunk-1 dies; the consolidated send lands
    await onBeaconEvent("s-react2", "message_end", {
      text: "degraded but delivered",
    });
    check(
      "reack: degraded (consolidated) delivery still acks ✅",
      await until(() => {
        const s = reactions.slice(rCf);
        return (
          s.some(
            (r) =>
              r.op === "PUT" &&
              r.emoji === "✅" &&
              r.messageId === "trig-react2",
          ) &&
          sent.some(
            (s2) =>
              s2.channelId === "chan-react2" &&
              s2.content === "degraded but delivered",
          )
        );
      }),
      JSON.stringify(reactions.slice(rCf)),
    );
    routing.delete("conv:react2");
    streamers.delete("conv:react2");
    // (T2 regression, production 2026-09-26 ⚠️-on-a-delivered-turn) a FAILED reaction
    // PUT (even after rest.request's own retry) never downgrades the delivered turn:
    // one warn + one delayed retry, ✅ lands, ⚠️ never appears
    {
      process.env.DISCORD_REACTION_RETRY_MS = "60"; // the delayed retry fires fast here — the production window is 5s
      routing.set("conv:reactfail", {
        sessionId: "s-reactfail",
        controlPort: 0,
        pid: 344,
      });
      const stRf = streamerOf("conv:reactfail");
      stRf.channelId = "chan-reactfail";
      stRf.triggerChannelId = "parent-reactfail";
      stRf.triggerMessageId = "trig-reactfail";
      scripted.push({
        match: (me, p) =>
          me === "PUT" &&
          p ===
            `/channels/parent-reactfail/messages/trig-reactfail/reactions/${encodeURIComponent(
              "✅",
            )}/@me`,
        error: new RestError(
          429,
          JSON.stringify({
            message: "You are being rate limited.",
            retry_after: 0.05,
          }),
        ),
      }); // the ✅ PUT dies once
      const rRf = reactions.length;
      await onBeaconEvent("s-reactfail", "message_end", {
        text: "delivered despite the ack failing",
      });
      const rrOk = await until(() =>
        reactions
          .slice(rRf)
          .some(
            (r) =>
              r.op === "PUT" &&
              r.emoji === "✅" &&
              r.messageId === "trig-reactfail",
          ),
      );
      check(
        "reack: a failed reaction PUT retries once delayed and still ends ✅ — never a PUT ⚠️",
        rrOk &&
          !reactions.some(
            (r) =>
              r.op === "PUT" &&
              r.emoji === "⚠️" &&
              r.messageId === "trig-reactfail",
          ),
        JSON.stringify(
          reactions.filter((r) => r.messageId === "trig-reactfail"),
        ),
      );
      delete process.env.DISCORD_REACTION_RETRY_MS;
      routing.delete("conv:reactfail");
      streamers.delete("conv:reactfail");
    }
    // (T2 regression, the actual incident path) a tool-call assistant message end is
    // TEXTLESS — mid-turn it must ack NOTHING: the old code put ⚠️ on the trigger
    // before the reply even existed, and the delivered trigger ended with BOTH ⚠️ and ✅
    {
      routing.set("conv:tl", { sessionId: "s-tl", controlPort: 0, pid: 348 });
      const stTl = streamerOf("conv:tl");
      stTl.channelId = "chan-tl";
      stTl.triggerChannelId = "parent-tl";
      stTl.triggerMessageId = "trig-tl";
      stTl.pendingAck = true;
      await onBeaconEvent("s-tl", "busy", { busy: true });
      // the incident shape: the turn's FIRST assistant message is a tool call — its
      // stream is textless and its message end carries no text block
      await onBeaconEvent("s-tl", "message_update", { text: "" }); // tool-call streaming: no text block, no preview
      await onBeaconEvent("s-tl", "message_end", { text: "" }); // the tool-call message end
      await new Promise((r) => setTimeout(r, 150)); // nothing async should have fired — give any bug a moment to speak
      check(
        "reack: a textless (tool-call) message end acks NOTHING mid-turn — no reaction touches the trigger, the ack stays owed",
        reactions.every((r) => r.messageId !== "trig-tl") &&
          stTl.pendingAck === true,
        JSON.stringify({
          reactions: reactions.filter((r) => r.messageId === "trig-tl"),
          pendingAck: stTl.pendingAck,
        }),
      );
      await onBeaconEvent("s-tl", "message_update", {
        text: "the reply streams after the tool call",
      }); // the text message
      await stTl.creating;
      check(
        "reack: the text message after the tool call streams a preview in the channel",
        stTl.previewId != null,
        JSON.stringify({ previewId: stTl.previewId }),
      );
      await onBeaconEvent("s-tl", "message_end", {
        text: "the reply that lands after the tool call",
      }); // the text message end -> finalize
      const tlOk = await until(() =>
        reactions.some(
          (r) =>
            r.op === "PUT" && r.emoji === "✅" && r.messageId === "trig-tl",
        ),
      );
      check(
        "reack: the delivered turn after a mid-turn tool call ends ✅ ONLY — never a PUT ⚠️ beside the ✅ (the incident)",
        tlOk &&
          !reactions.some(
            (r) =>
              r.op === "PUT" && r.emoji === "⚠️" && r.messageId === "trig-tl",
          ) &&
          reactions.some(
            (r) =>
              r.op === "DELETE" &&
              r.emoji === "👀" &&
              r.messageId === "trig-tl",
          ),
        JSON.stringify(reactions.filter((r) => r.messageId === "trig-tl")),
      );
      routing.delete("conv:tl");
      streamers.delete("conv:tl");
    }
    // (T2 completion) a tool-ONLY turn (no text message at all): nothing landed — the
    // ack resolves at busy:false with ⚠️, never a stranded 👀 (reviewer finding,
    // relocated from the textless message_end branch that used to misfire mid-turn)
    {
      routing.set("conv:tlo", { sessionId: "s-tlo", controlPort: 0, pid: 349 });
      const stTo = streamerOf("conv:tlo");
      stTo.channelId = "chan-tlo";
      stTo.triggerChannelId = "parent-tlo";
      stTo.triggerMessageId = "trig-tlo";
      stTo.pendingAck = true;
      await onBeaconEvent("s-tlo", "busy", { busy: true });
      await onBeaconEvent("s-tlo", "message_end", { text: "" }); // tool-call message, no text
      await onBeaconEvent("s-tlo", "busy", { busy: false }); // turn over — nothing landed
      const toFail = await until(() =>
        reactions.some(
          (r) =>
            r.op === "PUT" && r.emoji === "⚠️" && r.messageId === "trig-tlo",
        ),
      );
      check(
        "reack: a tool-only turn resolves ⚠️ at turn end (busy:false) — no stranded 👀",
        toFail &&
          stTo.pendingAck === false &&
          stTo.busy === false &&
          !reactions.some(
            (r) =>
              r.op === "PUT" && r.emoji === "✅" && r.messageId === "trig-tlo",
          ),
        JSON.stringify({
          pendingAck: stTo.pendingAck,
          reactions: reactions.filter((r) => r.messageId === "trig-tlo"),
        }),
      );
      routing.delete("conv:tlo");
      streamers.delete("conv:tlo");
    }
  }
  // ---- 4c-bis. terminal delivered verdict (production 2026-09-27 ⚠️-beside-✅): once
  // a turn resolves, NO later event may downgrade or re-resolve it. The incident: the
  // agent_end (busy:false) raced finalize's delivery awaits, the settle fired
  // ackFinal(false) CONCURRENTLY with finalize's delivered swap (pendingAck clears
  // only after the awaits), the paced stale-mark cleanups crossed, and the ⚠️ PUT
  // 429'd into its 5s delayed retry — landing BESIDE the ✅. Finalize now owns the
  // verdict while in flight, the resolved verdict is inert-proof, and every late
  // event is a logged no-op. ----
  {
    routing.set("conv:term", { sessionId: "s-term", controlPort: 0, pid: 360 });
    const stT4 = streamerOf("conv:term");
    stT4.channelId = "chan-term";
    stT4.triggerChannelId = "parent-term";
    stT4.triggerMessageId = "trig-term";
    stT4.pendingAck = true;
    stT4.busy = true;
    // (a1) the production race itself: the agent_end landing while finalize is
    // parked inside its delivery awaits
    const realEditT4 = rest.editMessage;
    let releaseT4;
    const gateT4 = new Promise((r) => (releaseT4 = r));
    rest.editMessage = async (channelId, messageId, content) => {
      if (content === "the raced reply") await gateT4;
      return realEditT4(channelId, messageId, content);
    }; // park finalize's chunk-1 edit mid-delivery
    const origErrT4 = console.error;
    const capturedT4 = [];
    console.error = (...a) => capturedT4.push(a.join(" ")); // log() dereferences console.error at call time
    let finT4;
    try {
      await onBeaconEvent("s-term", "message_update", {
        text: "the raced reply streaming",
      }); // the preview
      await stT4.creating;
      finT4 = onBeaconEvent("s-term", "message_end", {
        text: "the raced reply",
      }); // finalize parks on the gated chunk-1 edit
      await new Promise((r) => setTimeout(r, 50)); // finalize is inside its delivery awaits
      await onBeaconEvent("s-term", "busy", { busy: false }); // the agent_end lands MID-finalize — the production trigger
      await new Promise((r) => setTimeout(r, 400)); // a buggy concurrent fail swap would have landed its ⚠️ by now (pace ~350ms)
      const stoodDown = capturedT4.some((l) =>
        l.includes("busy:false while finalize is in flight"),
      );
      releaseT4();
      await finT4;
      check(
        "term: the mid-finalize agent_end (busy:false) stands down — finalize owns the verdict, exactly one resolution (the ⚠️-beside-✅ race closed)",
        stoodDown &&
          stT4.pendingAck === false &&
          stT4.resolved?.ok === true &&
          stT4.resolved.ch === "parent-term" &&
          stT4.resolved.mid === "trig-term",
        JSON.stringify({
          stoodDown,
          pendingAck: stT4.pendingAck,
          resolved: stT4.resolved,
        }),
      );
      if (loadConfig().reactions) {
        check(
          "term: the mid-finalize agent_end NEVER fires its own fail swap — ✅ only, no ⚠️ beside it",
          (await until(() =>
            reactions.some(
              (r) =>
                r.op === "PUT" &&
                r.emoji === "✅" &&
                r.messageId === "trig-term",
            ),
          )) &&
            !reactions.some(
              (r) =>
                r.op === "PUT" &&
                r.emoji === "⚠️" &&
                r.messageId === "trig-term",
            ) &&
            reactions.filter(
              (r) =>
                r.op === "DELETE" &&
                r.emoji === "👀" &&
                r.messageId === "trig-term",
            ).length === 1, // the old code's settle would have fired a SECOND 👀 strip + a ⚠️ PUT
          JSON.stringify(
            reactions
              .filter((r) => r.messageId === "trig-term")
              .map((r) => `${r.op}:${r.emoji}`),
          ),
        );
      }
      // (a2) late events on the RESOLVED turn — each a logged no-op, the verdict inert-proof
      const t4ReactBefore = reactions.length;
      await onBeaconEvent("s-term", "busy", { busy: false }); // a late/duplicate agent_end after the verdict
      await onBeaconEvent("s-term", "message_end", { text: "" }); // a stale textless message_end replay
      process.env.DISCORD_TURN_TIMEOUT_MS = "40"; // the watchdog window, driven tiny
      armTurnTimer("conv:term"); // re-arm exactly like a late stream event would
      await new Promise((r) => setTimeout(r, 150)); // the watchdog fires on the resolved turn
      delete process.env.DISCORD_TURN_TIMEOUT_MS;
      check(
        "term: late busy:false / textless message_end / watchdog on a resolved turn are ALL no-ops — the delivered verdict survives untouched, each event logs its anomaly",
        stT4.resolved?.ok === true &&
          stT4.pendingAck === false &&
          stT4.busy === false &&
          stT4.turnTimer == null &&
          capturedT4.some((l) =>
            l.includes("late busy:false on a turn already resolved"),
          ) &&
          capturedT4.some((l) =>
            l.includes("late textless message_end on a turn already resolved"),
          ) &&
          capturedT4.some(
            (l) =>
              l.includes("late failTurn") && l.includes("already resolved"),
          ),
        JSON.stringify({
          resolved: stT4.resolved,
          anomalies: capturedT4.filter((l) => l.includes("ANOMALY")).length,
        }),
      );
      if (loadConfig().reactions) {
        check(
          "term: no late event downgrades the delivered trigger — zero new reaction ops, no ⚠️ ever, the ✅ stands alone",
          reactions.length === t4ReactBefore &&
            !reactions.some(
              (r) =>
                r.op === "PUT" &&
                r.emoji === "⚠️" &&
                r.messageId === "trig-term",
            ) &&
            reactions.some(
              (r) =>
                r.op === "PUT" &&
                r.emoji === "✅" &&
                r.messageId === "trig-term",
            ),
          JSON.stringify(
            reactions.slice(t4ReactBefore).map((r) => `${r.op}:${r.emoji}`),
          ),
        );
      }
    } finally {
      console.error = origErrT4;
      for (const l of capturedT4) console.error(l); // re-emit EVERYTHING the window swallowed
      rest.editMessage = realEditT4;
      routing.delete("conv:term");
      streamers.delete("conv:term");
    }
    // (c) identical-preview finalize skip (#4): a short reply whose last preview
    // delta is byte-identical to the final text — the chunk-1 edit is skipped
    // (production UX nit: "edited the message for no reason"); the preview message
    // simply stays, and the delivered verdict still resolves
    {
      routing.set("conv:ident", {
        sessionId: "s-ident",
        controlPort: 0,
        pid: 361,
      });
      const stId = streamerOf("conv:ident");
      stId.channelId = "chan-ident";
      stId.triggerChannelId = "parent-ident";
      stId.triggerMessageId = "trig-ident";
      stId.pendingAck = true;
      stId.busy = true;
      await onBeaconEvent("s-ident", "message_update", {
        text: "short and final",
      }); // the preview lands with the exact final text
      await stId.creating;
      const identEdits = edits.length;
      const identSends = sent.filter(
        (s) => s.channelId === "chan-ident",
      ).length;
      await onBeaconEvent("s-ident", "message_end", {
        text: "short and final",
      }); // byte-identical finalize
      await new Promise((r) => setTimeout(r, 150)); // any edit/send would be recorded by now
      check(
        "final: a byte-identical preview is never re-edited at finalize — the preview message simply stays (no '(edited)' for no reason)",
        edits.length === identEdits &&
          sent.filter((s) => s.channelId === "chan-ident").length ===
            identSends &&
          stId.resolved?.ok === true &&
          stId.previewShown == null,
        JSON.stringify({
          newEdits: edits.length - identEdits,
          newSends:
            sent.filter((s) => s.channelId === "chan-ident").length -
            identSends,
          resolved: stId.resolved,
        }),
      );
      routing.delete("conv:ident");
      streamers.delete("conv:ident");
    }
  }
  // ---- 4c-ter. turn tokens (production 2026-09-28 under-ack): dispatch(N+1)
  // landing mid-finalize(N) bumps the turn token; finalize(N)'s tail — parked
  // behind its delivery awaits — used to clobber the fresh pendingAck=true,
  // stranding the new turn's 👀 (under-ack only, never over-ack). Three orderings:
  // (a) the tail resuming AFTER the dispatch, (b) a tool-only N+1 settling
  // DURING the older finalize, (c) the normal single-turn flow unchanged. ----
  {
    // (a) the clobber, closed: the tail write is skipped with the anomaly line,
    // N+1's pendingAck SURVIVES, and N's verdict still lands on ITS trigger
    routing.set("conv:tok", { sessionId: "s-tok", controlPort: 0, pid: 380 });
    const stTok = streamerOf("conv:tok");
    stTok.channelId = "chan-tok";
    stTok.triggerChannelId = "parent-tok";
    stTok.triggerMessageId = "trig-tok-1";
    stTok.pendingAck = true;
    stTok.busy = true;
    const realEditTok = rest.editMessage;
    let releaseTok;
    const gateTok = new Promise((r) => (releaseTok = r));
    rest.editMessage = async (channelId, messageId, content) => {
      if (content === "turn one final") await gateTok;
      return realEditTok(channelId, messageId, content);
    }; // park finalize mid-delivery
    const origErrTok = console.error;
    const capturedTok = [];
    console.error = (...a) => capturedTok.push(a.join(" ")); // log() dereferences console.error at call time
    let finTok;
    try {
      await onBeaconEvent("s-tok", "message_update", {
        text: "turn one preview",
      }); // turn N's preview
      await stTok.creating;
      finTok = onBeaconEvent("s-tok", "message_end", {
        text: "turn one final",
      }); // finalize(N) parks on the gated chunk-1 edit
      await new Promise((r) => setTimeout(r, 50));
      routing.delete("conv:tok"); // the dispatch below must take the no-route path — no beacon call, no dead-beacon failTurn
      await dispatchToConversation(
        "conv:tok",
        "chan-tok",
        "parent-tok",
        "trig-tok-2",
        "turn two ask",
        "u1",
      ); // dispatch(N+1): the REAL re-anchor + token bump
      routing.set("conv:tok", { sessionId: "s-tok", controlPort: 0, pid: 380 }); // events flow again
      check(
        "token: dispatch(N+1) landing mid-finalize(N) re-anchors, bumps the token, and opens a fresh ack debt",
        stTok.pendingAck === true &&
          stTok.resolved === null &&
          stTok.triggerMessageId === "trig-tok-2" &&
          turnTokenOf(stTok) === 1 &&
          stTok.finalizing > 0,
        JSON.stringify({
          pendingAck: stTok.pendingAck,
          resolved: stTok.resolved,
          token: turnTokenOf(stTok),
          finalizing: stTok.finalizing,
        }),
      );
      releaseTok(); // finalize(N)'s tail resumes under the NEW token
      await finTok;
      check(
        "token: finalize(N)'s stale tail is SKIPPED with the anomaly line — N+1's pendingAck SURVIVES the old clobber",
        stTok.pendingAck === true &&
          stTok.resolved === null &&
          capturedTok.filter((l) => l.includes("stale turn token")).length ===
            1 &&
          capturedTok.some(
            (l) =>
              l.includes("stale turn token") &&
              l.includes("write skipped (0 vs 1)"),
          ),
        JSON.stringify({
          pendingAck: stTok.pendingAck,
          resolved: stTok.resolved,
          staleLogs: capturedTok.filter((l) => l.includes("stale turn token")),
        }),
      );
      if (loadConfig().reactions) {
        check(
          "token: the skipped tail still resolves ITS OWN trigger — ✅ lands on turn N's captured anchor, never a dropped verdict",
          (await until(() =>
            reactions.some(
              (r) =>
                r.op === "PUT" &&
                r.emoji === "✅" &&
                r.messageId === "trig-tok-1",
            ),
          )) &&
            !reactions.some(
              (r) =>
                r.op === "PUT" &&
                r.emoji === "⚠️" &&
                r.messageId === "trig-tok-1",
            ),
          JSON.stringify(
            reactions
              .filter((r) => r.messageId === "trig-tok-1")
              .map((r) => `${r.op}:${r.emoji}`),
          ),
        );
      }
      await onBeaconEvent("s-tok", "busy", { busy: false }); // N+1 ends tool-only AFTER the tail — the SURVIVING debt must resolve
      check(
        "token: the surviving pendingAck resolves — a tool-only N+1 after a mid-finalize N acks ⚠️ on its OWN trigger (the under-ack witness)",
        stTok.pendingAck === false &&
          stTok.resolved?.ok === false &&
          stTok.resolved?.mid === "trig-tok-2" &&
          stTok.resolved?.ch === "parent-tok",
        JSON.stringify({
          pendingAck: stTok.pendingAck,
          resolved: stTok.resolved,
        }),
      );
      if (loadConfig().reactions) {
        check(
          "token: the witness ⚠️ PUT lands on trig-tok-2 — the settled verdict is visible on its trigger",
          await until(() =>
            reactions.some(
              (r) =>
                r.op === "PUT" &&
                r.emoji === "⚠️" &&
                r.messageId === "trig-tok-2",
            ),
          ),
          JSON.stringify(
            reactions
              .filter((r) => r.messageId === "trig-tok-2")
              .map((r) => `${r.op}:${r.emoji}`),
          ),
        );
      }
    } finally {
      console.error = origErrTok;
      for (const l of capturedTok) console.error(l); // re-emit EVERYTHING the window swallowed
      rest.editMessage = realEditTok;
      routing.delete("conv:tok");
      streamers.delete("conv:tok");
      ledger.delete("conv:tok");
    }
    // (b) the witness ordering: N+1 is tool-only and its busy:false lands WHILE
    // finalize(N) still delivers — the settle must NOT stand down behind an
    // OLDER turn's finalize (the ownership window is turn-scoped now)
    {
      routing.set("conv:tok2", {
        sessionId: "s-tok2",
        controlPort: 0,
        pid: 381,
      });
      const stTk = streamerOf("conv:tok2");
      stTk.channelId = "chan-tk";
      stTk.triggerChannelId = "parent-tk";
      stTk.triggerMessageId = "trig-tk-1";
      stTk.pendingAck = true;
      stTk.busy = true;
      const realEditTk = rest.editMessage;
      let releaseTk;
      const gateTk = new Promise((r) => (releaseTk = r));
      rest.editMessage = async (channelId, messageId, content) => {
        if (content === "tk final") await gateTk;
        return realEditTk(channelId, messageId, content);
      };
      const origErrTk = console.error;
      const capTk = [];
      console.error = (...a) => capTk.push(a.join(" "));
      let finTk;
      try {
        await onBeaconEvent("s-tok2", "message_update", { text: "tk preview" });
        await stTk.creating;
        finTk = onBeaconEvent("s-tok2", "message_end", { text: "tk final" }); // finalize(N) parks mid-delivery
        await new Promise((r) => setTimeout(r, 50));
        routing.delete("conv:tok2");
        await dispatchToConversation(
          "conv:tok2",
          "chan-tk",
          "parent-tk",
          "trig-tk-2",
          "second ask",
          "u1",
        ); // token bumped to 1
        routing.set("conv:tok2", {
          sessionId: "s-tok2",
          controlPort: 0,
          pid: 381,
        });
        await onBeaconEvent("s-tok2", "busy", { busy: false }); // N+1 is TOOL-ONLY — its agent_end lands while finalize(N) is still parked
        check(
          "token: a tool-only N+1's busy:false does NOT stand down behind an OLDER turn's finalize — it resolves its own trigger immediately",
          stTk.pendingAck === false &&
            stTk.resolved?.ok === false &&
            stTk.resolved?.mid === "trig-tk-2" &&
            !capTk.some((l) => l.includes("stands down")),
          JSON.stringify({
            pendingAck: stTk.pendingAck,
            resolved: stTk.resolved,
            stoodDown: capTk.filter((l) => l.includes("stands down")).length,
          }),
        );
        releaseTk(); // finalize(N)'s tail resumes — stale now
        await finTk;
        check(
          "token: finalize(N)'s tail then skips stale — the witness verdict on trig-tk-2 SURVIVES the delivery finishing",
          stTk.resolved?.ok === false &&
            stTk.resolved?.mid === "trig-tk-2" &&
            capTk.filter((l) => l.includes("stale turn token")).length === 1 &&
            capTk.some((l) => l.includes("write skipped (0 vs 1)")),
          JSON.stringify({
            resolved: stTk.resolved,
            staleLogs: capTk.filter((l) => l.includes("stale turn token")),
          }),
        );
        if (loadConfig().reactions) {
          check(
            "token: both verdicts land on their OWN triggers — ✅ on N's captured anchor, ⚠️ on N+1's, no cross-turn PUTs",
            (await until(
              () =>
                reactions.some(
                  (r) =>
                    r.op === "PUT" &&
                    r.emoji === "✅" &&
                    r.messageId === "trig-tk-1",
                ) &&
                reactions.some(
                  (r) =>
                    r.op === "PUT" &&
                    r.emoji === "⚠️" &&
                    r.messageId === "trig-tk-2",
                ),
            )) &&
              !reactions.some(
                (r) =>
                  r.op === "PUT" &&
                  r.emoji === "⚠️" &&
                  r.messageId === "trig-tk-1",
              ) &&
              !reactions.some(
                (r) =>
                  r.op === "PUT" &&
                  r.emoji === "✅" &&
                  r.messageId === "trig-tk-2",
              ),
            JSON.stringify({
              n: reactions
                .filter((r) => r.messageId === "trig-tk-1")
                .map((r) => `${r.op}:${r.emoji}`),
              n1: reactions
                .filter((r) => r.messageId === "trig-tk-2")
                .map((r) => `${r.op}:${r.emoji}`),
            }),
          );
        }
      } finally {
        console.error = origErrTk;
        for (const l of capTk) console.error(l);
        rest.editMessage = realEditTk;
        routing.delete("conv:tok2");
        streamers.delete("conv:tok2");
        ledger.delete("conv:tok2");
      }
    }
    // (c) the normal single-turn flow: token matches end to end, no anomaly, the
    // delivered verdict resolves exactly as before (the guard never misfires)
    {
      await dispatchToConversation(
        "conv:tok3",
        "chan-tk3",
        "parent-tk3",
        "trig-tk3",
        "hello",
        "u1",
      ); // no route yet — hermetic; the REAL dispatch opens the turn (token 1)
      routing.set("conv:tok3", {
        sessionId: "s-tok3",
        controlPort: 0,
        pid: 382,
      }); // events route from here
      const stTk3 = streamers.get("conv:tok3");
      const origErrTk3 = console.error;
      const capTk3 = [];
      console.error = (...a) => capTk3.push(a.join(" "));
      try {
        await onBeaconEvent("s-tok3", "busy", { busy: true });
        await onBeaconEvent("s-tok3", "message_update", {
          text: "flowing preview",
        });
        await stTk3.creating;
        await onBeaconEvent("s-tok3", "message_end", {
          text: "the whole reply",
        });
        await onBeaconEvent("s-tok3", "busy", { busy: false }); // after the verdict — the existing resolved-match no-op
        check(
          "token: the normal single-turn flow is UNCHANGED — token matches end to end, no stale-write anomaly, the verdict resolves delivered",
          stTk3.pendingAck === false &&
            stTk3.resolved?.ok === true &&
            stTk3.resolved?.mid === "trig-tk3" &&
            turnTokenOf(stTk3) === 1 &&
            capTk3.every((l) => !l.includes("stale turn token")),
          JSON.stringify({
            resolved: stTk3.resolved,
            pendingAck: stTk3.pendingAck,
            token: turnTokenOf(stTk3),
            staleLogs: capTk3.filter((l) => l.includes("stale turn token"))
              .length,
          }),
        );
      } finally {
        console.error = origErrTk3;
        for (const l of capTk3) console.error(l);
        routing.delete("conv:tok3");
        streamers.delete("conv:tok3");
        ledger.delete("conv:tok3");
      }
    }
  }
  // the env gate kills the ack without touching delivery — exercised in both the on and off runs
  const reactionsEnvPrev = process.env.DISCORD_REACTIONS;
  process.env.DISCORD_REACTIONS = "false";
  routing.set("conv:react-off", {
    sessionId: "s-react-off",
    controlPort: 0,
    pid: 340,
  });
  const stOff = streamerOf("conv:react-off");
  stOff.channelId = "chan-react-off";
  stOff.triggerChannelId = "parent-react-off";
  stOff.triggerMessageId = "trig-react-off";
  const rOff = reactions.length;
  await onBeaconEvent("s-react-off", "message_end", {
    text: "silent but delivered",
  });
  check(
    "reack: DISCORD_REACTIONS=false — the reply still lands, zero reaction calls",
    reactions.length === rOff &&
      sent.some(
        (s) =>
          s.channelId === "chan-react-off" &&
          s.content === "silent but delivered",
      ),
    JSON.stringify(reactions.slice(rOff)),
  );
  routing.delete("conv:react-off");
  streamers.delete("conv:react-off");
  if (reactionsEnvPrev === undefined) delete process.env.DISCORD_REACTIONS;
  else process.env.DISCORD_REACTIONS = reactionsEnvPrev; // restore — a shell-provided gate must survive the smoke

  // ---- 4c-2. first-response deeplink (delivery-UX round 2, 2026-09-24 operator
  // feedback): the FIRST finalized reply of a conversation appends the webui
  // "view this conversation" line once; later replies stay clean; the knob and
  // an unset webui_base_url gate it. The runner's webui_on variant is overridden
  // and restored — both variants prove the same behavior.
  {
    const wuiPrevF = process.env.DISCORD_WEBUI_BASE_URL;
    process.env.DISCORD_WEBUI_BASE_URL = "http://127.0.0.1:8788"; // deterministic — the live config may differ per variant
    routing.set("conv:flink", {
      sessionId: "s-flink",
      controlPort: 0,
      pid: 372,
    });
    ledger.set("conv:flink", {
      sessionId: "sess-flink-1",
      cwd: "/tmp",
      channel_id: "chan-flink",
      created: nowIso(),
      lastActive: nowIso(),
    });
    const stF = streamerOf("conv:flink");
    stF.channelId = "chan-flink";
    stF.triggerMessageId = "trig-flink";
    const flinkBase = sent.filter((s) => s.channelId === "chan-flink").length;
    await onBeaconEvent("s-flink", "message_end", { text: "the first reply" });
    const flink1 = sent
      .filter((s) => s.channelId === "chan-flink")
      .slice(flinkBase);
    check(
      "flink: the FIRST finalized reply of a conversation appends the webui deeplink line (the /status link format)",
      flink1.length === 1 &&
        flink1[0].content ===
          "the first reply\n\nview this conversation: http://127.0.0.1:8788#/s/sess-flink-1",
      JSON.stringify(flink1.map((s) => s.content)),
    );
    check(
      "flink: the ledger row reserves the one-shot (firstLinkShown)",
      ledger.get("conv:flink")?.firstLinkShown === true,
      JSON.stringify(ledger.get("conv:flink")),
    );
    const flinkBase2 = sent.filter((s) => s.channelId === "chan-flink").length;
    await onBeaconEvent("s-flink", "message_end", { text: "the second reply" });
    const flink2 = sent
      .filter((s) => s.channelId === "chan-flink")
      .slice(flinkBase2);
    check(
      "flink: subsequent replies carry NO link — the first-response line never repeats",
      flink2.length === 1 && flink2[0].content === "the second reply",
      JSON.stringify(flink2.map((s) => s.content)),
    );
    process.env.DISCORD_FIRST_RESPONSE_LINK = "false";
    const flinkBase3 = sent.filter((s) => s.channelId === "chan-flink").length;
    await onBeaconEvent("s-flink", "message_end", {
      text: "the knob-off reply",
    });
    const flink3 = sent
      .filter((s) => s.channelId === "chan-flink")
      .slice(flinkBase3);
    check(
      "flink: first_response_link=false appends nothing",
      flink3.length === 1 && flink3[0].content === "the knob-off reply",
      JSON.stringify(flink3.map((s) => s.content)),
    );
    delete process.env.DISCORD_FIRST_RESPONSE_LINK;
    // the long-tail twin: a first reply whose last chunk has no room for the line -> the link posts as one extra message
    ledger.set("conv:flink2", {
      sessionId: "sess-flink-2",
      cwd: "/tmp",
      channel_id: "chan-flink2",
      created: nowIso(),
      lastActive: nowIso(),
    });
    routing.set("conv:flink2", {
      sessionId: "s-flink2",
      controlPort: 0,
      pid: 373,
    });
    const stF2 = streamerOf("conv:flink2");
    stF2.channelId = "chan-flink2";
    stF2.triggerMessageId = "trig-flink2";
    const f2Base = sent.filter((s) => s.channelId === "chan-flink2").length;
    await onBeaconEvent("s-flink2", "message_end", {
      text: "z".repeat(1900) + "\n" + "y".repeat(1890),
    });
    const f2Posts = sent
      .filter((s) => s.channelId === "chan-flink2")
      .slice(f2Base);
    check(
      "flink: a full last chunk sends the link as ONE extra message (the block's final post)",
      f2Posts.length === 3 &&
        f2Posts[0].content === "z".repeat(1900) &&
        f2Posts[1].content === "\n" + "y".repeat(1890) &&
        f2Posts[2].content ===
          "view this conversation: http://127.0.0.1:8788#/s/sess-flink-2",
      JSON.stringify(
        f2Posts.map((s) => [String(s.content).slice(0, 24), s.content.length]),
      ),
    );
    // webui_base_url unset -> nothing, even on the very first reply. Ambient like
    // the session-death notice gate: the live config may carry a base the runner's
    // env does not override — both states prove their half deterministically.
    delete process.env.DISCORD_WEBUI_BASE_URL; // the deterministic checks above used the override; this one reads whatever the live run resolves
    const f3BaseSet = !!loadConfig().webui_base_url;
    ledger.set("conv:flink3", {
      sessionId: "sess-flink-3",
      cwd: "/tmp",
      channel_id: "chan-flink3",
      created: nowIso(),
      lastActive: nowIso(),
    });
    routing.set("conv:flink3", {
      sessionId: "s-flink3",
      controlPort: 0,
      pid: 374,
    });
    const stF3 = streamerOf("conv:flink3");
    stF3.channelId = "chan-flink3";
    stF3.triggerMessageId = "trig-flink3";
    const f3Base = sent.filter((s) => s.channelId === "chan-flink3").length;
    await onBeaconEvent("s-flink3", "message_end", {
      text: "first reply, no webui base",
    });
    const f3Posts = sent
      .filter((s) => s.channelId === "chan-flink3")
      .slice(f3Base);
    check(
      "flink: the link follows the RESOLVED webui_base_url (unset -> first reply carries NO link; a live base -> it does, same one-shot)",
      f3Posts.length === 1 &&
        (f3BaseSet
          ? String(f3Posts[0].content).includes("view this conversation: ")
          : f3Posts[0].content === "first reply, no webui base"),
      JSON.stringify({
        baseSet: f3BaseSet,
        posts: f3Posts.map((s) => s.content),
      }),
    );
    if (wuiPrevF === undefined) delete process.env.DISCORD_WEBUI_BASE_URL;
    else process.env.DISCORD_WEBUI_BASE_URL = wuiPrevF; // restore — the runner's variant env must survive
    for (const k of ["conv:flink", "conv:flink2", "conv:flink3"]) {
      routing.delete(k);
      ledger.delete(k);
      streamers.delete(k);
    }
  }

  // ---- 4d. typing continuity: 8s interval, the failure counter speaks once per 5 ----
  check(
    "typing: interval is 8s — the ~10s indicator expiry never lapses",
    TYPING_INTERVAL_MS === 8000,
    String(TYPING_INTERVAL_MS),
  );
  {
    process.env.DISCORD_TYPING_INTERVAL_MS = "25"; // the smoke drives the counter fast — the production interval is asserted above
    const realTyping = rest.typing;
    let ticks = 0;
    rest.typing = async () => {
      ticks++;
      throw new RestError(0, "dead typing endpoint");
    }; // silent-but-dying: the counter must still speak
    const origErr = console.error;
    const captured = [];
    console.error = (...a) => captured.push(a.join(" ")); // log() dereferences console.error at call time
    try {
      routing.set("conv:type", {
        sessionId: "s-type",
        controlPort: 0,
        pid: 341,
      });
      const stT = streamerOf("conv:type");
      stT.channelId = "chan-type";
      stT.triggerMessageId = "trig-type";
      await onBeaconEvent("s-type", "busy", { busy: true }); // immediate tick + interval ticks, all failing
      await new Promise((r) => setTimeout(r, 200)); // >= 6 failing ticks
      await onBeaconEvent("s-type", "busy", { busy: false });
    } finally {
      console.error = origErr;
      rest.typing = realTyping;
      delete process.env.DISCORD_TYPING_INTERVAL_MS;
      routing.delete("conv:type");
      streamers.delete("conv:type");
    }
    const typeLogs = captured.filter((l) =>
      l.includes("typing indicator failing"),
    );
    check(
      "typing: consecutive failures log once every 5 (1st, 6th, …) — never per-failure",
      ticks >= 6 &&
        typeLogs.length === Math.floor((ticks - 1) / 5) + 1 &&
        typeLogs.every((l, i) => l.includes(`(${i * 5 + 1} consecutive)`)),
      `ticks=${ticks} logs=${JSON.stringify(typeLogs)}`,
    );
  }

  check(
    "rl: every scripted outcome was consumed (no dead scenario setups)",
    scripted.length === 0,
    `left=${scripted.length}`,
  );
  delete process.env.DISCORD_PREVIEW_BACKOFF_MS;
  for (const k of [
    "conv:rl",
    "conv:rl2",
    "conv:pace",
    "conv:ref",
    "conv:gone",
    "conv:cf",
  ]) {
    routing.delete(k);
    streamers.delete(k);
  }

  // ---- 5. control port round trip over real loopback HTTP ----
  const ctlPort = await new Promise((resolve) =>
    control.listen(0, "127.0.0.1", () => resolve(control.address().port)),
  );
  const ctl = (p, opt = {}) =>
    fetch(`http://127.0.0.1:${ctlPort}${p}`, {
      signal: AbortSignal.timeout(3000),
      ...opt,
    });
  const hdr = { "content-type": "application/json", "x-prime-token": TOKEN };
  let resp = await ctl("/healthz");
  check("control: /healthz answers 200", resp.status === 200);
  let body = await resp.json();
  check(
    "control: /healthz reports gateway state",
    body.ok === true && typeof body.gateway === "string",
  );
  resp = await ctl("/internal/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "x", controlPort: 1 }),
  });
  check(
    "control: register without token is 401 (fail-closed)",
    resp.status === 401,
  );
  // ---- 5a. inbound control audit (send-route-audit lap): 401s always, per-request lines, register first-seen + 10-min sampling ----
  {
    const cap = [];
    const origErr = console.error;
    console.error = (...a) => cap.push(a.join(" ")); // log() dereferences console.error at call time
    let status401 = 0;
    try {
      status401 = (
        await ctl("/internal/event", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: "audit-x",
            event: "busy",
            data: {},
          }),
        })
      ).status; // the wrong-token probe
      resp = await ctl("/internal/register", {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({
          sessionId: "audit-hb",
          controlPort: 7777,
          sessionToken: "tok-audit-hb",
          status: "idle",
        }),
      });
      resp = await ctl("/internal/register", {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({
          sessionId: "audit-hb",
          controlPort: 7777,
          sessionToken: "tok-audit-hb",
          status: "idle",
        }),
      }); // heartbeat re-register inside the window
      regAuditAt.set("audit-hb", Date.now() - 11 * 60 * 1000); // backdate past the sample window — the next heartbeat logs again
      resp = await ctl("/internal/register", {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({
          sessionId: "audit-hb",
          controlPort: 7777,
          sessionToken: "tok-audit-hb",
          status: "idle",
        }),
      });
      resp = await ctl("/internal/event", {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({
          sessionId: "audit-hb",
          event: "busy",
          data: { busy: true },
        }),
      });
      resp = await ctl("/internal/unregister", {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({ sessionId: "audit-hb" }),
      });
    } finally {
      console.error = origErr;
    }
    const alines = cap.filter((l) => l.includes("audit route="));
    check(
      "audit: every /internal 401 logs the auth-fail line (fail-closed AND visible — tokenSource=none, src, bytes)",
      status401 === 401 &&
        alines.some(
          (l) =>
            l.includes("route=/internal/event") &&
            l.includes("auth=fail") &&
            l.includes("outcome=401") &&
            l.includes("tokenSource=none") &&
            /src=127\.0\.0\.1:\d+/.test(l),
        ),
      JSON.stringify(alines.filter((l) => l.includes("auth=fail"))),
    );
    const regLines = alines.filter(
      (l) =>
        l.includes("route=/internal/register") &&
        l.includes("sessionId=audit-hb"),
    );
    check(
      "audit: register audit is first-seen + 10-min sampled — the in-window heartbeat stays silent (2 lines across first/heartbeat/backdated)",
      regLines.length === 2 &&
        regLines.every(
          (l) =>
            l.includes("tokenSource=" + TOKEN_SOURCE) && /bytes=\d+/.test(l),
        ),
      JSON.stringify(regLines),
    );
    check(
      "audit: /internal/event and /internal/unregister log one line per request (event name + unregistered ride outcome)",
      alines.some(
        (l) =>
          l.includes("route=/internal/event") &&
          l.includes("auth=ok") &&
          l.includes("outcome=busy") &&
          /bytes=\d+/.test(l),
      ) &&
        alines.some(
          (l) =>
            l.includes("route=/internal/unregister") &&
            l.includes("outcome=unregistered"),
        ),
      JSON.stringify(
        alines.filter(
          (l) =>
            l.includes("/internal/event") || l.includes("/internal/unregister"),
        ),
      ),
    );
    sessions.delete("audit-hb");
    regAuditAt.delete("audit-hb");
  }
  // claim injection mirrors what spawnForConv builds in production (smoke never spawns)
  const claimFor = (convKey, o = {}) =>
    claims.set(convKey, {
      at: Date.now(),
      cwd: "/tmp",
      known: new Set(),
      sessionId: null,
      spawnPid: 4242,
      ...o,
    });
  const sFile = (n) => path.join(SESSIONS_DIR, n);
  // production shape 2026-09-24: the wrapper pid we spawn (4242) is NEVER the
  // beacon's pid (36904 — the daemon-tree worker) and routing must still happen
  claimFor("thread:smoke"); // fresh new-session spawn: snapshot empty, cwd /tmp, wrapper 4242
  resp = await ctl("/internal/register", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      sessionId: "tagged-1",
      controlPort: 1234,
      pid: 36904,
      convKey: "thread:smoke",
      name: "smoke",
      file: sFile("tagged-1.jsonl"),
      created: Date.now(),
      cwd: "/tmp",
      status: "idle",
    }),
  });
  body = await resp.json();
  check(
    "control: daemon-indirect register (beacon pid != wrapper pid) routes via the causal claim",
    resp.status === 200 &&
      body.routed === true &&
      routing.get("thread:smoke")?.sessionId === "tagged-1" &&
      routing.get("thread:smoke")?.pid === 36904 &&
      routing.get("thread:smoke")?.spawnPid === 4242,
  );
  resp = await ctl("/internal/register", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      sessionId: "subagent-1",
      controlPort: 1235,
      pid: 36999,
      convKey: "thread:smoke",
      file: path.join(
        os.homedir(),
        ".prime",
        "agent",
        "session-artifacts",
        "parent",
        "sub",
        "subagent-1.jsonl",
      ),
      created: Date.now(),
      cwd: "/tmp",
      status: "idle",
    }),
  }); // real subagent shape (verified live 2026-09-24: rlm children's session files live under session-artifacts/, OUTSIDE SESSIONS_DIR — an in-dir file is the worker-recovery branch shape, which the causal hand-over must TAKE
  body = await resp.json();
  check(
    "control: same-tag subagent (different sessionId, after the claim) stays display-only",
    resp.status === 200 &&
      body.routed === false &&
      routing.get("thread:smoke")?.sessionId === "tagged-1" &&
      String(body.reason ?? "").includes("claim holds session"),
    JSON.stringify(body.reason),
  );
  resp = await ctl("/internal/register", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      sessionId: "operator-1",
      controlPort: 1236,
      pid: process.pid,
      status: "idle",
    }),
  });
  body = await resp.json();
  check(
    "control: untagged register (operator session) stays display-only",
    resp.status === 200 && body.routed === false && sessions.has("operator-1"),
  );
  // claim fail-closed matrix: every wrong shape stays display-only (single-fault cases)
  const now = Date.now();
  claimFor("conv:known", { known: new Set([sFile("pre.jsonl")]) }); // the file predates the spawn
  claimFor("conv:old"); // session created before the spawn
  claimFor("conv:cwd", { cwd: "/elsewhere" }); // register on another cwd
  claimFor("conv:outside"); // file outside SESSIONS_DIR (subagent-session shape)
  claimFor("conv:nofile"); // degraded beacon: no session file
  let dr;
  dr = await onRegister({
    sessionId: "known-s",
    controlPort: 1,
    pid: 5001,
    convKey: "conv:known",
    file: sFile("pre.jsonl"),
    created: now,
    cwd: "/tmp",
    status: "idle",
  });
  check(
    "control: session file from the pre-spawn snapshot stays display-only (not new)",
    dr.body.routed === false &&
      String(dr.body.reason ?? "").includes("predates the spawn"),
    JSON.stringify(dr.body.reason),
  );
  dr = await onRegister({
    sessionId: "old-s",
    controlPort: 1,
    pid: 5002,
    convKey: "conv:old",
    file: sFile("old.jsonl"),
    created: now - 60000,
    cwd: "/tmp",
    status: "idle",
  });
  check(
    "control: session created before the spawn stays display-only (causal bound)",
    dr.body.routed === false &&
      String(dr.body.reason ?? "").includes("created before the spawn"),
    JSON.stringify(dr.body.reason),
  );
  dr = await onRegister({
    sessionId: "cwd-s",
    controlPort: 1,
    pid: 5003,
    convKey: "conv:cwd",
    file: sFile("cwd.jsonl"),
    created: now,
    cwd: "/other",
    status: "idle",
  });
  check(
    "control: register on a different cwd stays display-only",
    dr.body.routed === false &&
      String(dr.body.reason ?? "").includes("cwd mismatch"),
    JSON.stringify(dr.body.reason),
  );
  dr = await onRegister({
    sessionId: "out-s",
    controlPort: 1,
    pid: 5004,
    convKey: "conv:outside",
    file: "/somewhere/else/out.jsonl",
    created: now,
    cwd: "/tmp",
    status: "idle",
  });
  check(
    "control: session file outside SESSIONS_DIR stays display-only",
    dr.body.routed === false &&
      String(dr.body.reason ?? "").includes("outside SESSIONS_DIR"),
    JSON.stringify(dr.body.reason),
  );
  dr = await onRegister({
    sessionId: "nof-s",
    controlPort: 1,
    pid: 5005,
    convKey: "conv:nofile",
    created: now,
    cwd: "/tmp",
    status: "idle",
  });
  check(
    "control: register without a session file stays display-only",
    dr.body.routed === false &&
      String(dr.body.reason ?? "").includes("no session file"),
    JSON.stringify(dr.body.reason),
  );
  for (const k of [
    "conv:known",
    "conv:old",
    "conv:cwd",
    "conv:outside",
    "conv:nofile",
  ])
    claims.delete(k);
  // resume spawn: the claim links by its preset sessionId — no file needed, any pid
  claimFor("conv:s5", { known: null, sessionId: "s5-session", spawnPid: 5353 });
  resp = await ctl("/internal/register", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      sessionId: "s5-session",
      controlPort: 1237,
      pid: 5353,
      convKey: "conv:s5",
      status: "idle",
    }),
  });
  body = await resp.json();
  check(
    "control: second conversation routes too (resume claim, preset sessionId)",
    body.routed === true && routing.get("conv:s5")?.sessionId === "s5-session",
  );
  resp = await ctl("/internal/register", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      sessionId: "s5-other",
      controlPort: 1238,
      pid: 5353,
      convKey: "conv:s5",
      status: "idle",
    }),
  });
  body = await resp.json();
  check(
    "control: a different sessionId on a resumed conversation stays display-only",
    body.routed === false &&
      routing.get("conv:s5")?.sessionId === "s5-session" &&
      String(body.reason ?? "").includes("claim holds session"),
    JSON.stringify(body.reason),
  );
  resp = await ctl("/internal/event", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      sessionId: "s5-session",
      event: "busy",
      data: { busy: true },
    }),
  });
  check(
    "control: events from a routed session drive the streamer",
    streamers.get("conv:s5")?.busy === true,
    JSON.stringify({
      ...streamers.get("conv:s5"),
      turnTimer: streamers.get("conv:s5")?.turnTimer != null ? "<armed>" : null,
      typingTimer:
        streamers.get("conv:s5")?.typingTimer != null ? "<running>" : null,
    }),
  ); // turnTimer is a Timeout — never stringified raw (circular)
  resp = await ctl("/internal/unregister", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ sessionId: "s5-session" }),
  });
  check(
    "control: unregister clears that conversation's routing",
    routing.has("conv:s5") === false,
  );
  resp = await ctl("/internal/unregister", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ sessionId: "tagged-1" }),
  });
  check(
    "control: unregister clears routing",
    routing.has("thread:smoke") === false,
  );
  // heartbeat spam guard (review finding 4): beacons re-register every ~15s —
  // only the first register of a session may log; heartbeats stay silent
  {
    const origErr = console.error;
    const captured = [];
    console.error = (...a) => captured.push(a.join(" ")); // log() dereferences console.error at call time
    try {
      claimFor("thread:hb"); // fresh unclaimed spawn — this register CLAIMS it (first register logs)
      await onRegister({
        sessionId: "hb-routed",
        controlPort: 1239,
        pid: 7777,
        convKey: "thread:hb",
        file: sFile("hb-routed.jsonl"),
        created: Date.now(),
        cwd: "/tmp",
        status: "idle",
      });
      await onRegister({
        sessionId: "hb-routed",
        controlPort: 1239,
        pid: 7777,
        convKey: "thread:hb",
        file: sFile("hb-routed.jsonl"),
        created: Date.now(),
        cwd: "/tmp",
        status: "idle",
      }); // heartbeat re-register
      await onRegister({
        sessionId: "hb-plain",
        controlPort: 1240,
        status: "idle",
      });
      await onRegister({
        sessionId: "hb-plain",
        controlPort: 1240,
        status: "idle",
      }); // heartbeat re-register
    } finally {
      console.error = origErr;
    }
    const regLogs = captured.filter((l) => l.includes("registered"));
    check(
      "control: heartbeat re-register is silent after the first register (spam guard)",
      regLogs.length === 2,
      JSON.stringify(regLogs),
    );
    claims.delete("thread:hb");
    routing.delete("thread:hb");
    sessions.delete("hb-routed");
    sessions.delete("hb-plain");
  }
  // ---- 5a2. thread renames (hermes-catalog #10: the thread sidebar becomes the session index) ----
  {
    const trPrev = process.env.DISCORD_THREAD_RENAME;
    process.env.DISCORD_THREAD_RENAME = "true"; // force the feature on for this block — an ambient off-run still exercises the rename semantics (the 403/429 scenarios script failures a knob-off run would never consume)
    const reg = (sid, n, convKey, name) =>
      ctl("/internal/register", {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({
          sessionId: sid,
          controlPort: 1300 + n,
          pid: 61000 + n,
          convKey,
          name,
          file: sFile(`${sid}.jsonl`),
          created: Date.now(),
          cwd: "/tmp",
          status: "idle",
        }),
      });
    try {
      const base = chanPatches.length; // the thread:smoke register at the head of section 5 already fired one — count relative
      const names = () =>
        chanPatches.slice(base).map((c) => `${c.threadId}:${c.name}`);
      claimFor("thread:rn1");
      let r = await (
        await reg("rn-1", 1, "thread:rn1", "prime webui review")
      ).json();
      check(
        "rename: routed register PATCHes the thread with the registered session name",
        r.routed === true &&
          (await until(
            () =>
              chanPatches.slice(base).length === 1 &&
              chanPatches[base]?.threadId === "rn1" &&
              chanPatches[base]?.name === "prime webui review" &&
              chanPatches[base]?.body?.name === "prime webui review",
          )),
        `routed=${r.routed} patches=${JSON.stringify(names())}`,
      );
      r = await (
        await reg("rn-1", 1, "thread:rn1", "prime webui review")
      ).json(); // heartbeat re-register, same name (the beacon re-registers every ~15s)
      check(
        "rename: same-name heartbeat re-register PATCHes nothing (only-if-changed guard)",
        r.routed === true && chanPatches.slice(base).length === 1,
        `patches=${JSON.stringify(names())}`,
      );
      r = await (await reg("rn-1", 1, "thread:rn1", "renamed session")).json(); // the name changed at the source
      check(
        "rename: a name change at the source PATCHes the new name once",
        r.routed === true &&
          (await until(() => chanPatches.slice(base).length === 2)) &&
          chanPatches[base + 1]?.name === "renamed session",
        `patches=${JSON.stringify(names())}`,
      );
      check(
        "rename: thread names are sanitized (newlines collapse, @ strips, 100-char clamp, trim; empties and non-threads never fire)",
        threadNameSlice("a\nb\r\nc") === "a b c" &&
          threadNameSlice("@everyone come look") === "everyone come look" &&
          threadNameSlice("  spaced  ") === "spaced" &&
          threadNameSlice("x".repeat(150)).length === 100 &&
          threadNameSlice("") === "" &&
          threadNameSlice(null) === "" &&
          threadNameSlice(undefined) === "" &&
          maybeRenameThread("thread:rn-x", "@@@") === null &&
          maybeRenameThread("thread:rn-x", "") === null &&
          maybeRenameThread("channel:rn-x", "a name") === null,
        `slice=${JSON.stringify(
          threadNameSlice("a\nb\r\nc @x"),
        )} patches=${JSON.stringify(names())}`,
      );
      const dirty = "x".repeat(150) + "\n@here tail"; // 150 chars + a newline + a ping — the raw register payload
      r = await (await reg("rn-1", 1, "thread:rn1", dirty)).json();
      check(
        "rename: a dirty registered name PATCHes its sanitized form",
        r.routed === true &&
          (await until(() => chanPatches.slice(base).length === 3)) &&
          chanPatches[base + 2]?.name === threadNameSlice(dirty) &&
          chanPatches[base + 2]?.name?.length === 100 &&
          !/[@\r\n]/.test(String(chanPatches[base + 2]?.name ?? "")),
        `patched=${JSON.stringify(chanPatches[base + 2]?.name ?? null)}`,
      );
      process.env.DISCORD_THREAD_RENAME = "false";
      claimFor("thread:rn2");
      r = await (await reg("rn-2", 2, "thread:rn2", "knob off session")).json();
      check(
        "rename: thread_rename=false sends zero PATCHes (the register still routes)",
        r.routed === true && chanPatches.slice(base).length === 3,
        `routed=${r.routed} patches=${JSON.stringify(names())}`,
      );
      process.env.DISCORD_THREAD_RENAME = "true";
      claimFor("channel:rnch");
      claimFor("dm:rndm");
      const rCh = await (
        await reg("rn-ch", 3, "channel:rnch", "channel session")
      ).json();
      const rDm = await (await reg("rn-dm", 4, "dm:rndm", "dm session")).json();
      await sleep(25); // settle — the non-thread gate is synchronous; any stray fire-and-forget would surface here (there must be none)
      check(
        "rename: channel and DM conversations never PATCH (only threads rename)",
        rCh.routed === true &&
          rDm.routed === true &&
          chanPatches.slice(base).length === 3,
        `routed=${rCh.routed}/${rDm.routed} patches=${JSON.stringify(names())}`,
      );
      // failure discipline: 403/429 warn once and never block the register (fire-and-forget)
      scripted.push({
        match: (me, p) => me === "PATCH" && p === "/channels/rn3",
        error: new RestError(403, "Missing Access"),
      });
      scripted.push({
        match: (me, p) => me === "PATCH" && p === "/channels/rn4",
        error: new RestError(429, "You are being rate limited."),
      });
      let rnFailOk = false,
        rnFailDetail = "";
      const origErrRn = console.error;
      const capRn = [];
      console.error = (...a) => capRn.push(a.join(" ")); // log() dereferences console.error at call time
      try {
        claimFor("thread:rn3");
        claimFor("thread:rn4");
        const r3 = await (
          await reg("rn-3", 5, "thread:rn3", "forbidden rename")
        ).json();
        const r4 = await (
          await reg("rn-4", 6, "thread:rn4", "rate limited rename")
        ).json();
        const warned = await until(
          () =>
            capRn.some((l) =>
              l.includes("thread rename for thread:rn3 failed"),
            ) &&
            capRn.some((l) =>
              l.includes("thread rename for thread:rn4 failed"),
            ),
        );
        rnFailOk =
          r3.routed === true &&
          r4.routed === true &&
          warned &&
          scripted.length === 0; // the check prints AFTER the restore — a swallowed PASS/FAIL line hides a failure (the audit-block pattern)
        rnFailDetail = `routed=${r3.routed}/${r4.routed} warns=${
          capRn.filter((l) => l.includes("thread rename")).length
        } scriptedLeft=${scripted.length}`;
      } finally {
        console.error = origErrRn;
      }
      check(
        "rename: a failing PATCH (403/429) warns once and never blocks the register (fire-and-forget; scripted consumed)",
        rnFailOk,
        rnFailDetail,
      );
    } finally {
      if (trPrev === undefined) delete process.env.DISCORD_THREAD_RENAME;
      else process.env.DISCORD_THREAD_RENAME = trPrev;
      for (const k of [
        "thread:rn1",
        "thread:rn2",
        "thread:rn3",
        "thread:rn4",
        "channel:rnch",
        "dm:rndm",
      ]) {
        claims.delete(k);
        routing.delete(k);
        threadNameLastSet.delete(k);
      }
      for (const s of ["rn-1", "rn-2", "rn-3", "rn-4", "rn-ch", "rn-dm"])
        sessions.delete(s);
    }
  }
  // ---- 5b. /status summary (2026-09-23 operator: "lol what is this nonsense" —
  // a 39-row untagged dump, apparent duplicate ids, stale rows that never reap) ----
  {
    // registry dedup: the sessions map is keyed by sessionId — re-registers REPLACE
    await onRegister({
      sessionId: "dup-1",
      controlPort: 1500,
      pid: 9001,
      status: "idle",
    });
    await onRegister({
      sessionId: "dup-1",
      controlPort: 1501,
      pid: 9002,
      status: "working",
    }); // heartbeat re-register with changed facts
    check(
      "status: a re-register REPLACES its row (one row per sessionId — keyed map, no append)",
      [...sessions.keys()].filter((k) => k === "dup-1").length === 1 &&
        sessions.get("dup-1").controlPort === 1501 &&
        sessions.get("dup-1").status === "working",
      JSON.stringify(sessions.get("dup-1")),
    );
    sessions.delete("dup-1");
    // the witnessed "same id 7x" was a DISPLAY collision, not a registry append:
    // UUIDv7's first 8 hex chars carry only ~65.5s of timestamp, so distinct
    // sessions born in the same minute truncate to identical row prefixes. The
    // summary prints no per-session rows at all — the aggregate is the only trace.
    const pfx = "01a0d10b";
    const aggBefore = otherSessions();
    await onRegister({
      sessionId: `${pfx}-aaaa-1111-2222-333333333333`,
      controlPort: 1510,
      pid: 9101,
      status: "idle",
    });
    await onRegister({
      sessionId: `${pfx}-bbbb-4444-5555-666666666666`,
      controlPort: 1511,
      pid: 9102,
      status: "working",
    });
    const aggPair = otherSessions();
    check(
      "status: two DISTINCT sessions sharing the 8-char prefix (the witnessed 'duplicate' shape) stay 2 rows — the map never merges or appends",
      sessions.has(`${pfx}-aaaa-1111-2222-333333333333`) &&
        sessions.has(`${pfx}-bbbb-4444-5555-666666666666`) &&
        aggPair.n === aggBefore.n + 2 &&
        aggPair.w === aggBefore.w + 1,
      JSON.stringify({ before: aggBefore, pair: aggPair }),
    );
    sessions.delete(`${pfx}-aaaa-1111-2222-333333333333`);
    sessions.delete(`${pfx}-bbbb-4444-5555-666666666666`);
    // summary shape: a live named conversation + a dead one + a claim-verdict row + the aggregate
    ledger.set("thread:sum", {
      sessionId: null,
      cwd: "/tmp",
      channel_id: "tsum",
      created: nowIso(),
      lastActive: nowIso(),
    });
    ledger.set("channel:sum-dead", {
      sessionId: "dead-sess-1",
      cwd: "/tmp",
      channel_id: "cdead",
      created: new Date(Date.now() - 7200e3).toISOString(),
      lastActive: new Date(Date.now() - 1800e3).toISOString(),
    });
    ledger.set("conv:sum-rej", {
      sessionId: null,
      cwd: "/tmp",
      channel_id: "crej",
      created: nowIso(),
      lastActive: nowIso(),
    });
    claimFor("thread:sum"); // fresh claim — the register routes and stamps the ledger row
    claimFor("conv:sum-rej", { sessionId: "sum-other-1" }); // the claim holds a different session — this register REJECTS
    const aggPre = otherSessions();
    await onRegister({
      sessionId: "sum-live-1",
      controlPort: 1502,
      pid: 9003,
      convKey: "thread:sum",
      name: "status summary lap",
      file: sFile("sum-live-1.jsonl"),
      created: Date.now(),
      cwd: "/tmp",
      status: "working",
    });
    await onRegister({
      sessionId: "sum-rej-1",
      controlPort: 1503,
      pid: 9004,
      convKey: "conv:sum-rej",
      file: path.join(
        os.homedir(),
        ".prime",
        "agent",
        "session-artifacts",
        "parent",
        "sub",
        "sum-rej-1.jsonl",
      ),
      created: Date.now(),
      cwd: "/tmp",
      status: "idle",
    }); // subagent file shape (outside SESSIONS_DIR — the causal hand-over cannot fire): display-only with a reason
    const t = statusText({ webui_base_url: "http://127.0.0.1:8788" });
    const tl = t.split("\n");
    const fenceAt = tl.indexOf("```");
    const table =
      fenceAt >= 0 ? tl.slice(fenceAt + 1, tl.lastIndexOf("```")) : [];
    const headerRow = table[0] ?? "";
    const sumRow = table.find((l) => l.includes("status summary lap")) ?? ""; // thread:sum — the rename-mirrored title IS the surface name
    const deadRow = table.find((l) => l.includes("channel sum dead")) ?? ""; // convKeySlug strips separators — the beacon's sessionNameFor derives the same slug
    const rejRow = table.find((l) => l.includes("conv sum rej")) ?? "";
    const linksLine = tl.find((l) => /^\[\d+\]\(/.test(l)) ?? "";
    const aggNow = otherSessions();
    const expLinks = [];
    {
      let ln = 0;
      for (const [k, v] of ledger) {
        ln += 1;
        const open = webuiLink(v.sessionId, {
          webui_base_url: "http://127.0.0.1:8788",
        });
        if (open) expLinks.push(`[${ln}](${open})`);
      }
    }
    check(
      "status: summary shape — gateway line, caption, fenced monospace table (header + one row per conversation), ONE aggregate line, no per-session dump",
      tl[0].startsWith("gateway: ") &&
        tl.includes(`conversations (${ledger.size}):`) &&
        fenceAt >= 0 &&
        table.length - 1 === ledger.size &&
        headerRow
          .replace(/\s/g, "")
          .startsWith("#|conversation|state|session|up|last") &&
        tl.filter((l) =>
          /^\d+ other sessions on this box \(\d+ working\)$/.test(l),
        ).length === 1 &&
        !t.includes("(untagged)") &&
        !t.includes(pfx),
      JSON.stringify(tl),
    );
    check(
      "status: the live row carries state, REGISTERED name, uptime, last activity — and the conversation column shows the mirrored THREAD TITLE (the surface name), not the raw convKey",
      /^\d+ \| status summary lap *\| working +\| status summary lap *\| \d+[smhd] \| \d+[smhd]$/.test(
        sumRow,
      ) && !sumRow.includes("thread:sum"),
      sumRow,
    );
    check(
      "status: the dead row marks down with its session id (truncated uuid fallback), age, and last activity",
      /^\d+ \| channel sum dead +\| down +\| dead-ses… +\| 2h \| 30m$/.test(
        deadRow,
      ),
      JSON.stringify({ deadRow, table }),
    );
    check(
      "status: a rejected register's claim verdict rides the down row (capped into the state column)",
      rejRow.includes("down") && rejRow.includes("claim holds"),
      JSON.stringify({ rejRow, table }),
    );
    check(
      "status: the aggregate counts non-conversation sessions only (the routed session is excluded; the display-only reject counts)",
      aggNow.n === aggPre.n + 1 &&
        aggNow.w === aggPre.w &&
        tl.includes(
          `${aggNow.n} other sessions on this box (${aggNow.w} working)`,
        ),
      JSON.stringify({ pre: aggPre, now: aggNow }),
    );
    check(
      "status: ONE numbered deeplink line under the table (markdown links stay outside the code block, numbers match the rows); absent when webui_base_url is empty",
      linksLine === expLinks.join(" ") &&
        linksLine.includes("#/s/sum-live-1") &&
        linksLine.includes("#/s/dead-sess-1") &&
        !statusText({ webui_base_url: "" }).includes("#/s/"),
      JSON.stringify({ got: linksLine, want: expLinks.join(" ") }),
    );
    // reaping: null-session rows past the threshold drop from map AND file at save time
    const stale = new Date(
      Date.now() - (LEDGER_REAP_MS + 3600e3),
    ).toISOString(); // 25h — past the 24h threshold
    ledger.set("conv:reap-old", {
      sessionId: null,
      cwd: "/tmp",
      channel_id: "r1",
      created: stale,
      lastActive: stale,
    });
    ledger.set("conv:reap-fresh", {
      sessionId: null,
      cwd: "/tmp",
      channel_id: "r2",
      created: nowIso(),
      lastActive: nowIso(),
    });
    ledger.set("conv:reap-kept", {
      sessionId: "reap-sess-1",
      cwd: "/tmp",
      channel_id: "r3",
      created: stale,
      lastActive: stale,
    }); // has a session id — never age-reaped
    saveLedger();
    let onDisk = {};
    try {
      onDisk = JSON.parse(fs.readFileSync(LEDGER_PATH, "utf-8"));
    } catch {}
    check(
      "status: reaping drops stale null-session rows from display AND the ledger file at save time (fresh null + id'd rows stay)",
      !ledger.has("conv:reap-old") &&
        ledger.has("conv:reap-fresh") &&
        ledger.has("conv:reap-kept") &&
        !("conv:reap-old" in onDisk) &&
        "conv:reap-fresh" in onDisk &&
        "conv:reap-kept" in onDisk,
      JSON.stringify(Object.keys(onDisk)),
    );
    for (const k of [
      "thread:sum",
      "channel:sum-dead",
      "conv:sum-rej",
      "conv:reap-fresh",
      "conv:reap-kept",
    ])
      ledger.delete(k); // hygiene: no state survives the section (file leftovers die with the artifact-hygiene rm)
    for (const k of ["thread:sum", "conv:sum-rej"]) {
      claims.delete(k);
      routing.delete(k);
      verdicts.delete(k);
    }
    sessions.delete("sum-live-1");
    sessions.delete("sum-rej-1");
  }
  // ---- 5b2. /status fit-aware sizing (2026-09-24 review gap: the 1900-slice cut the
  // deeplink line MID-URL at today's 14-row production size and killed the fence at
  // >=22 rows — the padEnd column trap let one wide legacy name inflate every row) ----
  {
    const savedLedger = [...ledger]; // this section owns the ledger exclusively — snapshot, clear, restore
    ledger.clear();
    const wui = "http://127.0.0.1:27888"; // production-shaped webui base (21 chars — the live config's length)
    const sessId = (i) =>
      `01a0d10b-1f5d-74a1-b9be-d19ac${String(1000 + i).slice(1)}f21d`; // uuidv7-shaped (36 chars)
    const addRow = (tag, i, minsAgo, name, sid) =>
      ledger.set(`conv:fit-${tag}-${String(i).padStart(2, "0")}`, {
        sessionId: sid === undefined ? sessId(i) : sid,
        cwd: "/tmp",
        channel_id: `cf-${tag}-${i}`,
        name: name ?? null,
        created: new Date(Date.now() - 7200e3).toISOString(),
        lastActive: new Date(Date.now() - minsAgo * 60e3).toISOString(),
      }); // lowest i = most recent (minsAgo grows with i) — the caps' recency priority is assertable
    const shapeOf = (t) => {
      // the invariants that hold on EVERY side of the budget line
      const tl = t.split("\n");
      return {
        len: t.length,
        fences: tl.filter((l) => l === "```").length,
        fenceOpen: tl.indexOf("```"),
        fenceClose: tl.lastIndexOf("```"),
        aggLast: /^\d+ other sessions on this box \(\d+ working\)$/.test(
          tl[tl.length - 1],
        ),
        moreInside: tl.findIndex((l) => /^\+\d+ more conversations$/.test(l)),
        linksLine: tl.find((l) => /^\[\d+\]\(|^\(\+\d+ more\)/.test(l)) ?? "",
      };
    };
    // (a) 30 rows, uuid session ids, 26-char legacy names (the column trap), webui on — BOTH caps fire
    for (let i = 0; i < 30; i++)
      addRow("a", i, 5 + i, ("discord channel legacy " + String(i)).padEnd(26));
    const ta = statusText({ webui_base_url: wui });
    const sa = shapeOf(ta);
    const innerA = ta.split("\n").slice(sa.fenceOpen + 1, sa.fenceClose);
    const tableRowsA =
      innerA.filter((l) => !/^\+\d+ more conversations$/.test(l)).length - 1; // minus the header
    const moreA = Number(
      (ta.match(/\+(\d+) more conversations/) ?? [])[1] ?? 0,
    );
    const shownA = [...ta.matchAll(/conv fit a (\d\d)/g)].map((m) =>
      Number(m[1]),
    );
    const linksA = (sa.linksLine.match(/\[\d+\]\(/g) ?? []).length;
    const droppedLinksA = Number(
      (sa.linksLine.match(/\(\+(\d+) more\)$/) ?? [])[1] ?? 0,
    );
    check(
      "status-fit: a 30-row ledger fires BOTH caps — most-recent N shown + '+N more conversations' INSIDE the fence, links trimmed with '(+N more)', fence CLOSED, aggregate last, total inside the budget",
      sa.len <= STATUS_BUDGET &&
        sa.fences === 2 &&
        sa.moreInside > sa.fenceOpen &&
        sa.moreInside < sa.fenceClose &&
        sa.aggLast &&
        tableRowsA + moreA === 30 &&
        shownA.length === tableRowsA &&
        Math.min(...shownA) === 0 &&
        Math.max(...shownA) === tableRowsA - 1 &&
        ta.includes("discord channel legacy 0") &&
        !ta.includes("discord channel legacy 29") &&
        linksA + droppedLinksA === tableRowsA &&
        droppedLinksA > 0 &&
        (sa.linksLine.match(/\[\d+\]\([^)\s]*\)/g) ?? []).length === linksA,
      JSON.stringify({
        len: sa.len,
        budget: STATUS_BUDGET,
        rows: tableRowsA,
        moreA,
        linksA,
        droppedLinksA,
      }),
    );
    // (c) webui off — the table cap still fires, no deeplink line at all
    const tc = statusText({ webui_base_url: "" });
    const sc = shapeOf(tc);
    check(
      "status-fit: webui off — the table cap still fires and the reply carries no deeplink line (fence closed, aggregate last, inside the budget)",
      sc.len <= STATUS_BUDGET &&
        sc.fences === 2 &&
        sc.moreInside > sc.fenceOpen &&
        sc.moreInside < sc.fenceClose &&
        sc.aggLast &&
        !tc.includes("#/s/") &&
        !tc.includes("]("),
      JSON.stringify({ len: sc.len, budget: STATUS_BUDGET }),
    );
    // (b) today's production COUNT (14 rows, 12 with session ids) renders COMPLETE — no gratuitous caps
    ledger.clear();
    for (let i = 0; i < 14; i++)
      addRow("b", i, 5 + i, null, i < 12 ? undefined : null);
    const tb = statusText({ webui_base_url: wui });
    const sb = shapeOf(tb);
    const linksB = (sb.linksLine.match(/\[\d+\]\(/g) ?? []).length;
    check(
      "status-fit: a 14-row ledger (12 with session ids, webui on) renders COMPLETE — no cap markers, all 12 deeplinks whole, total inside the budget",
      sb.len <= STATUS_BUDGET &&
        !/\+\d+ more/.test(tb) &&
        sb.fences === 2 &&
        sb.aggLast &&
        linksB === 12 &&
        !/\(\+\d+ more\)/.test(sb.linksLine),
      JSON.stringify({ len: sb.len, budget: STATUS_BUDGET, linksB }),
    );
    // (d) the exact budget boundary: the last fitting ledger renders marker-free; the first overflow caps cleanly — both sides hold every invariant
    ledger.clear();
    let lastFit = null,
      firstCap = null;
    for (let i = 0; i < 40 && firstCap === null; i++) {
      addRow("d", i, 5 + i);
      const t = statusText({ webui_base_url: wui });
      if (/\+\d+ more/.test(t)) firstCap = t;
      else lastFit = t;
    }
    const sdFit = shapeOf(lastFit ?? ""),
      sdCap = shapeOf(firstCap ?? "");
    check(
      "status-fit: the exact budget boundary — the last fitting ledger hugs the line marker-free, the first overflow caps cleanly (whichever side it falls: fence closed, aggregate last, inside the budget)",
      lastFit &&
        firstCap &&
        sdFit.len <= STATUS_BUDGET &&
        !/\+\d+ more/.test(lastFit) &&
        sdFit.fences === 2 &&
        sdFit.aggLast &&
        sdCap.len <= STATUS_BUDGET &&
        /\+\d+ more/.test(firstCap) &&
        sdCap.fences === 2 &&
        sdCap.aggLast &&
        STATUS_BUDGET - sdFit.len < 130, // one row+link+marker window — guards against a fit loop that caps early
      JSON.stringify({ fit: sdFit.len, cap: sdCap.len, budget: STATUS_BUDGET }),
    );
    // (e) splitChunks: the oversize links line splits at whitespace (the agent-path twin of the same defect)
    const tok = (i) => `[${i}](${wui}#/s/${sessId(i)})`;
    const big = Array.from({ length: 60 }, (_, i) => tok(i + 1)).join(" ");
    const ch = splitChunks(big, SPLIT_THRESHOLD);
    const flat = ch.flatMap((c) => c.split(" "));
    check(
      "splitChunks: an oversize space-separated links line splits at WHITESPACE — every URL whole (no token cut across chunks), chunks inside the budget",
      ch.length >= 2 &&
        ch.every((c) => c.length <= SPLIT_THRESHOLD) &&
        flat.length === 60 &&
        flat.every((t, i) => t === tok(i + 1)),
      JSON.stringify({ chunks: ch.length, lens: ch.map((c) => c.length) }),
    );
    const hard = splitChunks("x".repeat(4500), SPLIT_THRESHOLD);
    check(
      "splitChunks: no whitespace in the back half — the hard cut stays (existing behavior, no byte loss)",
      hard.length === 3 &&
        hard[0].length === SPLIT_THRESHOLD &&
        hard.reduce((a, c) => a + c.length, 0) === 4500,
      JSON.stringify(hard.map((c) => c.length)),
    );
    ledger.clear();
    for (const [k, v] of savedLedger) ledger.set(k, v); // restore — no state survives the section
  }
  // ---- claim diagnostics + worker-recovery hand-over (production 2026-09-27 stuck-👀 fixes) ----
  // probe-proven 2026-09-24: a crashed worker's daemon recovery resumes the
  // conversation as a NEW session id (new file, same conv tag, same cwd) — the
  // claim still holds the dead id and the recovered session went display-only,
  // stranding the turn. The hand-over + grace + reason logs below are the fix.
  {
    const origErr = console.error;
    const captured = [];
    console.error = (...a) => captured.push(a.join(" "));
    // F1 (pre-existing harness bug, reviewer finding 1): the content resets below
    // erased check lines pushed inside this window — 8 SMOKE PASS lines never
    // printed (the printed count silently dropped). Erase ONLY log traffic; the
    // check lines ride to the finally re-emission like the second window's do.
    const resetCaptured = () => {
      for (let ci = captured.length - 1; ci >= 0; ci--)
        if (
          !captured[ci].includes("SMOKE PASS:") &&
          !captured[ci].includes("SMOKE FAIL:")
        )
          captured.splice(ci, 1);
    };
    try {
      // (a) a claim-rejecting first register names its reason in the log
      claimFor("conv:rcvr"); // fresh unclaimed claim (cwd /tmp, empty snapshot)
      await onRegister({
        sessionId: "rcvr-rej",
        controlPort: 1,
        pid: 6100,
        convKey: "conv:rcvr",
        file: "/elsewhere/rcvr-rej.jsonl",
        created: Date.now(),
        cwd: "/tmp",
        status: "idle",
      });
      check(
        "diag: a claim-rejecting first register LOGS its reason",
        captured.some(
          (l) =>
            l.includes("rcvr-rej") &&
            l.includes("display-only") &&
            l.includes("outside SESSIONS_DIR"),
        ),
        JSON.stringify(captured.filter((l) => l.includes("rcvr-rej"))),
      );
      resetCaptured(); // F1: keep check lines — erase only the log traffic
      // claim the conversation with a live session, then crash it: the recovered
      // branch registers with a NEW id + NEW session file — the hand-over must route it
      await onRegister({
        sessionId: "rcvr-live",
        controlPort: 2,
        pid: 6101,
        convKey: "conv:rcvr",
        file: sFile("rcvr-live.jsonl"),
        created: Date.now(),
        cwd: "/tmp",
        status: "idle",
      });
      resetCaptured(); // F1: keep check lines — erase only the log traffic
      const dr2 = await onRegister({
        sessionId: "rcvr-branch",
        controlPort: 3,
        pid: 6102,
        convKey: "conv:rcvr",
        file: sFile("rcvr-branch.jsonl"),
        created: Date.now(),
        cwd: "/tmp",
        status: "idle",
      });
      check(
        "recovery: a worker-recovery branch (new session id, new causal file) HANDS the claim over and routes",
        dr2.body.routed === true &&
          routing.get("conv:rcvr")?.sessionId === "rcvr-branch" &&
          claims.get("conv:rcvr")?.sessionId === "rcvr-branch",
        JSON.stringify({
          routed: dr2.body.routed,
          route: routing.get("conv:rcvr"),
        }),
      );
      check(
        "recovery: the hand-over logs the dead id -> new id transition",
        captured.some(
          (l) =>
            l.includes("claim handed over") &&
            l.includes("rcvr-liv") &&
            l.includes("rcvr-bra"),
        ),
        JSON.stringify(captured.filter((l) => l.includes("handed over"))),
      );
      resetCaptured(); // F1: keep check lines — erase only the log traffic
      // a same-tag subagent (file outside SESSIONS_DIR) must NOT steal the handed-over claim
      const dr3 = await onRegister({
        sessionId: "rcvr-sub",
        controlPort: 4,
        pid: 6103,
        convKey: "conv:rcvr",
        file: "/subagent-dir/rcvr-sub.jsonl",
        created: Date.now(),
        cwd: "/tmp",
        status: "idle",
      });
      check(
        "recovery: a same-tag subagent never steals the claim (its file fails the causal check)",
        dr3.body.routed === false &&
          String(dr3.body.reason ?? "").includes("claim holds session") &&
          routing.get("conv:rcvr")?.sessionId === "rcvr-branch",
        JSON.stringify(dr3.body),
      );
      // (b) the ledger grace: failPending dropped the claim (register timeout) — the
      // conversation's OWN session re-registering within 2x the pending window re-claims
      claims.delete("conv:rcvr");
      ledger.set("conv:rcvr", {
        sessionId: "rcvr-branch",
        cwd: "/tmp",
        channel_id: "ch-rcvr",
        created: nowIso(),
        lastActive: nowIso(),
      });
      const dr4 = await onRegister({
        sessionId: "rcvr-branch",
        controlPort: 5,
        pid: 6104,
        convKey: "conv:rcvr",
        cwd: "/tmp",
        status: "idle",
      });
      check(
        "recovery: a claim-lost re-register within the grace (ledger-matched session id) re-claims the route",
        dr4.body.routed === true &&
          routing.get("conv:rcvr")?.sessionId === "rcvr-branch",
        JSON.stringify({ routed: dr4.body.routed, reason: dr4.body.reason }),
      );
      check(
        "recovery: the grace re-claim logs",
        captured.some((l) => l.includes("re-claimed after claim loss")),
        JSON.stringify(captured.filter((l) => l.includes("re-claimed"))),
      );
      resetCaptured(); // F1: keep check lines — erase only the log traffic
      // outside the grace: the same register stays display-only WITH the reason
      claims.delete("conv:rcvr");
      const lStale = ledger.get("conv:rcvr");
      lStale.lastActive = new Date(
        Date.now() - 3 * REGISTER_TIMEOUT_MS,
      ).toISOString();
      const dr5 = await onRegister({
        sessionId: "rcvr-branch",
        controlPort: 6,
        pid: 6105,
        convKey: "conv:rcvr",
        cwd: "/tmp",
        status: "idle",
      });
      check(
        "recovery: outside the recovery grace the register stays display-only and names the grace in its reason",
        dr5.body.routed === false &&
          String(dr5.body.reason ?? "").includes("outside the recovery grace"),
        JSON.stringify(dr5.body),
      );
      // the route-flip log: a session that WAS routed and goes display-only logs LOUDLY
      const lostBeforeHb = captured.filter((l) => l.includes("LOST")).length; // the out-of-grace flip above logged once by design — the heartbeats below must add nothing
      const dr6 = await onRegister({
        sessionId: "rcvr-branch",
        controlPort: 7,
        pid: 6106,
        convKey: "conv:rcvr",
        status: "idle",
      }); // still display-only (prev register routed=false — no flip yet)
      await onRegister({
        sessionId: "rcvr-branch",
        controlPort: 8,
        pid: 6107,
        convKey: "conv:rcvr",
        status: "idle",
      }); // heartbeat — silent
      check(
        "diag: a display-only heartbeat after a display-only register stays silent (no flip spam)",
        captured.filter((l) => l.includes("LOST")).length === lostBeforeHb,
        JSON.stringify(captured.filter((l) => l.includes("LOST"))),
      );
      resetCaptured(); // F1: keep check lines — erase only the log traffic
      claimFor("conv:rcvr", { sessionId: "rcvr-branch", spawnPid: 4242 }); // claim matches -> next register routes again
      await onRegister({
        sessionId: "rcvr-branch",
        controlPort: 9,
        pid: 6108,
        convKey: "conv:rcvr",
        status: "idle",
      }); // routed again (row.routed true)
      const claimNow = claims.get("conv:rcvr");
      claimNow.stalePort = 424242;
      claimNow.sessionId = "rcvr-other"; // force a reject on the next heartbeat (stale port)
      await onRegister({
        sessionId: "rcvr-branch",
        controlPort: 424242,
        pid: 6109,
        convKey: "conv:rcvr",
        status: "idle",
      });
      check(
        "diag: a route FLIP (was claimed, now display-only) logs LOUDLY with its reason",
        captured.some(
          (l) =>
            l.includes("LOST its route") &&
            l.includes("rcvr-bra") &&
            l.includes("stale pre-heal beacon port"),
        ),
        JSON.stringify(captured.filter((l) => l.includes("LOST"))),
      );
    } finally {
      console.error = origErr;
      for (const l of captured) console.error(l);
    } // re-emit EVERYTHING the window swallowed — check lines included, the count must print
    claims.delete("conv:rcvr");
    ledger.delete("conv:rcvr");
    routing.delete("conv:rcvr");
    sessions.delete("rcvr-rej");
    sessions.delete("rcvr-live");
    sessions.delete("rcvr-branch");
    sessions.delete("rcvr-sub");
    streamers.delete("conv:rcvr");
  }
  // (c) the dispatch loud-warn + the stuck-👀 visible-timeout proof: a live tagged
  // session registered display-only (no route -> its events can never drive the
  // streamer) — dispatch over it warns loudly, and the turn it dispatched FAILS
  // VISIBLY at the watchdog window instead of stranding its 👀 forever
  {
    const origErr = console.error;
    const captured = [];
    console.error = (...a) => captured.push(a.join(" "));
    try {
      claimFor("conv:warn", { sessionId: "warn-claimed", cwd: "/tmp" }); // the claim holds another session id
      await onRegister({
        sessionId: "warn-live",
        controlPort: 10,
        pid: 6200,
        convKey: "conv:warn",
        file: "/elsewhere/warn-live.jsonl",
        created: Date.now(),
        cwd: "/tmp",
        status: "idle",
      }); // display-only: claim mismatch and the file fails the causal check (outside SESSIONS_DIR — the subagent shape)
      process.env.DISCORD_TURN_TIMEOUT_MS = "150"; // tiny window — the wedged turn fails fast here
      const typingsBefore = typings.length;
      await dispatchToConversation(
        "conv:warn",
        "chan-warn",
        "chan-warn",
        "trig-warn",
        "hello",
        "u1",
      ); // no route: the warn fires, the watchdog arms, no events can ever arrive
      check(
        "typing: dispatch starts the indicator WITHOUT any busy event (production 2026-09-27: the first agent_start races the register flush — probe-proven — so dispatch owns the start)",
        typings.length === typingsBefore + 1 &&
          streamers.get("conv:warn")?.typingTimer != null &&
          streamers.get("conv:warn")?.turnTimer != null,
        JSON.stringify({
          typingPosts: typings.length - typingsBefore,
          typingTimer: streamers.get("conv:warn")?.typingTimer != null,
          turnTimer: streamers.get("conv:warn")?.turnTimer != null,
        }),
      );
      check(
        "diag: a dispatch over a registered-but-unrouted tagged session warns LOUDLY",
        captured.some(
          (l) =>
            l.includes("conv:warn") &&
            l.includes("registered-but-unrouted") &&
            l.includes("warn-liv"),
        ),
        JSON.stringify(
          captured.filter((l) => l.includes("registered-but-unrouted")),
        ),
      );
      const warnTimedOut = await until(
        () =>
          sent.some(
            (s) =>
              s.channelId === "chan-warn" &&
              String(s.content).includes("session died"),
          ),
        5000,
      );
      const warnFailed = await until(
        () =>
          !loadConfig().reactions ||
          reactions.some(
            (r) =>
              r.op === "PUT" && r.emoji === "⚠️" && r.messageId === "trig-warn",
          ),
        5000,
      ); // ackFinal paces its DELETE->PUT swap (~350ms) — the notice lands first, settle-poll the ⚠️
      check(
        "diag: the stuck-👀 shape (dispatch -> display-only register -> no events) ends in a VISIBLE timeout — ⚠️ + notice, never silent",
        warnTimedOut && warnFailed,
        JSON.stringify({
          warnTimedOut,
          warnFailed,
          warnReact: reactions
            .filter((r) => r.messageId === "trig-warn")
            .map((r) => `${r.op}:${r.emoji}`),
        }),
      );
      delete process.env.DISCORD_TURN_TIMEOUT_MS;
    } finally {
      console.error = origErr;
      for (const l of captured) console.error(l);
    } // re-emit EVERYTHING the window swallowed — check lines included, the count must print
    claims.delete("conv:warn");
    ledger.delete("conv:warn");
    routing.delete("conv:warn");
    sessions.delete("warn-live");
    stopTyping("conv:warn");
    streamers.delete("conv:warn");
  }
  // ---- exactly-once parked delivery across worker recovery (production 2026-09-27 triple-reply) ----
  // One parked text, a wedged-but-reachable first beacon (the /send times out — the
  // turn is queued), a RECOVERED worker re-registering: the flush must deliver the
  // text exactly once, never falsely fail it, and the same-id re-register from a new
  // pid must stay routed (the recovery keeps the conversation) while logging the
  // route flip — three of those in a minute is the duplicate-gateway signature.
  {
    const hangHits = [];
    const hangSrv2 = http.createServer((req) => {
      hangHits.push(req.url ?? "");
    }); // accepts, never responds — a wedged-but-reachable beacon
    const hang2Port = await new Promise((resolve) =>
      hangSrv2.listen(0, "127.0.0.1", () => resolve(hangSrv2.address().port)),
    );
    const sendPrevOnce = process.env.DISCORD_SEND_TIMEOUT_MS;
    process.env.DISCORD_SEND_TIMEOUT_MS = "150"; // the wedged-beacon guard, driven fast
    const origErrOnce = console.error;
    const capturedOnce = [];
    console.error = (...a) => capturedOnce.push(a.join(" "));
    try {
      ledger.set("conv:once", {
        sessionId: "once-sess",
        cwd: "/tmp",
        channel_id: "ch-once",
        created: nowIso(),
        lastActive: nowIso(),
      });
      pendingByConv.set("conv:once", {
        texts: [{ text: "the one text", triggerMessageId: "trig-once" }],
        channelId: "ch-once",
        spawned: true,
        spawnAt: Date.now(),
        pid: 9401,
      }); // the parked dispatch
      claims.set("conv:once", {
        at: Date.now(),
        cwd: "/tmp",
        known: null,
        sessionId: "once-sess",
        spawnPid: 9401,
      }); // resume-shaped claim
      const onceNoticeCount = () =>
        sent.filter((s) => String(s.content).includes("session died")).length; // local — the shared noticesCount is declared further down smoke() (TDZ here)
      const noticesBeforeOnce = onceNoticeCount();
      const dr1 = await onRegister({
        sessionId: "once-sess",
        controlPort: hang2Port,
        pid: 9401,
        convKey: "conv:once",
        cwd: "/tmp",
        status: "idle",
      }); // the first worker: the flush delivers to the wedged beacon
      await new Promise((r) => setTimeout(r, 250)); // the send timeout settles
      const dr2 = await onRegister({
        sessionId: "once-sess",
        controlPort: hang2Port,
        pid: 9402,
        convKey: "conv:once",
        cwd: "/tmp",
        status: "idle",
      }); // the RECOVERED worker (same id, new pid): the pending is consumed — no second delivery
      await new Promise((r) => setTimeout(r, 250));
      check(
        "once: the parked text flushes EXACTLY ONCE across the worker-death/recovery re-register (one /send hit; the timeout is delivered, not re-sent)",
        dr1.body.routed === true &&
          dr2.body.routed === true &&
          hangHits.length === 1 &&
          pendingByConv.has("conv:once") === false,
        JSON.stringify({
          routed: [dr1.body.routed, dr2.body.routed],
          sendHits: hangHits.length,
          pendingLeft: pendingByConv.has("conv:once"),
        }),
      );
      check(
        "once: the timeout-delivery is never falsely failed (no failPending notice; the claim survives for the recovered heartbeats)",
        onceNoticeCount() === noticesBeforeOnce &&
          claims.has("conv:once") === true &&
          claims.get("conv:once")?.sessionId === "once-sess",
        JSON.stringify({
          notices: onceNoticeCount() - noticesBeforeOnce,
          claimHeld: claims.get("conv:once")?.sessionId,
        }),
      );
      check(
        "once: the same-id re-register from a new pid logs the route flip (the multi-worker anomaly signature made visible)",
        capturedOnce.some(
          (l) =>
            l.includes("route re-bound") &&
            l.includes("9401") &&
            l.includes("9402"),
        ),
        JSON.stringify(
          capturedOnce.filter((l) => l.includes("route re-bound")),
        ),
      );
    } finally {
      if (sendPrevOnce === undefined)
        delete process.env.DISCORD_SEND_TIMEOUT_MS;
      else process.env.DISCORD_SEND_TIMEOUT_MS = sendPrevOnce;
      console.error = origErrOnce;
      for (const l of capturedOnce) console.error(l); // re-emit EVERYTHING the window swallowed — check lines included, the count must print
      hangSrv2.close();
      claims.delete("conv:once");
      ledger.delete("conv:once");
      routing.delete("conv:once");
      sessions.delete("once-sess");
      streamers.delete("conv:once");
    }
  }
  // register timeout must SIGTERM the wrapper it spawned (production leak 2026-09-24:
  // the wrapper outlived the timeout by minutes) — observable here via a spawn stub
  {
    const killed = [];
    spawned.set(9101, { kill: (sig) => killed.push(sig) }); // the stub wrapper handle — only the wrapper is fair game, never a daemon worker
    const staleAt = Date.now() - (REGISTER_TIMEOUT_MS + 1000);
    pendingByConv.set("conv:leak", {
      texts: [],
      channelId: "ch-leak",
      spawned: true,
      spawnAt: staleAt,
      pid: 9101,
    });
    claims.set("conv:leak", {
      at: staleAt,
      cwd: "/tmp",
      known: new Set(),
      sessionId: null,
      spawnPid: 9101,
    });
    pendingByConv.set("conv:fresh", {
      texts: [],
      channelId: "ch-fresh",
      spawned: true,
      spawnAt: Date.now(),
      pid: 9102,
    }); // inside the window
    const sentBeforeLeak = sent.length;
    sweepPending();
    await new Promise((r) => setTimeout(r, 50)); // failPending awaits rest.sendMessage
    check(
      "control: register timeout SIGTERMs the spawned wrapper",
      killed.length === 1 && killed[0] === "SIGTERM",
      JSON.stringify(killed),
    );
    check(
      "control: register timeout clears the pending dispatch and its claim",
      pendingByConv.has("conv:leak") === false &&
        claims.has("conv:leak") === false,
    );
    check(
      "control: timeout failure notice sent to the channel",
      sent.length === sentBeforeLeak + 1 &&
        sent[sent.length - 1]?.channelId === "ch-leak",
      JSON.stringify(sent.slice(-1)),
    );
    check(
      "control: a fresh pending spawn survives the sweep",
      pendingByConv.has("conv:fresh") === true,
    );
    spawned.delete(9101);
    pendingByConv.delete("conv:fresh");
  }
  streamers.delete("conv:s5");
  claims.delete("thread:smoke");
  claims.delete("conv:s5");

  // /internal/thread route (thread_policy "agent" — the discord_thread tool's
  // server side): token-gated like every /internal route, fail-closed on unknown
  // sessions; the full promotion flow runs in section 6c through the real beacon
  resp = await ctl("/internal/thread", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "x", name: "no token" }),
  });
  check(
    "control: /internal/thread without token is 401 (fail-closed)",
    resp.status === 401,
  );
  resp = await ctl("/internal/thread", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ sessionId: "not-routed", name: "a thread" }),
  });
  body = await resp.json();
  check(
    "control: /internal/thread for an unrouted session answers 409 with guidance (answer in place)",
    resp.status === 409 && typeof body.error === "string",
    JSON.stringify(body),
  );
  resp = await ctl("/internal/thread", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ sessionId: "tagged-1", name: "a thread" }),
  }); // thread:smoke was unregistered — also unroutable now
  check(
    "control: /internal/thread for a dead conversation route answers 409",
    resp.status === 409,
  );

  // beaconSend round trip against a fake beacon + a dead port — the outcome shape:
  // { ok } for delivery, { unreachable } for "the port is GONE" (the only heal trigger)
  const fakeBeacon = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, delivered: "turn" }));
  });
  const fbPort = await new Promise((resolve) =>
    fakeBeacon.listen(0, "127.0.0.1", () => resolve(fakeBeacon.address().port)),
  );
  check(
    "beacon contract: /send to a live beacon succeeds",
    (await beaconSend({ controlPort: fbPort }, "hello")).ok === true,
  );
  const deadSend = await beaconSend({ controlPort: 1 }, "hello");
  check(
    "beacon contract: /send to a dead beacon fails as unreachable (the only respawn trigger)",
    deadSend.ok === false && deadSend.unreachable === true,
    JSON.stringify(deadSend),
  );
  // (T3 regression, production 2026-09-26 double-reply) a beacon that ACCEPTS the
  // connection but never answers is NOT dead: the /send reached it (the queued turn
  // runs on the live session) — a timeout must never trigger the respawn path
  {
    const hangSrv = http.createServer(() => {}); // accepts, never responds
    const hangPort = await new Promise((resolve) =>
      hangSrv.listen(0, "127.0.0.1", () => resolve(hangSrv.address().port)),
    );
    const wedgePrev = process.env.DISCORD_SEND_TIMEOUT_MS;
    process.env.DISCORD_SEND_TIMEOUT_MS = "150"; // the 8s wedged-beacon guard, driven fast
    const wedgeSend = await beaconSend({ controlPort: hangPort }, "hello");
    check(
      "beacon contract: a wedged (accepting, unresponsive) beacon times out as NOT unreachable — presumed delivered",
      wedgeSend.ok === false && wedgeSend.unreachable === false,
      JSON.stringify(wedgeSend),
    );
    if (wedgePrev === undefined) delete process.env.DISCORD_SEND_TIMEOUT_MS;
    else process.env.DISCORD_SEND_TIMEOUT_MS = wedgePrev;
    hangSrv.close();
  }

  // ---- 5b. session-death resilience (production 2026-09-24, thread 1552418888795291728:
  // the daemon recycled the conversation worker mid-turn; the wrapper lived on as
  // a zombie holding a dead rpc, the route kept pointing at the dead worker's port,
  // and the thread went permanently mute). Hermetic: the dead worker is a dead
  // port + a stubbed wrapper handle — the smoke never spawns a real child and
  // never signals anything but its own spawn stubs. ----
  const noticesCount = () =>
    sent.filter((s) => String(s.content).includes("session died")).length;
  // (a) dead-beacon dispatch self-heal: SIGTERM the stale wrapper, drop the stale
  // route, respawn with --resume, re-dispatch the parked text — and NO visible
  // failure when no prior turn was left hanging (a clean hand-off, not a funeral)
  {
    const killed = [];
    spawned.set(9301, { kill: (sig) => killed.push(sig) }); // stub wrapper handle — only wrappers we spawned are ever signalled
    routing.set("conv:heal", {
      sessionId: "s-heal",
      controlPort: 1,
      pid: 338,
      spawnPid: 9301,
    }); // controlPort 1: the dead worker's beacon
    ledger.set("conv:heal", {
      sessionId: "sess-resume-1",
      cwd: "/tmp",
      channel_id: "chan-heal",
      created: nowIso(),
      lastActive: nowIso(),
    });
    const stH = streamerOf("conv:heal");
    stH.channelId = "chan-heal";
    stH.triggerChannelId = "parent-heal";
    stH.triggerMessageId = "trig-heal-1"; // a cleanly-finished prior turn: no pendingAck, not busy, no preview
    const healSpawnsBefore = smokeSpawns.length;
    const noticesBeforeHeal = noticesCount(); // relative — the diag sections earlier in the run legitimately emit timeout notices by design
    await dispatchToConversation(
      "conv:heal",
      "chan-heal",
      "parent-heal",
      "trig-heal-2",
      "heal: second try",
    );
    check(
      "heal: dead-beacon dispatch SIGTERMs the stale wrapper it spawned",
      killed.length === 1 && killed[0] === "SIGTERM",
      JSON.stringify(killed),
    );
    check(
      "heal: the stale route is dropped",
      routing.has("conv:heal") === false,
    );
    check(
      "heal: the dispatch respawns with --resume (the ledger sessionId) and re-dispatches the parked text",
      smokeSpawns.length === healSpawnsBefore + 1 &&
        smokeSpawns[smokeSpawns.length - 1].convKey === "conv:heal" &&
        smokeSpawns[smokeSpawns.length - 1].text === "heal: second try" &&
        smokeSpawns[smokeSpawns.length - 1].resumeId === "sess-resume-1",
      JSON.stringify(smokeSpawns.slice(healSpawnsBefore)),
    );
    check(
      "heal: a cleanly-finished conversation respawns without a visible failure (no notice, no ⚠️)",
      noticesCount() === noticesBeforeHeal &&
        !(
          loadConfig().reactions &&
          reactions.some(
            (r) => r.emoji === "⚠️" && r.messageId === "trig-heal-1",
          )
        ),
      JSON.stringify(sent.filter((s) => s.channelId === "chan-heal")),
    );
    spawned.delete(9301);
    ledger.delete("conv:heal");
    streamers.delete("conv:heal");
    routing.delete("conv:heal");
    stopTyping("conv:heal"); // the new dispatch's typing loop (dispatch-time start) — stop it before the streamer cleanup
  }
  // (b) mid-turn beacon death: a stalled turn (👀 dispatched, typing active, agent_end
  // never coming — the incident shape) plus a dead beacon on the NEXT dispatch fails
  // the stalled turn VISIBLY, then the self-heal respawn still runs
  {
    const killed = [];
    spawned.set(9302, { kill: (sig) => killed.push(sig) });
    routing.set("conv:stall", {
      sessionId: "s-stall",
      controlPort: 1,
      pid: 339,
      spawnPid: 9302,
    });
    ledger.set("conv:stall", {
      sessionId: "sess-resume-2",
      cwd: "/tmp",
      channel_id: "chan-stall",
      created: nowIso(),
      lastActive: nowIso(),
    });
    const stS = streamerOf("conv:stall");
    stS.channelId = "chan-stall";
    stS.triggerChannelId = "parent-stall";
    stS.triggerMessageId = "trig-stall-1";
    stS.pendingAck = true;
    stS.busy = true;
    const stallTimer = setInterval(() => {}, 60000);
    stS.typingTimer = stallTimer; // the typing loop spins while the turn "runs"
    const stallNoticesBefore = noticesCount();
    await dispatchToConversation(
      "conv:stall",
      "chan-stall",
      "parent-stall",
      "trig-stall-2",
      "stall: second message",
    );
    if (loadConfig().reactions) {
      check(
        "heal: a stalled turn on a dead beacon fails visibly — ⚠️ lands on the STALLED turn's own trigger",
        await until(() =>
          reactions.some(
            (r) =>
              r.op === "PUT" &&
              r.emoji === "⚠️" &&
              r.channelId === "parent-stall" &&
              r.messageId === "trig-stall-1",
          ),
        ),
        JSON.stringify(reactions.slice(-6)),
      );
    }
    check(
      'heal: the stalled turn gets the channel notice ("the conversation session died — send another message to respawn it")',
      noticesCount() === stallNoticesBefore + 1 &&
        sent[sent.length - 1]?.channelId === "chan-stall" &&
        String(sent[sent.length - 1]?.content).includes(
          "send another message to respawn it",
        ),
      JSON.stringify(sent.slice(-1)),
    );
    {
      // webui: the same notice — ambient-conditional like the reactions gates: the injected run proves the link ON, the default run proves it OFF
      const base = loadConfig().webui_base_url;
      check(
        "webui: the session-death notice matches the webui knob (ui link line when enabled, none when off)",
        base
          ? String(sent[sent.length - 1]?.content).includes(
              `open this conversation in the ui: ${base}#/s/sess-resume-2`,
            )
          : !String(sent[sent.length - 1]?.content).includes(
              "open this conversation in the ui:",
            ),
        JSON.stringify(sent.slice(-1)),
      );
    }
    check(
      "heal: the mid-turn death stops the STALLED turn's typing loop and clears its busy flag (the new dispatch's own typing may run — dispatch owns the start now)",
      stS.typingTimer !== stallTimer && stS.busy === false,
      JSON.stringify({
        stallTypingStopped: stS.typingTimer !== stallTimer,
        busy: stS.busy,
        newTypingRunning: stS.typingTimer != null,
      }),
    );
    check(
      "heal: the zombie wrapper is SIGTERMed and the stalled conversation respawns with --resume",
      killed.length === 1 &&
        killed[0] === "SIGTERM" &&
        smokeSpawns[smokeSpawns.length - 1]?.convKey === "conv:stall" &&
        smokeSpawns[smokeSpawns.length - 1]?.resumeId === "sess-resume-2",
      JSON.stringify({ killed, spawn: smokeSpawns[smokeSpawns.length - 1] }),
    );
    clearInterval(stallTimer); // belt: harmless if failTurn already cleared it
    stopTyping("conv:stall"); // the new dispatch's typing loop (dispatch-time start) — stop it before the streamer cleanup
    spawned.delete(9302);
    ledger.delete("conv:stall");
    streamers.delete("conv:stall");
    routing.delete("conv:stall");
  }
  // (c) turn timeout: no stream events and no message_end within the window (env
  // knob drives it tiny here) -> the turn fails visibly, the typing loop stops
  {
    const savedKnb = process.env.DISCORD_TURN_TIMEOUT_MS;
    process.env.DISCORD_TURN_TIMEOUT_MS = "123";
    const knobV = turnTimeoutMs();
    if (savedKnb === undefined) delete process.env.DISCORD_TURN_TIMEOUT_MS;
    else process.env.DISCORD_TURN_TIMEOUT_MS = savedKnb;
    check(
      "heal: default turn window is 300000ms and DISCORD_TURN_TIMEOUT_MS overrides it",
      knobV === 123 &&
        turnTimeoutMs() ===
          (savedKnb !== undefined ? Number(savedKnb) : TURN_TIMEOUT_MS) &&
        TURN_TIMEOUT_MS === 300000,
      `knob=${knobV} restored=${turnTimeoutMs()}`,
    );
    process.env.DISCORD_TURN_TIMEOUT_MS = "80";
    routing.set("conv:tto", { sessionId: "s-tto", controlPort: 1, pid: 342 });
    const stT = streamerOf("conv:tto");
    stT.channelId = "chan-tto";
    stT.triggerChannelId = "parent-tto";
    stT.triggerMessageId = "trig-tto";
    stT.pendingAck = true;
    await onBeaconEvent("s-tto", "busy", { busy: true }); // turn start arms the watchdog
    check(
      "heal: the watchdog is armed while a turn runs",
      stT.turnTimer != null && stT.busy === true,
    );
    const armedFirst = stT.turnTimer;
    await onBeaconEvent("s-tto", "message_update", { text: "streaming" }); // a stream event resets the window
    check(
      "heal: a stream event resets the watchdog",
      stT.turnTimer != null && stT.turnTimer !== armedFirst,
      JSON.stringify({ first: armedFirst != null, now: stT.turnTimer != null }),
    );
    await new Promise((r) => setTimeout(r, 300)); // silence past the 80ms window
    if (loadConfig().reactions) {
      check(
        "heal: turn timeout swaps the stalled trigger to ⚠️",
        await until(() =>
          reactions.some(
            (r) =>
              r.op === "PUT" &&
              r.emoji === "⚠️" &&
              r.channelId === "parent-tto" &&
              r.messageId === "trig-tto",
          ),
        ),
        JSON.stringify(reactions.slice(-6)),
      );
    }
    check(
      "heal: turn timeout posts the notice and stops the typing loop",
      sent.some(
        (s) =>
          s.channelId === "chan-tto" &&
          String(s.content).includes("send another message to respawn it"),
      ) &&
        stT.typingTimer === null &&
        stT.turnTimer === null &&
        stT.busy === false,
      JSON.stringify({
        typingTimer: stT.typingTimer,
        turnTimer: stT.turnTimer,
        busy: stT.busy,
      }),
    );
    if (savedKnb === undefined) delete process.env.DISCORD_TURN_TIMEOUT_MS;
    else process.env.DISCORD_TURN_TIMEOUT_MS = savedKnb;
    routing.delete("conv:tto");
    streamers.delete("conv:tto");
  }
  // (d) textless message_end mid-turn (production 2026-09-26): the reviewer's
  // stranded-👀 protection MOVED to busy:false — a textless end is a tool-call
  // message end, mid-turn state reset only; the tool-only turn's trigger resolves
  // (⚠️) at the agent_end, never a stuck 👀 and never a mid-turn ⚠️
  {
    routing.set("conv:tle", { sessionId: "s-tle", controlPort: 1, pid: 343 });
    const stL = streamerOf("conv:tle");
    stL.channelId = "chan-tle";
    stL.triggerChannelId = "parent-tle";
    stL.triggerMessageId = "trig-tle";
    stL.pendingAck = true;
    await onBeaconEvent("s-tle", "message_end", { text: "" }); // a tool-call message end mid-turn
    check(
      "heal: a textless message_end mid-turn resets preview state and acks NOTHING",
      stL.previewId == null &&
        stL.previewShown == null &&
        stL.pendingAck === true &&
        stL.busy === false &&
        (!loadConfig().reactions ||
          !reactions.some((r) => r.messageId === "trig-tle")),
      JSON.stringify({
        pendingAck: stL.pendingAck,
        reactions: reactions.slice(-4),
      }),
    );
    await onBeaconEvent("s-tle", "busy", { busy: false }); // the turn ends with no text having landed
    const dFail = await until(
      () =>
        !loadConfig().reactions ||
        reactions.some(
          (r) =>
            r.op === "PUT" &&
            r.emoji === "⚠️" &&
            r.channelId === "parent-tle" &&
            r.messageId === "trig-tle",
        ),
    );
    check(
      "heal: a tool-only turn resolves ⚠️ at busy:false — no stranded 👀",
      stL.pendingAck === false && dFail,
      JSON.stringify({
        pendingAck: stL.pendingAck,
        reactions: reactions.filter((r) => r.messageId === "trig-tle"),
      }),
    );
    routing.delete("conv:tle");
    streamers.delete("conv:tle");
  }
  // (e) unregister mid-turn (the beacon's session_shutdown): the route clears AND
  // the in-flight turn fails visibly — not just a silent routing drop
  {
    claims.set("conv:unreg", {
      at: Date.now(),
      cwd: "/tmp",
      known: new Set(),
      sessionId: "s-unreg",
      spawnPid: 9303,
    });
    resp = await ctl("/internal/register", {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        sessionId: "s-unreg",
        controlPort: 1242,
        pid: 5556,
        convKey: "conv:unreg",
        status: "idle",
      }),
    });
    body = await resp.json();
    check(
      "heal: unregister setup — the claimed session routes",
      body.routed === true &&
        routing.get("conv:unreg")?.sessionId === "s-unreg",
      JSON.stringify(body),
    );
    const stU = streamerOf("conv:unreg");
    stU.channelId = "chan-unreg";
    stU.triggerChannelId = "parent-unreg";
    stU.triggerMessageId = "trig-unreg";
    stU.pendingAck = true;
    stU.busy = true;
    resp = await ctl("/internal/unregister", {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ sessionId: "s-unreg" }),
    });
    const unregFail = await until(
      () =>
        !loadConfig().reactions ||
        reactions.some(
          (r) =>
            r.op === "PUT" &&
            r.emoji === "⚠️" &&
            r.channelId === "parent-unreg" &&
            r.messageId === "trig-unreg",
        ),
    );
    check(
      "heal: a mid-turn unregister fails the turn visibly — route dropped, ⚠️ on the trigger, notice in the channel",
      routing.has("conv:unreg") === false &&
        sent.some(
          (s) =>
            s.channelId === "chan-unreg" &&
            String(s.content).includes("send another message to respawn it"),
        ) &&
        unregFail &&
        stU.busy === false &&
        stU.pendingAck === false,
      JSON.stringify({
        routed: routing.has("conv:unreg"),
        busy: stU.busy,
        pendingAck: stU.pendingAck,
      }),
    );
    claims.delete("conv:unreg");
    streamers.delete("conv:unreg");
  }
  // (f) thread-visibility fallback (production 2026-09-23: every auto-thread was
  // born PRIVATE type 12, bot-only): when the member-add fails, it retries once,
  // then tells the parent channel the thread may be hidden — never silent
  {
    const addsBefore = memberAdds.length;
    scripted.push({
      match: (me, p) =>
        me === "PUT" && p === "/channels/t-fail/thread-members/u1",
      error: new RestError(403, JSON.stringify({ message: "Missing Access" })),
    });
    scripted.push({
      match: (me, p) =>
        me === "PUT" && p === "/channels/t-fail/thread-members/u1",
      error: new RestError(403, JSON.stringify({ message: "Missing Access" })),
    });
    await ensureThreadMember("t-fail", "u1", "vis-parent");
    check(
      "heal: a failed member-add retries once and tells the parent channel the thread may be hidden",
      memberAdds.length === addsBefore + 2 &&
        sent.some(
          (s) =>
            s.channelId === "vis-parent" &&
            String(s.content).includes("could not add you"),
        ),
      JSON.stringify({
        adds: memberAdds.slice(addsBefore).length,
        notice: sent.some(
          (s) =>
            s.channelId === "vis-parent" &&
            String(s.content).includes("could not add you"),
        ),
      }),
    );
  }
  // (g) T2 regression — a completed turn whose agent_end was LOST (worker died
  // between message_end and agent_end): busy was settled at message_end, so the
  // next dispatch's dead-beacon self-heal must NOT failTurn the delivered turn
  // (the old code left busy stale and ⚠️'d + noticed a DELIVERED trigger)
  {
    const killed = [];
    spawned.set(9304, { kill: (sig) => killed.push(sig) });
    routing.set("conv:lostend", {
      sessionId: "s-lostend",
      controlPort: 1,
      pid: 350,
      spawnPid: 9304,
    });
    ledger.set("conv:lostend", {
      sessionId: "sess-lostend",
      cwd: "/tmp",
      channel_id: "chan-lostend",
      created: nowIso(),
      lastActive: nowIso(),
    });
    const stLe = streamerOf("conv:lostend");
    stLe.channelId = "chan-lostend";
    stLe.triggerChannelId = "parent-lostend";
    stLe.triggerMessageId = "trig-lostend";
    stLe.pendingAck = true;
    await onBeaconEvent("s-lostend", "busy", { busy: true });
    await onBeaconEvent("s-lostend", "message_end", {
      text: "delivered before the worker died",
    }); // finalize + ✅
    await until(() =>
      sent.some(
        (s) =>
          s.channelId === "chan-lostend" &&
          s.content === "delivered before the worker died",
      ),
    );
    // NO busy:false — the worker died between message_end and agent_end
    const noticesBefore = noticesCount();
    await dispatchToConversation(
      "conv:lostend",
      "chan-lostend",
      "parent-lostend",
      "trig-lostend-2",
      "lostend: next message",
      "u1",
    ); // dead port (1) -> self-heal
    const leOk = await until(
      () =>
        !loadConfig().reactions ||
        reactions.some(
          (r) =>
            r.op === "PUT" &&
            r.emoji === "✅" &&
            r.messageId === "trig-lostend",
        ),
    );
    check(
      "heal: a completed turn with a LOST agent_end is never failTurned by the self-heal — no ⚠️ on the delivered trigger, no death notice",
      noticesCount() === noticesBefore &&
        leOk &&
        (!loadConfig().reactions ||
          !reactions.some(
            (r) =>
              r.op === "PUT" &&
              r.emoji === "⚠️" &&
              r.messageId === "trig-lostend",
          )),
      JSON.stringify({
        notices: noticesCount() - noticesBefore,
        reactions: loadConfig().reactions
          ? reactions.filter((r) => r.messageId === "trig-lostend")
          : "off",
      }),
    );
    check(
      "heal: the lost-agent_end conversation still respawns with --resume (the heal itself is intact)",
      killed.length === 1 &&
        killed[0] === "SIGTERM" &&
        smokeSpawns[smokeSpawns.length - 1]?.convKey === "conv:lostend" &&
        smokeSpawns[smokeSpawns.length - 1]?.resumeId === "sess-lostend",
      JSON.stringify({ killed, spawn: smokeSpawns[smokeSpawns.length - 1] }),
    );
    spawned.delete(9304);
    ledger.delete("conv:lostend");
    stopTyping("conv:lostend");
    streamers.delete("conv:lostend");
    routing.delete("conv:lostend"); // stopTyping FIRST — the re-anchored dispatch left a live interval; deleting the streamer alone leaks an 8s tick into every later timing window (surfaced by round 2's longer schedule)
  }
  // (h) T3 regression — dead-beacon self-heal re-delivers the parked text EXACTLY
  // ONCE: the pre-heal beacon's heartbeat (same sessionId, same stale port) stays
  // display-only (stale-port claim guard), and only the RESPAWN's register flushes
  // (production 2026-09-26: the original worker's id-matched heartbeat re-claimed
  // the resume claim and the flush re-delivered — two replies to one follow-up)
  {
    const sendsToNew = []; // the respawn target beacon — counts its /send calls
    const newBeacon = http.createServer((req, res) => {
      sendsToNew.push(String(req.url));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, delivered: "turn" }));
    });
    const newPort = await new Promise((resolve) =>
      newBeacon.listen(0, "127.0.0.1", () => resolve(newBeacon.address().port)),
    );
    const killed = [];
    spawned.set(9305, { kill: (sig) => killed.push(sig) });
    routing.set("conv:dbl", {
      sessionId: "sess-dbl",
      controlPort: 1,
      pid: 351,
      spawnPid: 9305,
    }); // port 1: refused — the beacon is dead
    ledger.set("conv:dbl", {
      sessionId: "sess-dbl",
      cwd: "/tmp",
      channel_id: "chan-dbl",
      created: nowIso(),
      lastActive: nowIso(),
    });
    const dblSpawnsBefore = smokeSpawns.length;
    await dispatchToConversation(
      "conv:dbl",
      "chan-dbl",
      "parent-dbl",
      "trig-dbl",
      "dbl: the parked follow-up",
      "u1",
    );
    check(
      "heal: the dead-beacon dispatch respawns ONCE with --resume",
      smokeSpawns.length === dblSpawnsBefore + 1 &&
        smokeSpawns[dblSpawnsBefore].resumeId === "sess-dbl" &&
        killed.length === 1,
      JSON.stringify({ spawns: smokeSpawns.slice(dblSpawnsBefore), killed }),
    );
    // smoke mode records the spawn instead of building it — mirror the production
    // spawnForConv state by hand: the resume claim (with the pre-heal port marked
    // stale) and the parked text waiting for the respawn's register
    claims.set("conv:dbl", {
      at: Date.now(),
      cwd: "/tmp",
      known: null,
      sessionId: "sess-dbl",
      spawnPid: 9305,
      stalePort: 1,
    });
    pendingByConv.set("conv:dbl", {
      texts: [
        { text: "dbl: the parked follow-up", triggerMessageId: "trig-dbl" },
      ],
      channelId: "chan-dbl",
      spawned: true,
      spawnAt: Date.now(),
      pid: null,
    });
    // the ORIGINAL beacon comes back on its SAME port (wedged, not dead — the residual
    // path): its heartbeat re-registers with the SAME sessionId the resume claim preset
    const hb = await onRegister({
      sessionId: "sess-dbl",
      controlPort: 1,
      pid: 351,
      convKey: "conv:dbl",
      status: "idle",
    });
    check(
      "heal: the pre-heal beacon's id-matched heartbeat stays display-only (stale-port claim guard) — the parked text does NOT flush to it",
      hb.body.routed === false &&
        pendingByConv.has("conv:dbl") === true &&
        sendsToNew.length === 0,
      JSON.stringify({
        routed: hb.body.routed,
        pending: pendingByConv.has("conv:dbl"),
        sends: sendsToNew.length,
      }),
    );
    // the RESPAWN's beacon registers (a NEW port) — the claim routes and the flush delivers
    const rs = await onRegister({
      sessionId: "sess-dbl",
      controlPort: newPort,
      pid: 352,
      convKey: "conv:dbl",
      status: "idle",
    });
    await new Promise((r) => setTimeout(r, 100)); // the flush's beaconSend settles
    check(
      "heal: the respawn's register flush delivers the parked text EXACTLY ONCE — one /send, one turn, one reply",
      rs.body.routed === true &&
        sendsToNew.length === 1 &&
        sendsToNew[0] === "/send" &&
        pendingByConv.has("conv:dbl") === false,
      JSON.stringify({
        routed: rs.body.routed,
        sends: sendsToNew,
        pending: pendingByConv.has("conv:dbl"),
      }),
    );
    spawned.delete(9305);
    ledger.delete("conv:dbl");
    streamers.delete("conv:dbl");
    routing.delete("conv:dbl");
    claims.delete("conv:dbl");
    newBeacon.close();
  }
  // (i) dispatch exactly-once (2026-09-24 dm duplicate pairs, operator live
  // feedback — the ROOT CAUSE regression check): a beaconSend the live session
  // ACKS is the dispatch's end — no parked copy, no respawn, no second /send.
  // Production witness (dm:231106026479288320): every message after the first
  // ran as TWO turns (live /send + the unconditional resume spawn's register
  // flush re-sending the parked text), three duplicate pairs, gaps 4-51s.
  {
    const liveHits = [];
    const liveBeacon = http.createServer((req, res) => {
      liveHits.push(String(req.url));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, delivered: "turn" }));
    });
    const livePort = await new Promise((resolve) =>
      liveBeacon.listen(0, "127.0.0.1", () =>
        resolve(liveBeacon.address().port),
      ),
    );
    routing.set("conv:live", {
      sessionId: "s-live",
      controlPort: livePort,
      pid: 361,
      spawnPid: 9361,
    });
    ledger.set("conv:live", {
      sessionId: "s-live",
      cwd: "/tmp",
      channel_id: "chan-live",
      created: nowIso(),
      lastActive: nowIso(),
    });
    const liveSpawnsBefore = smokeSpawns.length;
    await dispatchToConversation(
      "conv:live",
      "chan-live",
      "chan-live",
      "trig-live-1",
      "live: the acked turn",
      "u1",
    );
    check(
      "ack: a dispatch the live beacon ACKS (200) ends with NO respawn — one /send, one turn, no parked copy",
      liveHits.length === 1 &&
        liveHits[0] === "/send" &&
        smokeSpawns.length === liveSpawnsBefore,
      JSON.stringify({
        sends: liveHits,
        spawns: smokeSpawns.length - liveSpawnsBefore,
      }),
    );
    const stLive = streamers.get("conv:live");
    check(
      "ack: the acked dispatch still anchors its trigger (pendingAck armed — the live session's events drive the verdict)",
      stLive?.pendingAck === true &&
        stLive?.triggerMessageId === "trig-live-1" &&
        stLive?.channelId === "chan-live",
      JSON.stringify({
        pendingAck: stLive?.pendingAck,
        trig: stLive?.triggerMessageId,
        chan: stLive?.channelId,
      }),
    );
    const liveSpawnsBefore2 = smokeSpawns.length;
    await dispatchToConversation(
      "conv:live",
      "chan-live",
      "chan-live",
      "trig-live-1",
      "live: the SAME trigger id again",
      "u1",
    );
    check(
      "dedupe: a repeat dispatch of an already-admitted trigger id drops at admission (no /send, no spawn, one audit line)",
      liveHits.length === 1 && smokeSpawns.length === liveSpawnsBefore2,
      JSON.stringify({
        sends: liveHits.length,
        spawns: smokeSpawns.length - liveSpawnsBefore2,
      }),
    );
    stopTyping("conv:live");
    routing.delete("conv:live");
    ledger.delete("conv:live");
    streamers.delete("conv:live");
    liveBeacon.close();
  }
  // (j) the timeout twin: a REACHABLE-but-wedged beacon never respawns either —
  // the 2026-09-26 comment ("no respawn, no parked re-dispatch") is finally the
  // code; before round 2 the fall-through spawned + the register flush re-sent.
  {
    const wedgedSrv = http.createServer(() => {}); // accepts, never answers
    const wedgedPort = await new Promise((resolve) =>
      wedgedSrv.listen(0, "127.0.0.1", () => resolve(wedgedSrv.address().port)),
    );
    const wedgePrevJ = process.env.DISCORD_SEND_TIMEOUT_MS;
    process.env.DISCORD_SEND_TIMEOUT_MS = "150"; // the wedged-beacon guard, driven fast
    routing.set("conv:wedge", {
      sessionId: "s-wedge",
      controlPort: wedgedPort,
      pid: 371,
      spawnPid: 9371,
    });
    ledger.set("conv:wedge", {
      sessionId: "s-wedge",
      cwd: "/tmp",
      channel_id: "chan-wedge",
      created: nowIso(),
      lastActive: nowIso(),
    });
    const wedgeSpawnsBefore = smokeSpawns.length;
    await dispatchToConversation(
      "conv:wedge",
      "chan-wedge",
      "chan-wedge",
      "trig-wedge-1",
      "wedge: the queued turn",
      "u1",
    );
    check(
      "ack: a /send that TIMES OUT on a reachable beacon never respawns — the turn stays the live session's obligation",
      smokeSpawns.length === wedgeSpawnsBefore,
      JSON.stringify({ spawns: smokeSpawns.length - wedgeSpawnsBefore }),
    );
    if (wedgePrevJ === undefined) delete process.env.DISCORD_SEND_TIMEOUT_MS;
    else process.env.DISCORD_SEND_TIMEOUT_MS = wedgePrevJ;
    stopTyping("conv:wedge");
    routing.delete("conv:wedge");
    ledger.delete("conv:wedge");
    streamers.delete("conv:wedge");
    wedgedSrv.close();
  }

  // ---- 6. the real beacon (index.ts): import-parse + factory dry-run against this control port ----
  // This doubles as the index.ts syntax check: a TS file that parses under
  // Node's type stripping imports cleanly (jiti handles a superset).
  const beaconMod = await import(
    pathToFileURL(path.join(HERE, "index.ts")).href
  );
  check(
    "beacon: index.ts imports and exports a factory",
    typeof beaconMod.default === "function",
  );
  {
    // the respawn env contract (production 2026-09-27 triple-delivery): a beacon whose
    // BOT_PORT points at a dead non-canonical port must NEVER gift that free port to a
    // second live bot — the respawned bot always targets the 8790 lock port instead
    const prevBp = process.env.DISCORD_BOT_PORT;
    process.env.DISCORD_BOT_PORT = "60280"; // a dead probe-stub port — the exact incident shape
    let envOk = false,
      envDetail = "";
    try {
      const renv =
        typeof beaconMod.respawnEnv === "function"
          ? beaconMod.respawnEnv()
          : null;
      envOk = renv != null && renv.DISCORD_BOT_PORT === undefined;
      envDetail = JSON.stringify({
        exported: typeof beaconMod.respawnEnv,
        botPort: renv?.DISCORD_BOT_PORT ?? "<dropped>",
      });
    } finally {
      if (prevBp === undefined) delete process.env.DISCORD_BOT_PORT;
      else process.env.DISCORD_BOT_PORT = prevBp;
    }
    check(
      "beacon: respawnEnv drops DISCORD_BOT_PORT — a respawned bot always targets the canonical lock port, never a free stub port",
      envOk,
      envDetail,
    );
  }
  // ---- 6ts. token chain reorder + file->config migration (2026-09-28 webui-beacon alignment) ----
  // chain: env DISCORD_EXT_TOKEN -> config.json ext_token -> discord-token file
  // (read fallback + one-time migration source) -> generate + persist to
  // config. Twin paths only — no check writes the live config.json (the
  // module-scope production resolve already performed the one-time live
  // migration, idempotently, before the smoke started).
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "discord-token-smoke-"));
    const twinCfg = path.join(dir, "config.json");
    const twinTok = path.join(dir, "discord-token");
    const readTwin = () => {
      try {
        return JSON.parse(fs.readFileSync(twinCfg, "utf-8"));
      } catch {
        return null;
      }
    };
    const envPrev = process.env.DISCORD_EXT_TOKEN; // a live-bot env (DISCORD_EXT_TOKEN rides beacon spawns) must survive the smoke
    const envSet = (v) => {
      if (v === undefined) delete process.env.DISCORD_EXT_TOKEN;
      else process.env.DISCORD_EXT_TOKEN = v;
    };
    try {
      // (a) precedence env > config > file — both sides (the bot's chain and the beacon's must stay in sync)
      fs.writeFileSync(
        twinCfg,
        JSON.stringify(
          {
            bot_token: "x",
            presence: { enabled: true },
            ext_token: "cfg-token",
          },
          null,
          2,
        ) + "\n",
        { mode: 0o600 },
      );
      fs.writeFileSync(twinTok, "file-token\n", { mode: 0o600 });
      envSet("env-token");
      const rsA = resolveTokenFor(twinTok, twinCfg);
      const rbA = beaconMod.resolveTokenFor(twinTok, twinCfg);
      check(
        "token: env wins over config and file (both sides)",
        rsA.token === "env-token" &&
          rsA.source === "env" &&
          rbA.token === "env-token" &&
          rbA.source === "env",
        JSON.stringify({ bot: rsA.source, beacon: rbA.source }),
      );
      envSet(undefined);
      const rsB = resolveTokenFor(twinTok, twinCfg);
      const rbB = beaconMod.resolveTokenFor(twinTok, twinCfg);
      const cfgStable = fs.readFileSync(twinCfg, "utf-8");
      check(
        "token: config beats file — and a config-present + stale file pair triggers NO migration (both sides source config, file stays, config untouched)",
        rsB.token === "cfg-token" &&
          rsB.source === "config" &&
          rbB.token === "cfg-token" &&
          rbB.source === "config" &&
          fs.existsSync(twinTok) &&
          fs.readFileSync(twinCfg, "utf-8") === cfgStable,
        JSON.stringify({
          bot: rsB.source,
          beacon: rbB.source,
          fileKept: fs.existsSync(twinTok),
        }),
      );
      // (b) migration: file + config lacking ext_token -> the value lands in config, the file goes away
      fs.writeFileSync(
        twinCfg,
        JSON.stringify(
          { bot_token: "x", presence: { enabled: true } },
          null,
          2,
        ) + "\n",
        { mode: 0o600 },
      );
      fs.writeFileSync(twinTok, "file-token-2\n", { mode: 0o600 });
      const rsM = resolveTokenFor(twinTok, twinCfg);
      const tM = readTwin();
      check(
        "token: file + config lacking ext_token -> one-time migration: config gains the SAME value (every other key kept), file deleted, source config",
        rsM.token === "file-token-2" &&
          rsM.source === "config" &&
          tM?.ext_token === "file-token-2" &&
          tM?.bot_token === "x" &&
          tM?.presence?.enabled === true &&
          !fs.existsSync(twinTok),
        JSON.stringify({
          source: rsM.source,
          valueLanded: tM?.ext_token === "file-token-2",
          keysKept: tM?.bot_token === "x" && !!tM?.presence,
          fileGone: !fs.existsSync(twinTok),
        }),
      );
      {
        const mode = fs.statSync(twinCfg).mode & 0o777;
        const raw = fs.readFileSync(twinCfg, "utf-8");
        check(
          "token: the migration write preserves 0600 + the 2-space indent + trailing newline (atomic rewrite discipline)",
          mode === 0o600 &&
            raw.endsWith("\n") &&
            raw === JSON.stringify(tM, null, 2) + "\n",
          JSON.stringify({ mode, newline: raw.endsWith("\n") }),
        );
      }
      // (c) idempotence: a second resolve reads config and rewrites nothing
      const snap = fs.readFileSync(twinCfg, "utf-8");
      const rsI = resolveTokenFor(twinTok, twinCfg);
      const rbI = beaconMod.resolveTokenFor(twinTok, twinCfg);
      check(
        "token: idempotent — a second resolve (both sides) reads config, rewrites nothing (byte-identical), no file",
        rsI.source === "config" &&
          rbI.source === "config" &&
          rsI.token === "file-token-2" &&
          rbI.token === "file-token-2" &&
          fs.readFileSync(twinCfg, "utf-8") === snap &&
          !fs.existsSync(twinTok),
        JSON.stringify({
          bot: rsI.source,
          beacon: rbI.source,
          bytesStable: fs.readFileSync(twinCfg, "utf-8") === snap,
        }),
      );
      // (d) generated: fresh env -> config gains ext_token, NO token file written
      fs.rmSync(twinCfg, { force: true });
      const rsG = resolveTokenFor(twinTok, twinCfg);
      const tG = readTwin();
      check(
        "token: generated (no env/config/file) -> config gains ext_token (the canonical store, fresh file 0600), no token file written",
        rsG.source === "generated" &&
          typeof rsG.token === "string" &&
          rsG.token.length >= 32 &&
          tG?.ext_token === rsG.token &&
          !fs.existsSync(twinTok) &&
          (fs.statSync(twinCfg).mode & 0o777) === 0o600,
        JSON.stringify({
          source: rsG.source,
          persisted: tG?.ext_token === rsG.token,
          fileWritten: fs.existsSync(twinTok),
        }),
      );
      fs.rmSync(twinCfg, { force: true });
      const rbG = beaconMod.resolveTokenFor(twinTok, twinCfg);
      const tGB = readTwin();
      check(
        "token: the beacon's generated path persists to config too (both migrators agree on the store)",
        rbG.source === "generated" &&
          typeof rbG.token === "string" &&
          tGB?.ext_token === rbG.token &&
          !fs.existsSync(twinTok),
        JSON.stringify({
          source: rbG.source,
          persisted: tGB?.ext_token === rbG.token,
        }),
      );
    } finally {
      if (envPrev === undefined) delete process.env.DISCORD_EXT_TOKEN;
      else process.env.DISCORD_EXT_TOKEN = envPrev;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  const handlers = {};
  const piCalls = { sendUserMessage: [], setSessionName: [] };
  const registeredTools = []; // the discord_thread tool registers through this capture
  const mockPi = {
    on: (ev, fn) => {
      handlers[ev] = fn;
    },
    sendUserMessage: (text, opts) => {
      piCalls.sendUserMessage.push({ text, opts });
    },
    setSessionName: (name) => {
      piCalls.setSessionName.push(name);
    },
    registerTool: (t) => {
      registeredTools.push(t);
    },
  };
  const abortCalls = []; // the /stop route's ctx.abort recorder (the real abort awaits idle — a promise mirrors the shape; the beacon's rejection guard covers both)
  const mockCtx = {
    sessionManager: {
      getSessionId: () => "smoke-session-1",
      getSessionName: () => null,
      getCwd: () => "/tmp",
      getSessionFile: () => path.join(SESSIONS_DIR, "smoke-session-1.jsonl"),
      getHeader: () => ({ timestamp: Date.now() }),
    },
    isIdle: () => true,
    abort: () => {
      abortCalls.push(Date.now());
      return Promise.resolve();
    },
  };
  process.env.DISCORD_BOT_PORT = String(ctlPort);
  process.env.DISCORD_CONV_KEY = "thread:smoke-e2e";
  // the production indirection: the wrapper pid the bot spawned (999999) is
  // never the beacon's pid (process.pid here) — the causal claim routes anyway
  claims.set("thread:smoke-e2e", {
    at: Date.now(),
    cwd: "/tmp",
    known: new Set(),
    sessionId: null,
    spawnPid: 999999,
  });
  const bootLogCap = []; // the beacon's factory-time token-source console.log (webui-aligned wording check)
  const origConLog = console.log;
  console.log = (...a) => bootLogCap.push(a.join(" "));
  try {
    await beaconMod.default(mockPi);
  } finally {
    console.log = origConLog;
  }
  check(
    "token: the beacon logs '[discord-beacon] token source: <source>' (webui-aligned wording — 'internal' dropped)",
    bootLogCap.some((l) => l.startsWith("[discord-beacon] token source:")) &&
      !bootLogCap.some((l) => l.includes("internal token source")),
    JSON.stringify(bootLogCap),
  );
  check(
    "beacon: factory subscribes session_start",
    typeof handlers.session_start === "function",
  );
  check(
    "beacon: the discord_thread tool is registered in discord-tagged sessions (agent-decided threading)",
    registeredTools.some(
      (t) =>
        t?.name === "discord_thread" &&
        typeof t?.execute === "function" &&
        t?.parameters != null,
    ),
    JSON.stringify(registeredTools.map((t) => t?.name)),
  );
  // (tool-description hardening, 2026-09-28: live failure evidence — two shared-channel
  // TASKS narrated in-channel, never threaded. The trigger must ride the TOOL-CHOICE
  // surface — the registered description + guidelines — not just the injected prompt.)
  const threadToolDef = registeredTools.find(
    (t) => t?.name === "discord_thread",
  );
  const ttDesc = String(threadToolDef?.description ?? "");
  check(
    "tool surface: the discord_thread description carries the TASK trigger (call FIRST) and the rule-of-thumb (>1 tool call / delegation)",
    ttDesc.includes(
      'A TASK ("go fix X", "open an MR", "investigate Y", "build Z"',
    ) &&
      ttDesc.includes("FIRST, before starting the work") &&
      ttDesc.includes("more than one tool call") &&
      ttDesc.includes("child agent") &&
      ttDesc.includes(
        "The conversation's Discord guidelines carry the full etiquette",
      ),
    JSON.stringify(ttDesc.slice(0, 140)),
  );
  await handlers.session_start({}, mockCtx);
  let registered = false;
  for (let i = 0; i < 40 && !registered; i++) {
    registered =
      routing.get("thread:smoke-e2e")?.sessionId === "smoke-session-1";
    if (!registered) await sleep(50);
  }
  check(
    "beacon: registers with the bot and routes via the causal claim (beacon pid != wrapper pid)",
    registered &&
      routing.get("thread:smoke-e2e")?.spawnPid === 999999 &&
      routing.get("thread:smoke-e2e")?.pid === process.pid,
  );
  check(
    "beacon: session named on first register (<=26 chars)",
    piCalls.setSessionName.length >= 1 &&
      piCalls.setSessionName[0].startsWith("discord ") &&
      piCalls.setSessionName[0].length <= 26,
    JSON.stringify(piCalls.setSessionName),
  );
  const ok = await beaconSend(
    routing.get("thread:smoke-e2e"),
    "discord says hi",
  );
  check(
    "beacon: /send reaches pi.sendUserMessage when idle",
    ok.ok === true &&
      piCalls.sendUserMessage.length === 1 &&
      piCalls.sendUserMessage[0].text === "discord says hi",
    JSON.stringify(piCalls.sendUserMessage),
  );
  mockCtx.isIdle = () => false;
  await beaconSend(routing.get("thread:smoke-e2e"), "steer this");
  check(
    "beacon: /send steers when busy",
    piCalls.sendUserMessage.length === 2 &&
      piCalls.sendUserMessage[1].opts?.deliverAs === "steer",
    JSON.stringify(piCalls.sendUserMessage),
  );
  // ---- 6t. per-session token + inbound audit (2026-09-24 hardening lap: strict /send+/stop, 16KB cap, one line per request) ----
  {
    mockCtx.isIdle = () => true; // the audit probe rides the idle -> turn path
    const bRoute = routing.get("thread:smoke-e2e");
    const cap = [];
    const origErr = console.error;
    console.error = (...a) => cap.push(a.join(" ")); // the beacon's audit channel is console.error — capture it
    let probe = {};
    try {
      const okSend = await beaconSend(bRoute, "audit probe turn");
      const stopOk = await beaconStop(bRoute);
      // the OLD machine token: a process that scraped discord-token must now be 401-rejected on session traffic
      const legacy = await fetch(
        `http://127.0.0.1:${bRoute.controlPort}/send`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-prime-token": TOKEN,
          },
          body: JSON.stringify({
            text: "machine-token injection must be rejected",
          }),
          signal: AbortSignal.timeout(3000),
        },
      );
      const over = await fetch(`http://127.0.0.1:${bRoute.controlPort}/send`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(bRoute.sessionToken
            ? { "x-prime-token": bRoute.sessionToken }
            : {}),
        },
        body: JSON.stringify({ text: "x".repeat(17 * 1024) }),
        signal: AbortSignal.timeout(3000),
      });
      const hz = await fetch(`http://127.0.0.1:${bRoute.controlPort}/healthz`, {
        signal: AbortSignal.timeout(3000),
      });
      const stray = await fetch(`http://127.0.0.1:${bRoute.controlPort}/nope`, {
        method: "POST",
        headers: {
          ...(bRoute.sessionToken
            ? { "x-prime-token": bRoute.sessionToken }
            : {}),
        },
        signal: AbortSignal.timeout(3000),
      });
      probe = {
        ok: okSend.ok,
        stop: stopOk.ok,
        legacy: legacy.status,
        over: over.status,
        hz: hz.status,
        stray: stray.status,
      };
    } finally {
      console.error = origErr;
    }
    const alines = cap.filter((l) => l.includes("[discord-beacon] audit"));
    check(
      "token: the register carried a per-session token — the route row holds it, never the machine token",
      typeof bRoute.sessionToken === "string" &&
        bRoute.sessionToken.length > 20 &&
        bRoute.sessionToken !== TOKEN,
      JSON.stringify({
        type: typeof bRoute.sessionToken,
        sameAsMachine: bRoute.sessionToken === TOKEN,
      }),
    );
    check(
      "token: beaconSend/beaconStop ride the session token (delivery ok) and the OLD machine token is 401-rejected + legacy-warned on /send",
      probe.ok === true &&
        probe.stop === true &&
        probe.legacy === 401 &&
        cap.some((l) => l.includes("machine-token caller was rejected")),
      JSON.stringify(probe),
    );
    check(
      "cap: a >16KB /send answers 413 with an audit line (bounded blast radius for a runaway injector)",
      probe.over === 413 &&
        alines.some(
          (l) =>
            l.includes("route=/send") &&
            l.includes("outcome=413") &&
            /bytes=1\d{4,}/.test(l),
        ),
      JSON.stringify({
        status: probe.over,
        lines: alines.filter((l) => l.includes("413")),
      }),
    );
    check(
      "audit: one line per /send request — src, short session id, cred, auth, outcome, bytes; the 401 probe logs auth=fail tokenSource=none",
      alines.some(
        (l) =>
          l.includes("route=/send") &&
          l.includes("auth=ok") &&
          l.includes("outcome=turn") &&
          l.includes("tokenSource=session") &&
          /src=127\.0\.0\.1:\d+/.test(l) &&
          /bytes=\d+/.test(l) &&
          l.includes("sessionId=smoke-se"),
      ) &&
        alines.some(
          (l) =>
            l.includes("route=/send") &&
            l.includes("auth=fail") &&
            l.includes("outcome=401") &&
            l.includes("tokenSource=none"),
        ),
      JSON.stringify(alines),
    );
    check(
      "audit: /stop logs outcome=stop, /healthz stays silent (the probe never audits), an authed unknown route logs outcome=404",
      probe.hz === 200 &&
        probe.stray === 404 &&
        alines.some(
          (l) => l.includes("route=/stop") && l.includes("outcome=stop"),
        ) &&
        !alines.some((l) => l.includes("route=/healthz")) &&
        alines.some(
          (l) => l.includes("route=/nope") && l.includes("outcome=404"),
        ),
      JSON.stringify({
        hz: probe.hz,
        stray: probe.stray,
        lines: alines.filter(
          (l) =>
            l.includes("404") || l.includes("healthz") || l.includes("/stop"),
        ),
      }),
    );
    mockCtx.isIdle = () => false; // restore the busy shape the later stop section steers through
  }
  sent.length = 0;
  edits.length = 0;
  typings.length = 0;
  streamerOf("thread:smoke-e2e").channelId = "chan-e2e";
  streamerOf("thread:smoke-e2e").triggerMessageId = "trig-e2e";
  await handlers.message_update({
    message: {
      role: "assistant",
      content: [{ type: "text", text: "beacon streams one" }],
    },
  });
  await new Promise((res) => setTimeout(res, 100));
  check(
    "beacon: message_update forwarded -> preview created",
    sent.length === 1 && sent[0].content === "beacon streams one",
    JSON.stringify(sent),
  );
  await handlers.message_end({
    message: {
      role: "assistant",
      content: [{ type: "text", text: "beacon final answer" }],
    },
  });
  await new Promise((res) => setTimeout(res, 100));
  check(
    "beacon: message_end forwarded -> finalize edits the preview",
    edits.some((e) => e.content === "beacon final answer"),
    JSON.stringify(edits),
  );
  // hygiene sweep (delivery-UX round 2): dispatch-armed typing intervals from
  // sections whose turns never settled (dbl/recd/recovery replays — the streamer
  // deletes in their cleanups predate dispatch-time typing) must never tick into
  // the exact typings-count windows below
  for (const [k, st] of streamers) if (st.typingTimer) stopTyping(k);
  // ---- 6a. turn signals + the name_session guard (production 2026-09-27 worker-death / stuck-👀 fixes) ----
  check(
    "beacon: subscribes turn_start (the redundant busy:true signal — probe-proven: the first agent_start races the register flush)",
    typeof handlers.turn_start === "function",
  );
  check(
    "beacon: turn_end is deliberately NOT forwarded — a mid-run tool turn would settle the trigger early (the 2026-09-26 ⚠️-incident shape)",
    handlers.turn_end === undefined,
  );
  {
    const stB = streamerOf("thread:smoke-e2e");
    stB.channelId = "chan-e2e"; // startTyping needs an anchored channel
    const typingsBefore = typings.length;
    await handlers.turn_start();
    await until(() => stB.busy === true);
    check(
      "beacon: turn_start forwards busy:true — the bot flips the streamer busy, starts typing, arms the watchdog",
      stB.busy === true && stB.typingTimer != null && stB.turnTimer != null,
      JSON.stringify({
        busy: stB.busy,
        typing: stB.typingTimer != null,
        timer: stB.turnTimer != null,
      }),
    );
    const timerFirst = stB.turnTimer,
      typingFirst = stB.typingTimer;
    await handlers.agent_start(); // the redundant signal arriving late — must not double-start
    await new Promise((res) => setTimeout(res, 150));
    check(
      "beacon: a late second busy signal never double-starts the typing loop (startTyping idempotent — the first busy's immediate tick posts exactly one typing, the second adds none)",
      stB.typingTimer === typingFirst && typings.length === typingsBefore + 1,
      JSON.stringify({
        sameTimer: stB.typingTimer === typingFirst,
        typings: typings.length - typingsBefore,
      }),
    );
    await handlers.agent_end(); // settle: busy:false clears typing + watchdog
    await until(() => stB.busy === false);
    check(
      "beacon: agent_end forwards busy:false — typing stops, the watchdog clears",
      stB.busy === false && stB.typingTimer === null && stB.turnTimer === null,
      JSON.stringify({
        busy: stB.busy,
        typing: stB.typingTimer === null,
        timer: stB.turnTimer === null,
      }),
    );
    check(
      "beacon: timerFirst was armed then replaced (armTurnTimer re-arms per signal — the watchdog survived the redundant flip)",
      timerFirst != null,
    );
    // the worker-death guard: name_session's pi.setSessionName is fire-and-forget in the
    // name-sessions extension — a supervisor name-collision rejection escapes as an
    // unhandled rejection and KILLS the session worker (witnessed + probe-reproduced).
    const blockRes = await handlers.tool_call({
      type: "tool_call",
      toolCallId: "tc-1",
      toolName: "name_session",
      input: { name: "bad idea" },
    });
    check(
      "beacon: name_session is blocked benignly in discord-tagged sessions (the worker-death guard)",
      blockRes?.block === true &&
        String(blockRes.reason ?? "").includes("managed"),
      JSON.stringify(blockRes),
    );
    const passthrough = await handlers.tool_call({
      type: "tool_call",
      toolCallId: "tc-2",
      toolName: "bash",
      input: { command: "echo hi" },
    });
    check(
      "beacon: every other tool passes the guard untouched",
      passthrough === undefined,
      JSON.stringify(passthrough),
    );
  }
  // ---- 6s. /stop (busy-UX, hermes-catalog #1): stop the CURRENT turn, keep the session ----
  {
    const bRoute = routing.get("thread:smoke-e2e");
    const stStop = streamerOf("thread:smoke-e2e");
    ledger.set("thread:smoke-e2e", {
      sessionId: "smoke-session-1",
      cwd: "/tmp",
      channel_id: "chan-stop",
      created: nowIso(),
      lastActive: nowIso(),
    }); // a routed register UPDATES ledger rows, never creates them — /stop resolves the conversation through the ledger, so the row exists here only for the check
    channels.set("smoke-e2e", { id: "smoke-e2e", type: 11, parent_id: "c1" }); // the interaction's thread channel resolves to the same convKey the beacon holds
    // (a) the beacon /stop route: token-gated ctx.abort (the webui POST /abort twin)
    let sresp = await fetch(`http://127.0.0.1:${bRoute.controlPort}/stop`, {
      method: "POST",
      signal: AbortSignal.timeout(3000),
    });
    check(
      "stop: beacon /stop without the token is 401 (fail-closed, like /send)",
      sresp.status === 401,
    );
    const abortsAfterRoute = abortCalls.length; // the 401 never reached the handler — no abort may have fired
    sresp = await fetch(`http://127.0.0.1:${bRoute.controlPort}/stop`, {
      method: "POST",
      headers: { "x-prime-token": bRoute.sessionToken ?? TOKEN },
      signal: AbortSignal.timeout(3000),
    }); // the per-session token since the 2026-09-24 hardening — the machine token 401s
    const sbody = await sresp.json();
    check(
      "stop: beacon /stop with the token answers 200 {ok:true} and calls ctx.abort exactly once",
      sresp.status === 200 &&
        sbody?.ok === true &&
        abortCalls.length === abortsAfterRoute + 1,
      JSON.stringify({
        status: sresp.status,
        body: sbody,
        aborts: abortCalls.length - abortsAfterRoute,
      }),
    );
    // (c1) idle: a mapped conversation with no turn in flight never aborts the session
    const stopIdle = await stopConv(
      { guild_id: "g1", channel_id: "smoke-e2e" },
      baseCfg(),
    );
    check(
      "stop: /stop on a mapped conversation with no turn in flight says 'nothing running' and aborts nothing",
      stopIdle.includes("nothing running") &&
        abortCalls.length === abortsAfterRoute + 1,
      stopIdle,
    );
    // (c2) busy: the production path — a dispatched turn (pendingAck) with agent_start's busy flip, then /stop POSTs to the beacon and replies in-channel
    stStop.channelId = "chan-stop";
    stStop.triggerChannelId = "chan-stop";
    stStop.triggerMessageId = "trig-stop";
    stStop.pendingAck = true;
    stStop.resolved = null; // the dispatch anchor shape (streamerOf + dispatchToConversation's st fields)
    await handlers.agent_start();
    await until(() => stStop.busy === true);
    const abortsBeforeStop = abortCalls.length;
    const stopBusy = await stopConv(
      { guild_id: "g1", channel_id: "smoke-e2e" },
      baseCfg(),
    );
    check(
      "stop: /stop on a busy conversation POSTs to the beacon (ctx.abort fires) and replies 'stopping the current turn'",
      stopBusy.includes("stopping the current turn") &&
        stopBusy.includes("queued messages resume") &&
        abortCalls.length === abortsBeforeStop + 1,
      JSON.stringify({
        reply: stopBusy,
        aborts: abortCalls.length - abortsBeforeStop,
      }),
    );
    // (d) the settle: agent_end still fires after ctx.abort, and the EXISTING busy-settle
    // resolves the stopped turn — no new ack path (⚠️ if nothing landed: the operator
    // stopped it; the provenance line names via busy-settle, the tool-only-turn path)
    const origErrStop = console.error;
    const capStop = [];
    console.error = (...a) => capStop.push(a.join(" ")); // log() dereferences console.error at call time
    let settled = false,
      stopWarn = false;
    try {
      await handlers.agent_end(); // the worker still emits agent_end after the abort
      settled = await until(
        () => stStop.pendingAck === false && stStop.resolved?.ok === false,
        5000,
      ); // ackFinal paces its swap — settle-poll, never read reactively
      stopWarn = await until(
        () =>
          !loadConfig().reactions ||
          reactions.some(
            (r) =>
              r.op === "PUT" && r.emoji === "⚠️" && r.messageId === "trig-stop",
          ),
        5000,
      );
    } finally {
      console.error = origErrStop;
      for (const l of capStop) console.error(l);
    } // re-emit EVERYTHING the window swallowed
    check(
      "stop: post-abort agent_end settles the stopped turn through the EXISTING busy-settle (no new ack path) — provenance present, ⚠️ if nothing landed, no stranded 👀",
      settled &&
        stopWarn &&
        stStop.busy === false &&
        stStop.typingTimer == null &&
        stStop.turnTimer == null &&
        capStop.some(
          (l) =>
            l.includes("ackFinal(failed) via busy-settle") &&
            l.includes("trig-stop"),
        ),
      JSON.stringify({
        settled,
        stopWarn,
        busy: stStop.busy,
        pendingAck: stStop.pendingAck,
        resolved: stStop.resolved,
        prov: capStop
          .filter((l) => l.includes("ackFinal"))
          .map((l) => l.slice(0, 100)),
      }),
    );
    ledger.delete("thread:smoke-e2e");
    channels.delete("smoke-e2e"); // hygiene: no state survives the section
    stopTyping("thread:smoke-e2e"); // the settle already stopped it — belt and braces against an early check exit
    streamers.delete("thread:smoke-e2e");
  }
  // ---- 6r. TUI relay (discord-visibility lap): external user input lands on the surface ----
  // The beacon's input handler is the extraction point: the pi `input` event
  // carries the turn's raw user text + its source. Everything the bot's /send
  // injected is ALREADY the user's own Discord message — the pending-match
  // consumes it, never relays. Everything else (the operator's TUI / daemon
  // client) POSTs /internal/relay; the bot posts it on the conversation's
  // surface with a provenance tag WITHOUT dispatching (zero spawn records,
  // zero batchers — the relay handler holds no dispatch call, and the
  // admission ladder's self gate would drop the bot's own post anyway).
  {
    const capRelay = [];
    const origErrRelay = console.error;
    console.error = (...a) => capRelay.push(a.join(" ")); // log() dereferences console.error at call time — the audit + relay lines land here
    try {
      ledger.set("thread:smoke-e2e", {
        sessionId: "smoke-session-1",
        cwd: "/tmp",
        channel_id: "chan-relay",
        created: nowIso(),
        lastActive: nowIso(),
      }); // 6s deleted the row — the relay resolves the surface through it
      check(
        "relay: beacon subscribes input (the extraction point: the turn's raw user text + its source)",
        typeof handlers.input === "function",
      );
      const relayAudit = () =>
        capRelay.filter(
          (l) => l.includes("route=/internal/relay") && l.includes("auth=ok"),
        );
      // (a) external input (no /send) -> ONE relay POST + the attribution post + ZERO dispatch
      const spawnsBeforeRelay = smokeSpawns.length;
      await handlers.input({
        text: "typed from the tui",
        source: "interactive",
      });
      const relayLanded = await until(() =>
        sent.some(
          (s) =>
            s.channelId === "chan-relay" &&
            s.content === "*(via tui):*\ntyped from the tui",
        ),
      );
      check(
        "relay: external user input lands on the surface attributed — ONE authed relay audit line, ONE post, chunk 1 carries no reply reference",
        relayLanded &&
          relayAudit().length === 1 &&
          sent.some(
            (s) =>
              s.channelId === "chan-relay" &&
              s.content === "*(via tui):*\ntyped from the tui" &&
              s.opts.replyTo == null,
          ),
        JSON.stringify({
          audit: relayAudit(),
          posts: sent.filter((s) => s.channelId === "chan-relay"),
        }),
      );
      check(
        "relay: the relay path never dispatches — zero spawn records, zero batchers (no re-entry into the agent)",
        smokeSpawns.length === spawnsBeforeRelay && batchers.size === 0,
        JSON.stringify({
          spawns: smokeSpawns.length - spawnsBeforeRelay,
          batchers: [...batchers.keys()],
        }),
      );
      // (b) /send-sourced input: the text is already the user's own Discord message — never relayed
      await beaconSend(
        routing.get("thread:smoke-e2e"),
        "discord already shows this one",
      );
      await handlers.input({
        text: "discord already shows this one",
        source: "extension",
      }); // the runtime's own emitInput for the /send-injected message
      await sleep(200); // negative window — a would-be relay POST would have landed
      check(
        "relay: /send-sourced input is consumed by the pending-match — no relay POST, no surface post",
        relayAudit().length === 1 &&
          sent.filter((s) => s.channelId === "chan-relay").length === 1,
        JSON.stringify({
          audit: relayAudit().length,
          posts: sent.filter((s) => s.channelId === "chan-relay").length,
        }),
      );
      // (c) the knob: the beacon gate (no POST at all) + the bot-side belt (a stale beacon's POST answers 200, posts nothing)
      const relayEnvPrev = process.env.DISCORD_RELAY_EXTERNAL;
      process.env.DISCORD_RELAY_EXTERNAL = "false";
      try {
        await handlers.input({
          text: "gated by the knob",
          source: "interactive",
        });
        await sleep(200); // negative window
        const auditBeforeGated = relayAudit().length; // the beacon gate's proof: no POST fired, the count is still the (a) line's
        const postsBeforeGated = sent.filter(
          (s) => s.channelId === "chan-relay",
        ).length;
        let gatedCtl = {};
        try {
          const respG = await ctl("/internal/relay", {
            method: "POST",
            headers: hdr,
            body: JSON.stringify({
              sessionId: "smoke-session-1",
              text: "gated direct post",
              source: "interactive",
            }),
          });
          gatedCtl = { status: respG.status, body: await respG.json() };
        } catch (e) {
          gatedCtl = { error: String(e?.message ?? e) };
        }
        check(
          "relay: relay_external=false — the beacon never POSTs (no new audit line) and the bot-side gate answers 200 {ok, relayed:false} with zero posts (one audit line of its own)",
          relayAudit().length === auditBeforeGated + 1 &&
            sent.filter((s) => s.channelId === "chan-relay").length ===
              postsBeforeGated &&
            gatedCtl.status === 200 &&
            gatedCtl.body?.ok === true &&
            gatedCtl.body?.relayed === false,
          JSON.stringify({
            auditBefore: auditBeforeGated,
            auditAfter: relayAudit().length,
            posts:
              sent.filter((s) => s.channelId === "chan-relay").length -
              postsBeforeGated,
            ctl: gatedCtl,
          }),
        );
      } finally {
        if (relayEnvPrev === undefined)
          delete process.env.DISCORD_RELAY_EXTERNAL;
        else process.env.DISCORD_RELAY_EXTERNAL = relayEnvPrev;
      }
      // route shape: 401 without token, 400 bad payload, 409 unrouted session (the /internal/thread shapes)
      let respRelay = await ctl("/internal/relay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "x", text: "no token" }),
      });
      check(
        "relay: /internal/relay without the token is 401 (fail-closed, like every internal route)",
        respRelay.status === 401,
      );
      respRelay = await ctl("/internal/relay", {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({ sessionId: "smoke-session-1", text: "   " }),
      });
      check(
        "relay: an empty-text relay payload answers 400",
        respRelay.status === 400,
      );
      respRelay = await ctl("/internal/relay", {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({ sessionId: "not-routed", text: "no surface" }),
      });
      check(
        "relay: a relay for an unrouted session answers 409 with guidance",
        respRelay.status === 409 &&
          typeof (await respRelay.json())?.error === "string",
      );
      // (d) long input -> chunked, paced, reply-chained — the finalize split discipline without the ack machinery
      const pacePrev = process.env.DISCORD_SEND_PACE_MS;
      process.env.DISCORD_SEND_PACE_MS = "10"; // keep the paced chunk chain fast — the pacing mechanism itself is finalize's 4b check
      const postsBeforeLong = sent.filter(
        (s) => s.channelId === "chan-relay",
      ).length;
      await handlers.input({
        text: "long tui turn: " + "y".repeat(4200),
        source: "rpc",
      });
      const longOk = await until(
        () =>
          sent.filter((s) => s.channelId === "chan-relay").length -
            postsBeforeLong >=
          3,
        5000,
      );
      if (pacePrev === undefined) delete process.env.DISCORD_SEND_PACE_MS;
      else process.env.DISCORD_SEND_PACE_MS = pacePrev;
      const longPosts = sent
        .filter((s) => s.channelId === "chan-relay")
        .slice(postsBeforeLong);
      check(
        "relay: long input splits — chunk 1 carries the attribution header, every chunk <= SPLIT_THRESHOLD, every chunk posts PLAIN (2026-09-24 operator rule: a relay block references nothing)",
        longOk &&
          longPosts.length >= 3 &&
          longPosts.every((s) => s.content.length <= SPLIT_THRESHOLD) &&
          longPosts[0]?.content.startsWith("*(via tui):*\n") &&
          longPosts.every((s) => s.opts.replyTo == null),
        JSON.stringify({
          count: longPosts.length,
          lens: longPosts.map((s) => s.content.length),
          refs: longPosts.map((s) => s.opts.replyTo),
        }),
      );
      ledger.delete("thread:smoke-e2e"); // hygiene — no state survives the section
    } finally {
      console.error = origErrRelay;
      for (const l of capRelay) console.error(l);
    } // re-emit EVERYTHING the window swallowed
  }
  await handlers.session_shutdown({ reason: "quit" }, mockCtx);
  check(
    "beacon: shutdown unregisters",
    routing.has("thread:smoke-e2e") === false &&
      sessions.has("smoke-session-1") === false,
  );
  claims.delete("thread:smoke-e2e");
  delete process.env.DISCORD_CONV_KEY;
  fakeBeacon.close();
  control.close();

  // ---- 6b. beacon prompt injection: tagged sessions learn their Discord surface ----
  // before_agent_start (name-sessions precedent): APPEND to event.systemPrompt.
  // The first beacon instance above carries convKey thread:smoke-e2e; its
  // handler reads env + config.json per call, so every knob below rides env.
  const BASE_SP = "BASE SYSTEM PROMPT.";
  const injectOn = loadConfig().guidelines; // env > config.json — the beacon's own resolution mirrored (keep both in sync)
  if (injectOn) {
    check(
      "inject: beacon subscribes before_agent_start",
      typeof handlers.before_agent_start === "function",
    );
    // (a) tagged + defaults: live-context block + the guidelines file, appended — never replacing
    const inj = await handlers.before_agent_start({ systemPrompt: BASE_SP });
    check(
      "inject: tagged session gains the live-surface line and the guidelines title in its system prompt",
      typeof inj?.systemPrompt === "string" &&
        inj.systemPrompt.startsWith(BASE_SP) &&
        inj.systemPrompt.length > BASE_SP.length &&
        inj.systemPrompt.includes("## Discord context") &&
        inj.systemPrompt.includes("a Discord thread") &&
        inj.systemPrompt.includes("thread:smoke-e2e") &&
        inj.systemPrompt.includes("# Discord conversation guidelines"),
      JSON.stringify(inj && inj.systemPrompt.slice(0, 220)),
    );
    // (c) the knob kills the whole injection (env-gated like the reactions ack)
    process.env.DISCORD_GUIDELINES = "false";
    const offInj = await handlers.before_agent_start({ systemPrompt: BASE_SP });
    delete process.env.DISCORD_GUIDELINES; // restore — a shell-provided gate must survive the smoke
    check(
      "inject: guidelines=false injects nothing for a tagged session",
      offInj === undefined,
      JSON.stringify(offInj),
    );
    // (d) missing guidelines file: degrade — context block still injects, file content absent, ONE warn per session
    process.env.DISCORD_GUIDELINES_FILE = path.join(
      HERE,
      "no-such-discord-guidelines.md",
    );
    const capErr = console.error,
      captured = [];
    console.error = (...a) => captured.push(a.join(" ")); // the beacon warns via console.error
    let missInj;
    try {
      missInj = await handlers.before_agent_start({ systemPrompt: BASE_SP });
      await handlers.before_agent_start({ systemPrompt: BASE_SP }); // second call — the warn must not repeat
    } finally {
      console.error = capErr;
    }
    delete process.env.DISCORD_GUIDELINES_FILE;
    const warns = captured.filter((l) =>
      l.includes("guidelines file unreadable"),
    );
    check(
      "inject: missing guidelines file degrades — context injected, file content absent, one warn per session",
      typeof missInj?.systemPrompt === "string" &&
        missInj.systemPrompt.includes("## Discord context") &&
        missInj.systemPrompt.includes("a Discord thread") &&
        !missInj.systemPrompt.includes("# Discord conversation guidelines") &&
        warns.length === 1,
      JSON.stringify(warns),
    );
    // (e) DISCORD_GUIDELINES_FILE env override resolves (marker content, not the default file)
    const tmpGuide = path.join(
      os.tmpdir(),
      `discord-guidelines-smoke-${Date.now()}.md`,
    );
    fs.writeFileSync(tmpGuide, "# Smoke guidelines\nSMOKE-GUIDELINES-MARKER\n");
    let envInj;
    try {
      process.env.DISCORD_GUIDELINES_FILE = tmpGuide;
      envInj = await handlers.before_agent_start({ systemPrompt: BASE_SP });
    } finally {
      delete process.env.DISCORD_GUIDELINES_FILE;
      fs.rmSync(tmpGuide, { force: true });
    }
    check(
      "inject: DISCORD_GUIDELINES_FILE env override resolves the injected content",
      envInj?.systemPrompt?.includes("SMOKE-GUIDELINES-MARKER") === true &&
        envInj.systemPrompt.includes("# Smoke guidelines") &&
        !envInj.systemPrompt.includes("# Discord conversation guidelines"),
      JSON.stringify(envInj && envInj.systemPrompt.slice(0, 220)),
    );
    // (b) untagged session (the operator's interactive sessions): no injection, ever
    await beaconMod.default(mockPi); // fresh factory — DISCORD_CONV_KEY is deleted above, so convTag is null
    const unInj = await handlers.before_agent_start({ systemPrompt: BASE_SP });
    check(
      "inject: untagged session gets no injection",
      unInj === undefined,
      JSON.stringify(unInj),
    );
    const untaggedBlock = await handlers.tool_call({
      type: "tool_call",
      toolCallId: "tc-u",
      toolName: "name_session",
      input: { name: "operator choice" },
    });
    check(
      "guard: untagged sessions keep name_session (the worker-death guard is discord-tagged only)",
      untaggedBlock === undefined,
      JSON.stringify(untaggedBlock),
    );
  }
  // whole-run gate proof: a guidelines-off run (DISCORD_GUIDELINES=false) injects
  // nothing for tagged sessions; the on-runs prove the positive inside the block above
  process.env.DISCORD_CONV_KEY = "thread:inject-gate-proof";
  await beaconMod.default(mockPi);
  const gateInj = await handlers.before_agent_start({ systemPrompt: BASE_SP });
  check(
    "inject: whole-run gate — a tagged session injects iff guidelines is enabled",
    injectOn
      ? typeof gateInj?.systemPrompt === "string" &&
          gateInj.systemPrompt.includes("# Discord conversation guidelines")
      : gateInj === undefined,
    `on=${injectOn} inj=${JSON.stringify(
      gateInj && gateInj.systemPrompt.slice(0, 160),
    )}`,
  );
  delete process.env.DISCORD_CONV_KEY;

  // ---- 6c. discord_thread tool round trip: the agent decides (thread_policy "agent") ----
  // A second beacon instance on a CHANNEL conversation drives the real tool: the
  // execute POSTs the bot's /internal/thread; the bot creates a PUBLIC thread from
  // the conversation's current trigger (type 11 + author member-add, exactly like
  // the auto-thread path), re-keys ledger/routing/claim/streamer to thread:<id>
  // (SAME session — no respawn), and the tool result carries the thread id. The
  // next message_end then finalizes INTO the thread.
  {
    const toolsBeforeUntagged = registeredTools.length;
    await beaconMod.default(mockPi); // untagged factory (DISCORD_CONV_KEY is deleted above) — the operator's interactive sessions never get the tool
    check(
      "beacon: an untagged session never registers discord_thread",
      registeredTools.length === toolsBeforeUntagged,
      JSON.stringify(registeredTools.map((t) => t?.name)),
    );
    // section 6 closed the bot's control server — re-bind it (ephemeral, never 8790):
    // the 6c beacon registers and the tool POSTs through it
    const ctlPortTool = await new Promise((resolve) =>
      control.listen(0, "127.0.0.1", () => resolve(control.address().port)),
    );
    process.env.DISCORD_BOT_PORT = String(ctlPortTool);
    const toolsBefore = registeredTools.length;
    process.env.DISCORD_CONV_KEY = "channel:c-tool";
    const mockCtxTool = {
      sessionManager: {
        getSessionId: () => "smoke-tool-1",
        getSessionName: () => null,
        getCwd: () => "/tmp",
        getSessionFile: () => path.join(SESSIONS_DIR, "smoke-tool-1.jsonl"),
        getHeader: () => ({ timestamp: Date.now() }),
      },
      isIdle: () => true,
    };
    await beaconMod.default(mockPi); // registers the tool again (per-session factory)
    check(
      "beacon: a fresh tagged session registers its tool pair again (discord_thread + session_topic, one per session)",
      registeredTools.length === toolsBefore + 2 &&
        registeredTools
          .slice(-2)
          .map((t) => t?.name)
          .join(",") === "discord_thread,session_topic",
      JSON.stringify(registeredTools.map((t) => t?.name)),
    );
    await handlers.session_start({}, mockCtxTool);
    claimFor("channel:c-tool", { sessionId: "smoke-tool-1", spawnPid: 7777 }); // resume-shaped claim: the beacon's register routes by sessionId
    let toolRegistered = false;
    for (let i = 0; i < 40 && !toolRegistered; i++) {
      toolRegistered =
        routing.get("channel:c-tool")?.sessionId === "smoke-tool-1";
      if (!toolRegistered) await sleep(50);
    }
    check(
      "beacon: the tool beacon session registers and routes its channel conversation",
      toolRegistered,
      JSON.stringify(routing.get("channel:c-tool")),
    );
    // anchor the streamer exactly like dispatchToConversation does (trigger in the channel)
    ledger.set("channel:c-tool", {
      sessionId: "smoke-tool-1",
      cwd: "/tmp",
      channel_id: "c1",
      created: nowIso(),
      lastActive: nowIso(),
    });
    const stTool = streamerOf("channel:c-tool");
    stTool.channelId = "c1";
    stTool.triggerChannelId = "c1";
    stTool.triggerMessageId = "m-tool";
    stTool.triggerAuthorId = "u1";
    const threadsBefore = threads.length,
      addsBefore = memberAdds.length;
    const toolDef = registeredTools
      .filter((t) => t?.name === "discord_thread")
      .pop(); // by name — session_topic registers after discord_thread now
    const toolRes = await toolDef.execute("call-1", {
      name: "pr summary thread",
    });
    const toolText = (toolRes?.content ?? []).map((c) => c.text).join(" ");
    const toolThread = threads[threadsBefore];
    check(
      "tool: discord_thread executes and returns the new thread id to the agent",
      threads.length === threadsBefore + 1 &&
        toolThread?.channelId === "c1" &&
        toolThread?.messageId === "m-tool" &&
        toolThread?.type === 11 &&
        toolThread?.name === "pr summary thread" &&
        toolText.includes("t-m-tool"),
      JSON.stringify({ thread: toolThread, toolText }),
    );
    {
      // webui: ambient-conditional — the injected run proves the tool result carries the link, the default run proves it does not
      const base = loadConfig().webui_base_url;
      check(
        "webui: the discord_thread tool result matches the webui knob (conversation ui link when enabled, none when off)",
        base
          ? toolText.includes(`${base}#/s/smoke-tool-1`)
          : !toolText.includes("#/s/"),
        toolText,
      );
    }
    check(
      "tool: the thread is PUBLIC (type 11) and the trigger author is added to its members — exactly like the auto-thread path",
      toolThread?.type === 11 &&
        memberAdds.length === addsBefore + 1 &&
        memberAdds[addsBefore]?.threadId === "t-m-tool" &&
        memberAdds[addsBefore]?.userId === "u1",
      JSON.stringify({
        type: toolThread?.type,
        adds: memberAdds.slice(addsBefore),
      }),
    );
    check(
      "tool: the conversation re-keys to thread:<newId> with the SAME session (no respawn) across ledger/routing/claim/streamer",
      !ledger.has("channel:c-tool") &&
        ledger.get("thread:t-m-tool")?.sessionId === "smoke-tool-1" &&
        ledger.get("thread:t-m-tool")?.channel_id === "t-m-tool" &&
        !routing.has("channel:c-tool") &&
        routing.get("thread:t-m-tool")?.sessionId === "smoke-tool-1" &&
        !claims.has("channel:c-tool") &&
        claims.get("thread:t-m-tool")?.sessionId === "smoke-tool-1" &&
        !streamers.has("channel:c-tool") &&
        streamers.get("thread:t-m-tool") === stTool,
      JSON.stringify({
        ledger: ledger.get("thread:t-m-tool"),
        routing: routing.get("thread:t-m-tool"),
        claim: claims.get("thread:t-m-tool"),
      }),
    );
    check(
      "tool: the streamer now targets the thread — the reply lands there",
      streamers.get("thread:t-m-tool")?.channelId === "t-m-tool",
      JSON.stringify({
        channelId: streamers.get("thread:t-m-tool")?.channelId,
      }),
    );
    // the beacon's env tag is frozen at spawn time: its heartbeats keep registering
    // under the OLD key — with the old claim gone they stay display-only (no resurrection)
    const hbTool = await onRegister({
      sessionId: "smoke-tool-1",
      controlPort: routing.get("thread:t-m-tool")?.controlPort ?? 0,
      pid: process.pid,
      convKey: "channel:c-tool",
      status: "idle",
    });
    check(
      "tool: the promoted beacon's old-key heartbeat stays display-only — the old route never resurrects",
      hbTool.body.routed === false &&
        routing.get("thread:t-m-tool")?.sessionId === "smoke-tool-1" &&
        !routing.has("channel:c-tool"),
      JSON.stringify({
        routed: hbTool.body.routed,
        threadRoute: routing.get("thread:t-m-tool") != null,
        channelRoute: routing.has("channel:c-tool"),
      }),
    );
    // the reply after the tool call finalizes INTO the thread; the ✅ ack still lands on the channel trigger
    const sentBeforeTool = sent.filter(
      (s) => s.channelId === "t-m-tool",
    ).length;
    await onBeaconEvent("smoke-tool-1", "message_end", {
      text: "the reply that lands in the thread",
    });
    check(
      "tool: the post-tool reply finalizes into the thread channel",
      sent.filter((s) => s.channelId === "t-m-tool").length ===
        sentBeforeTool + 1 &&
        sent.some(
          (s) =>
            s.channelId === "t-m-tool" &&
            s.content.startsWith("the reply that lands in the thread"),
        ), // startsWith: a resolved webui_base_url appends the one-shot first-response link to a promoted thread's FIRST reply — the channel routing is the assertion here
      JSON.stringify(sent.filter((s) => s.channelId === "t-m-tool")),
    );
    const toolAckOk = await until(
      () =>
        !loadConfig().reactions ||
        reactions.some(
          (r) =>
            r.op === "PUT" &&
            r.emoji === "✅" &&
            r.channelId === "c1" &&
            r.messageId === "m-tool",
        ),
    );
    check(
      "tool: the delivered turn still acks ✅ on the CHANNEL trigger (the operator sees it where the conversation started)",
      toolAckOk,
      JSON.stringify(reactions.filter((r) => r.messageId === "m-tool")),
    );
    await handlers.session_shutdown({ reason: "quit" }, mockCtxTool);
    claims.delete("thread:t-m-tool");
    ledger.delete("thread:t-m-tool");
    streamers.delete("thread:t-m-tool");
    routing.delete("thread:t-m-tool");
    delete process.env.DISCORD_CONV_KEY;
  }

  // ---- 6d. presence v2/v3: the visible member-list line reads the active conversation; idle mirrors the state text ----
  // Operator ask (2026-09-27, witnessed live): the activity NAME — the visible
  // "Playing …" line — must show the ACTIVE conversation's session name.
  // v3 (2026-09-28, idle-name consistency): at idle the NAME mirrors the idle
  // STATE text (both lines read "listening"); `name` is the deep fallback when
  // idle_state is empty. A LOCAL presence instance (fake clock + recording
  // wsSend, the harness pattern) drives the module contract — the live
  // instance defers while the gateway is down (smoke = gateway down).
  {
    const pcfg = {
      enabled: true,
      type: 0,
      name: "prime-agent",
      state_template: "{task} · {children}",
      idle_state: "listening",
      status: "auto",
      debounce_ms: 3000,
    };
    const opSent = [];
    let t = 0; // fake clock, one fire per refresh spaced past PRESENCE_WINDOW_MS — the 4/20s cap never bites
    const timers = new Map();
    const clock = {
      now: () => t,
      schedule: (fn) => {
        const id = timers.size + 1;
        timers.set(id, fn);
        return id;
      },
      cancel: (id) => {
        timers.delete(id);
      },
      fire: () => {
        t += PRESENCE_WINDOW_MS;
        for (const fn of [...timers.values()]) fn();
        timers.clear();
      },
    };
    const rows = new Map();
    const local = createPresence({
      wsSend: (op, d) => opSent.push({ op, d }),
      gatewayState: () => "connected",
      getConfig: () => ({ presence: pcfg }),
      now: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
    });
    const refresh = () => {
      local.refreshFromSessions(rows);
      clock.fire();
    };
    refresh(); // idle baseline
    check(
      "presence v3: idle -> BOTH lines read the idle state text (name == state == the idle_state value)",
      opSent.length === 1 &&
        opSent[0].op === 3 &&
        opSent[0].d.activities[0].name === "listening" &&
        opSent[0].d.status === "online" &&
        opSent[0].d.activities[0].state === "listening",
      JSON.stringify(opSent.map((s) => s.d.activities[0])),
    );
    rows.set("v2-a", {
      sessionId: "v2-a",
      name: "discord presence polish",
      status: "working",
      routed: true,
      lastBusyAt: 100,
      lastSeen: 100,
    });
    refresh();
    check(
      "presence v2: an active routed session -> the visible activity name IS its session name",
      opSent.length === 2 &&
        opSent[1].d.activities[0].name === "discord presence polish" &&
        opSent[1].d.status === "online" &&
        opSent[1].d.activities[0].state === "discord presence polish",
      JSON.stringify(opSent.map((s) => s.d.activities[0])),
    );
    rows.clear();
    rows.set("v2-b", {
      sessionId: "v2-b",
      name: "x".repeat(300),
      status: "working",
      routed: true,
      lastBusyAt: 200,
      lastSeen: 200,
    });
    refresh();
    check(
      "presence v2: the activity name clamps to the 128-char field limit",
      opSent.length === 3 && opSent[2].d.activities[0].name.length === 128,
      JSON.stringify({ len: opSent[2]?.d?.activities?.[0]?.name?.length }),
    );
    rows.clear();
    rows.set("v2-c", {
      sessionId: "v2-c",
      name: "operator interactive lap",
      status: "working",
      routed: false,
      lastBusyAt: 300,
      lastSeen: 300,
    });
    refresh();
    check(
      "presence v3: unrouted-only work keeps the idle state text on the name line (machine-wide state stays click-to-see)",
      opSent.length === 4 &&
        opSent[3].d.activities[0].name === "listening" &&
        opSent[3].d.status === "online" &&
        opSent[3].d.activities[0].state === "operator interactive lap",
      JSON.stringify(opSent.map((s) => s.d.activities[0])),
    );
    rows.clear(); // back to idle
    refresh();
    check(
      "presence v3: back to idle -> the idle state text again",
      opSent.length === 5 &&
        opSent[4].d.activities[0].name === "listening" &&
        opSent[4].d.status === "online",
      JSON.stringify(opSent.map((s) => s.d.activities[0])),
    );
    rows.set("v2-d", {
      sessionId: "v2-d",
      name: "discord older lap",
      status: "working",
      routed: true,
      lastBusyAt: 400,
      lastSeen: 400,
    });
    rows.set("v2-e", {
      sessionId: "v2-e",
      name: "discord newer lap",
      status: "working",
      routed: true,
      lastBusyAt: 500,
      lastSeen: 500,
    });
    refresh();
    check(
      "presence v2: several routed conversations -> the freshest lastBusyAt wins the visible name",
      opSent.length === 6 &&
        opSent[5].d.activities[0].name === "discord newer lap",
      JSON.stringify(opSent[5]?.d?.activities?.[0]),
    );
    // v3 unit trio (the idle-name consistency lap): idle -> idle_state text;
    // empty/missing idle_state -> pcfg.name deep fallback; working routed rows
    // -> session name (the v2 branch is untouched)
    check(
      "presence v3: deriveActiveName idle -> idle_state text; empty idle_state -> pcfg.name deep fallback; working rows -> session name (v2 branch untouched)",
      deriveActiveName([], pcfg) === "listening" &&
        deriveActiveName([], { ...pcfg, idle_state: "" }) === "prime-agent" &&
        deriveActiveName([], { name: "prime-agent" }) === "prime-agent" &&
        deriveActiveName(
          [
            {
              sessionId: "v3-w",
              name: "discord token idle fix",
              routed: true,
              lastBusyAt: 1,
              lastSeen: 1,
            },
          ],
          pcfg,
        ) === "discord token idle fix",
      JSON.stringify({
        idle: deriveActiveName([], pcfg),
        emptyIdle: deriveActiveName([], { ...pcfg, idle_state: "" }),
        noIdleKey: deriveActiveName([], { name: "prime-agent" }),
        working: deriveActiveName(
          [
            {
              sessionId: "v3-w",
              name: "discord token idle fix",
              routed: true,
              lastBusyAt: 1,
              lastSeen: 1,
            },
          ],
          pcfg,
        ),
      }),
    );
  }
  // ---- 6e. presence v2: the beacon register payload carries the session's name ----
  // The beacon (index.ts) sends `name: safe(() => sessionManager.getSessionName())`
  // on every register/heartbeat — the bot's row keeps the freshest name; the row
  // (name + routed + busy stamps) is exactly what deriveActiveName picks above.
  {
    process.env.DISCORD_CONV_KEY = "thread:presence-v2";
    claimFor("thread:presence-v2"); // fresh unclaimed spawn (cwd /tmp, wrapper 4242) — the named session registers and routes
    const namedCtx = {
      sessionManager: {
        getSessionId: () => "smoke-presence-named",
        getSessionName: () => "discord presence polish",
        getCwd: () => "/tmp",
        getSessionFile: () =>
          path.join(SESSIONS_DIR, "smoke-presence-named.jsonl"),
        getHeader: () => ({ timestamp: Date.now() }),
      },
      isIdle: () => true,
    };
    await beaconMod.default(mockPi);
    await handlers.session_start({}, namedCtx);
    let namedRow = null;
    for (let i = 0; i < 40 && !namedRow?.routed; i++) {
      namedRow = sessions.get("smoke-presence-named") ?? null;
      if (!namedRow?.routed) await sleep(50);
    }
    check(
      "presence v2: the beacon's register payload carries the session's display name (routed row, heartbeats keep it fresh)",
      namedRow?.routed === true && namedRow?.name === "discord presence polish",
      JSON.stringify({ routed: namedRow?.routed, name: namedRow?.name }),
    );
    await onBeaconEvent("smoke-presence-named", "busy", { busy: true });
    namedRow = sessions.get("smoke-presence-named");
    check(
      "presence v2: a busy flip stamps the routed row the visible name picks (name/routed/status/lastBusyAt)",
      namedRow?.status === "working" &&
        namedRow?.routed === true &&
        namedRow?.name === "discord presence polish" &&
        typeof namedRow?.lastBusyAt === "number",
      JSON.stringify({
        ...namedRow,
        lastBusyAt:
          typeof namedRow?.lastBusyAt === "number" ? "<stamped>" : null,
      }),
    );
    await onBeaconEvent("smoke-presence-named", "busy", { busy: false });
    await handlers.session_shutdown({ reason: "quit" }, namedCtx); // unregisters the row, stops the heartbeat
    claims.delete("thread:presence-v2");
    routing.delete("thread:presence-v2");
    delete process.env.DISCORD_CONV_KEY;
  }

  // ---- 6n. beacon session naming (discord-visibility feedback lap): DISCORD_CONV_NAME beats the convKey slug ----
  {
    // (a) the bot-passed env name wins: messy spacing sanitizes, the 26-char picker clamp holds
    process.env.DISCORD_CONV_KEY = "channel:naming";
    process.env.DISCORD_CONV_NAME = "  discord   ask-homelab  ";
    claimFor("channel:naming");
    const nameCalls = [];
    const piN = {
      ...mockPi,
      setSessionName: (n) => {
        nameCalls.push(n);
        return Promise.resolve();
      },
    };
    const namingCtx = {
      sessionManager: {
        getSessionId: () => "smoke-naming-1",
        getSessionName: () => null,
        getCwd: () => "/tmp",
        getSessionFile: () => path.join(SESSIONS_DIR, "smoke-naming-1.jsonl"),
        getHeader: () => ({ timestamp: Date.now() }),
      },
      isIdle: () => true,
    };
    await beaconMod.default(piN);
    await handlers.session_start({}, namingCtx);
    let namingRouted = false;
    for (let i = 0; i < 40 && !namingRouted; i++) {
      namingRouted =
        routing.get("channel:naming")?.sessionId === "smoke-naming-1";
      if (!namingRouted) await sleep(50);
    }
    check(
      "naming: DISCORD_CONV_NAME beats the convKey slug (trim + collapse; <=26 picker limit)",
      namingRouted &&
        nameCalls.length === 1 &&
        nameCalls[0] === "discord ask-homelab",
      JSON.stringify({ routed: namingRouted, calls: nameCalls }),
    );
    await handlers.session_shutdown({ reason: "quit" }, namingCtx);
    claims.delete("channel:naming");
    routing.delete("channel:naming");
    delete process.env.DISCORD_CONV_NAME;
    // (b) a name-collision rejection retries ONCE with a short unique suffix, then gives up silently
    process.env.DISCORD_CONV_KEY = "thread:naming-retry";
    process.env.DISCORD_CONV_NAME = "discord thread with a nice name"; // 31 chars — clamps to 26
    claimFor("thread:naming-retry");
    const retryCalls = [];
    const piR = {
      ...mockPi,
      setSessionName: (n) => {
        retryCalls.push(n);
        return Promise.reject(
          new Error("an agent of that name already exists"),
        );
      },
    };
    const retryCtx = {
      sessionManager: {
        getSessionId: () => "smoke-naming-2-9f",
        getSessionName: () => null,
        getCwd: () => "/tmp",
        getSessionFile: () =>
          path.join(SESSIONS_DIR, "smoke-naming-2-9f.jsonl"),
        getHeader: () => ({ timestamp: Date.now() }),
      },
      isIdle: () => true,
    };
    await beaconMod.default(piR);
    await handlers.session_start({}, retryCtx);
    let retryRouted = false;
    for (let i = 0; i < 40 && !retryRouted; i++) {
      retryRouted =
        routing.get("thread:naming-retry")?.sessionId === "smoke-naming-2-9f";
      if (!retryRouted) await sleep(50);
    }
    await new Promise((res) => setTimeout(res, 100)); // the rejection + the one retry settle — then SILENCE
    check(
      "naming: a rejected name retries ONCE with the session-id suffix (base<=23 + ' ' + last2 of session id, still <=26) and then gives up silently — exactly 2 calls, no crash",
      retryRouted &&
        retryCalls.length === 2 &&
        retryCalls[0] === "discord thread with a nice" && // the 26-char clamp
        retryCalls[1] === "discord thread with a n 9f" && // the suffixed retry
        retryCalls.every((n) => n.length <= 26),
      JSON.stringify(retryCalls),
    );
    await handlers.session_shutdown({ reason: "quit" }, retryCtx);
    claims.delete("thread:naming-retry");
    routing.delete("thread:naming-retry");
    delete process.env.DISCORD_CONV_NAME;
    delete process.env.DISCORD_CONV_KEY;
  }

  // ---- 6o. assert-at-register + the session_topic tool (discord-visibility round 2) ----
  // Operator feedback, two parts: (1) legacy sessions (spawned before the
  // naming code) registered name=null forever — the naming lived behind the
  // first-register-only guard, so presence fell back to the product name
  // ("prime-agent"); every register (heartbeats included) must now ASSERT a
  // falsy name and never touch a session that has one. (2) the initial
  // surface name is accurate at spawn but goes stale as the work evolves —
  // the agent renames via the session_topic tool and the whole visibility
  // chain (register payload -> row/presence -> thread title) follows.
  {
    const beatPrev = process.env.DISCORD_BEAT_INTERVAL_MS;
    process.env.DISCORD_BEAT_INTERVAL_MS = "250"; // drive heartbeats fast (production 15s) — the assert rides beats here
    // (a1) a null-name session self-heals on a HEARTBEAT: the first register's
    // attempts fail (a collision), the next beat's assert re-tries and lands
    process.env.DISCORD_CONV_KEY = "thread:drift";
    claimFor("thread:drift");
    let rejectBoth = true;
    let assertedName = null;
    const assertCalls = [];
    const piAssert = {
      ...mockPi,
      setSessionName: (n) => {
        assertCalls.push(n);
        if (rejectBoth)
          return Promise.reject(
            new Error("an agent of that name already exists"),
          );
        assertedName = n;
        return Promise.resolve();
      },
    };
    const assertCtx = {
      sessionManager: {
        getSessionId: () => "smoke-assert-4f",
        getSessionName: () => assertedName,
        getCwd: () => "/tmp",
        getSessionFile: () => path.join(SESSIONS_DIR, "smoke-assert-4f.jsonl"),
        getHeader: () => ({ timestamp: Date.now() }),
      },
      isIdle: () => true,
    };
    await beaconMod.default(piAssert);
    await handlers.session_start({}, assertCtx);
    let assertRouted = false;
    for (let i = 0; i < 40 && !assertRouted; i++) {
      assertRouted =
        routing.get("thread:drift")?.sessionId === "smoke-assert-4f";
      if (!assertRouted) await sleep(50);
    }
    await until(() => {
      if (assertCalls.length >= 2) {
        rejectBoth = false;
        return true;
      }
      return false;
    }); // the first register's rejected pair settles — the collision window closes
    let healed = false;
    for (let i = 0; i < 40 && !healed; i++) {
      healed = sessions.get("smoke-assert-4f")?.name === "discord thread drift";
      if (!healed) await sleep(50);
    }
    check(
      "assert: a null-name session self-heals on a HEARTBEAT (the failed first-register pair re-asserts on the next beat; the register payload then carries the landed name)",
      assertRouted &&
        healed &&
        assertCalls.length === 3 &&
        assertCalls[0] === "discord thread drift" &&
        assertCalls[1] === "discord thread drift 4f" &&
        assertCalls[2] === "discord thread drift",
      JSON.stringify({
        routed: assertRouted,
        calls: assertCalls,
        row: sessions.get("smoke-assert-4f")?.name,
      }),
    );
    await handlers.session_shutdown({ reason: "quit" }, assertCtx);
    claims.delete("thread:drift");
    routing.delete("thread:drift");
    // (a2) a session that HAS a name (any name — an agent topic-rename included)
    // is never touched by the register-path assert
    process.env.DISCORD_CONV_KEY = "thread:kept";
    claimFor("thread:kept");
    const keptCalls = [];
    const piKept = {
      ...mockPi,
      setSessionName: (n) => {
        keptCalls.push(n);
        return Promise.resolve();
      },
    };
    const keptCtx = {
      sessionManager: {
        getSessionId: () => "smoke-kept-2",
        getSessionName: () => "agent's own rename",
        getCwd: () => "/tmp",
        getSessionFile: () => path.join(SESSIONS_DIR, "smoke-kept-2.jsonl"),
        getHeader: () => ({ timestamp: Date.now() }),
      },
      isIdle: () => true,
    };
    await beaconMod.default(piKept);
    await handlers.session_start({}, keptCtx);
    let keptRouted = false;
    for (let i = 0; i < 40 && !keptRouted; i++) {
      keptRouted = routing.get("thread:kept")?.sessionId === "smoke-kept-2";
      if (!keptRouted) await sleep(50);
    }
    await sleep(600); // several fast heartbeats land on a NAMED session
    check(
      "assert: a NAMED session (any name — an agent topic-rename included) is never overwritten by register",
      keptRouted &&
        keptCalls.length === 0 &&
        sessions.get("smoke-kept-2")?.name === "agent's own rename",
      JSON.stringify({
        routed: keptRouted,
        calls: keptCalls,
        row: sessions.get("smoke-kept-2")?.name,
      }),
    );
    await handlers.session_shutdown({ reason: "quit" }, keptCtx);
    claims.delete("thread:kept");
    routing.delete("thread:kept");
    delete process.env.DISCORD_CONV_KEY;
    // (b) the session_topic tool: registration + validation + rename + propagation
    process.env.DISCORD_CONV_KEY = "thread:topic-tool";
    claimFor("thread:topic-tool");
    const trPrev6o = process.env.DISCORD_THREAD_RENAME;
    process.env.DISCORD_THREAD_RENAME = "true"; // this block's thread-title PATCH is the assertion — force the feature on (the 5a2 precedent)
    const patchBase = chanPatches.length;
    let topicName = null;
    const topicCalls = [];
    const piTopic = {
      ...mockPi,
      setSessionName: (n) => {
        topicCalls.push(n);
        topicName = n;
        return Promise.resolve();
      },
    };
    const topicCtx = {
      sessionManager: {
        getSessionId: () => "smoke-topic-3-e7",
        getSessionName: () => topicName ?? "discord spawn surface",
        getCwd: () => "/tmp",
        getSessionFile: () => path.join(SESSIONS_DIR, "smoke-topic-3-e7.jsonl"),
        getHeader: () => ({ timestamp: Date.now() }),
      },
      isIdle: () => true,
    };
    await beaconMod.default(piTopic);
    const topicDef = registeredTools
      .filter((t) => t?.name === "session_topic")
      .pop(); // the latest factory's instance — its closure binds topicCtx
    check(
      "topic: the session_topic tool registers in discord-tagged sessions (execute + parameters on the typebox/fallback surface)",
      topicDef?.name === "session_topic" &&
        typeof topicDef?.execute === "function" &&
        topicDef?.parameters != null,
      JSON.stringify(registeredTools.slice(-2).map((t) => t?.name)),
    );
    await handlers.session_start({}, topicCtx);
    let topicRouted = false;
    for (let i = 0; i < 40 && !topicRouted; i++) {
      topicRouted =
        routing.get("thread:topic-tool")?.sessionId === "smoke-topic-3-e7";
      if (!topicRouted) await sleep(50);
    }
    check(
      "topic: the tagged beacon session registers and routes its thread conversation",
      topicRouted,
      JSON.stringify(routing.get("thread:topic-tool")),
    );
    const emptyRes = await topicDef.execute("tc-empty", { name: "   " });
    check(
      "topic: an empty name returns an error tool result with guidance — no rename attempt",
      String(emptyRes?.content?.[0]?.text ?? "").startsWith(
        "session_topic: empty name",
      ) === true && topicCalls.length === 0,
      JSON.stringify({ res: emptyRes?.content?.[0]?.text, calls: topicCalls }),
    );
    const renameRes = await topicDef.execute("tc-rename", {
      name: "cnc router work",
    });
    const renameText = String(renameRes?.content?.[0]?.text ?? "");
    let rowRenamed = false;
    for (let i = 0; i < 40 && !rowRenamed; i++) {
      rowRenamed = sessions.get("smoke-topic-3-e7")?.name === "cnc router work";
      if (!rowRenamed) await sleep(50);
    }
    check(
      "topic: session_topic renames — the 'renamed' outcome, and the next register payload carries the live name",
      renameText.startsWith('session_topic: renamed — "cnc router work"') &&
        rowRenamed &&
        topicCalls.length === 1 &&
        topicCalls[0] === "cnc router work",
      JSON.stringify({
        res: renameText,
        calls: topicCalls,
        row: sessions.get("smoke-topic-3-e7")?.name,
      }),
    );
    check(
      "topic: the rename PROPAGATES — the thread title PATCH tracks it (presence and /status read the same row)",
      await until(() =>
        chanPatches
          .slice(patchBase)
          .some(
            (c) => c.threadId === "topic-tool" && c.name === "cnc router work",
          ),
      ),
      JSON.stringify(
        chanPatches.slice(patchBase).map((c) => `${c.threadId}:${c.name}`),
      ),
    );
    const longName =
      "a very long conversation topic that exceeds the picker limit by far";
    const longRes = await topicDef.execute("tc-long", { name: longName });
    check(
      "topic: a too-long name clamps to the 26-char picker limit (still renamed; the register assert never fights the agent's rename)",
      longName.length > 26 &&
        topicCalls.length === 2 &&
        topicCalls[1] === longName.slice(0, 26) &&
        String(longRes?.content?.[0]?.text ?? "").includes(
          `renamed — "${longName.slice(0, 26)}"`,
        ),
      JSON.stringify({
        calls: topicCalls,
        res: String(longRes?.content?.[0]?.text ?? ""),
      }),
    );
    await handlers.session_shutdown({ reason: "quit" }, topicCtx);
    claims.delete("thread:topic-tool");
    routing.delete("thread:topic-tool");
    // (b1) a collision: the base rejects (a dead session holds the name), the one suffixed retry lands
    process.env.DISCORD_CONV_KEY = "thread:topic-collide";
    claimFor("thread:topic-collide");
    let collidedName = "discord already named";
    const collideCalls = [];
    const piCollide = {
      ...mockPi,
      setSessionName: (n) => {
        collideCalls.push(n);
        if (collideCalls.length === 1)
          return Promise.reject(
            new Error("an agent of that name already exists"),
          );
        collidedName = n;
        return Promise.resolve();
      },
    };
    const collideCtx = {
      sessionManager: {
        getSessionId: () => "smoke-collide-9b",
        getSessionName: () => collidedName,
        getCwd: () => "/tmp",
        getSessionFile: () => path.join(SESSIONS_DIR, "smoke-collide-9b.jsonl"),
        getHeader: () => ({ timestamp: Date.now() }),
      },
      isIdle: () => true,
    };
    await beaconMod.default(piCollide);
    const collideDef = registeredTools
      .filter((t) => t?.name === "session_topic")
      .pop();
    await handlers.session_start({}, collideCtx);
    const collideRes = await collideDef.execute("tc-collide", {
      name: "homelab parity audit",
    });
    const collideText = String(collideRes?.content?.[0]?.text ?? "");
    check(
      "topic: a rejected base (name held by a dead session) retries ONCE with the session-id suffix and reports it — no crash",
      collideText.includes("rejected") &&
        collideText.includes('"homelab parity audit 9b"') &&
        collideCalls.length === 2 &&
        collideCalls[0] === "homelab parity audit" &&
        collideCalls[1] === "homelab parity audit 9b" &&
        collidedName === "homelab parity audit 9b",
      JSON.stringify({ res: collideText, calls: collideCalls }),
    );
    await handlers.session_shutdown({ reason: "quit" }, collideCtx);
    claims.delete("thread:topic-collide");
    routing.delete("thread:topic-collide");
    // (b2) unavailable: both attempts fail — sync-throw on the base leg,
    // promise-rejection on the suffix leg — the execute still answers, never a crash
    process.env.DISCORD_CONV_KEY = "thread:topic-unavail";
    claimFor("thread:topic-unavail");
    const unavailCalls = [];
    const piUnavail = {
      ...mockPi,
      setSessionName: (n) => {
        unavailCalls.push(n);
        if (unavailCalls.length % 2 === 1) throw new Error("sync boom");
        return Promise.reject(
          new Error("an agent of that name already exists"),
        );
      },
    };
    const unavailCtx = {
      sessionManager: {
        getSessionId: () => "smoke-unavail-3c",
        getSessionName: () => "discord already named",
        getCwd: () => "/tmp",
        getSessionFile: () => path.join(SESSIONS_DIR, "smoke-unavail-3c.jsonl"),
        getHeader: () => ({ timestamp: Date.now() }),
      },
      isIdle: () => true,
    };
    await beaconMod.default(piUnavail);
    const unavailDef = registeredTools
      .filter((t) => t?.name === "session_topic")
      .pop();
    await handlers.session_start({}, unavailCtx);
    const unavailRes = await unavailDef.execute("tc-unavail", {
      name: "stuck name",
    });
    const unavailText = String(unavailRes?.content?.[0]?.text ?? "");
    check(
      "topic: both guard legs hold — sync-throw on the base, promise-rejection on the suffix; the tool answers 'unavailable', never a crash",
      unavailText.startsWith("session_topic: unavailable") &&
        unavailCalls.length === 2 &&
        unavailCalls[0] === "stuck name" &&
        unavailCalls[1] === "stuck name 3c",
      JSON.stringify({ res: unavailText, calls: unavailCalls }),
    );
    await handlers.session_shutdown({ reason: "quit" }, unavailCtx);
    claims.delete("thread:topic-unavail");
    routing.delete("thread:topic-unavail");
    if (trPrev6o === undefined) delete process.env.DISCORD_THREAD_RENAME;
    else process.env.DISCORD_THREAD_RENAME = trPrev6o; // restore — a shell-provided knob must survive the smoke
    delete process.env.DISCORD_CONV_KEY;
    if (beatPrev === undefined) delete process.env.DISCORD_BEAT_INTERVAL_MS;
    else process.env.DISCORD_BEAT_INTERVAL_MS = beatPrev; // restore — the env-injection pattern
  }

  // ---- 7. durable recovery (hermes-catalog #2 + #7): the missed-message ledger + the delivery-obligation ledger ----
  // The smoke recovery dir (RECOVERY_DIR -> recovery.smoke) is wiped at every
  // case start and at smoke end; sections 3-4c already exercised the live hooks
  // (admit rows, one 4c-terminal-failure delivery row) and their artifacts die
  // with the first wipe. Text-storage decision under test: RAW dispatch text
  // (a hash could not re-dispatch the message).
  const recRows = (convKey, delivery = false) => {
    const byId = recoveryRows(
      delivery ? recoveryDeliveryFile(convKey) : recoveryFile(convKey),
    );
    return byId ? [...byId.values()] : [];
  };
  try {
    fs.rmSync(RECOVERY_DIR, { recursive: true, force: true });
  } catch {}
  {
    // (7a) admitted message -> pending row -> dispatch ok -> done row
    process.env.DISCORD_RECOVERY = "true";
    process.env.DISCORD_ALLOWED_GUILDS = "g1"; // handleMessage reads live config — the section-3 e2e env-injection pattern
    process.env.DISCORD_ALLOWED_USERS = "u1";
    process.env.DISCORD_ALLOWED_CHANNELS = "c1";
    process.env.DISCORD_REQUIRE_MENTION = "true";
    smokeSpawns = [];
    const m7a = msg({
      content: "<@555000111222333444> ledger this message",
      mentions: [{ id: "555000111222333444" }],
    });
    await handleMessage(m7a);
    const always7a = loadConfig().thread_policy === "always";
    const conv7a = always7a ? `thread:t-${m7a.id}` : "channel:c1"; // the convKey the dispatch path resolved under this policy
    const pend7a = recRows(conv7a).filter((r) => r.state === "pending");
    check(
      "recovery: an admitted message writes a pending row BEFORE dispatch (raw dispatch text stored)",
      pend7a.length === 1 &&
        pend7a[0].id === String(m7a.id) &&
        pend7a[0].text.includes("ledger this message") &&
        pend7a[0].channelId === (always7a ? `t-${m7a.id}` : "c1") &&
        pend7a[0].triggerChannelId === "c1",
      JSON.stringify(pend7a),
    );
    await new Promise((res) => setTimeout(res, 700)); // live text_batch_ms (600) flush -> dispatch (smoke records the spawn)
    const after7a = recRows(conv7a);
    check(
      "recovery: dispatch acceptance flips the row to done (a done-marker row; the pending shadow is superseded)",
      smokeSpawns.length === 1 &&
        after7a.some((r) => r.id === String(m7a.id) && r.state === "done") &&
        !after7a.some((r) => r.id === String(m7a.id) && r.state === "pending"),
      JSON.stringify(after7a),
    );
    routing.delete(conv7a);
    pendingByConv.delete(conv7a);
    batchers.delete(conv7a);
    streamers.delete(conv7a);
  }
  {
    // (7b) boot scan: "downtime" pending rows replay through the normal path with
    // dedup by message id (a done row wins), the CURRENT gates re-checked (a denial
    // drops the row), and one ♻️ notice when N>0
    const oldTs = new Date(startedAt - 60_000).toISOString(); // written before THIS process booted
    const fixture = (over) => ({
      id: "r-" + Math.random().toString(36).slice(2, 10),
      ts: oldTs,
      convKey: "channel:c1",
      channelId: "c1",
      triggerChannelId: "c1",
      guildId: "g1",
      authorId: "u1",
      authorBot: false,
      mentioned: true,
      text: `Discord message from alice: ${over?.text ?? "replay me"}`,
      state: "pending",
      ...over,
    });
    const rA = fixture({ text: "replay me" }),
      rB = fixture({ text: "me too" }),
      rC = fixture({ id: "r-already-done" }),
      rDenied = fixture({ id: "r-denied-user", authorId: "u9" });
    recoveryAppend(recoveryFile("channel:c1"), rC);
    recoveryMarkDone("channel:c1", [rC.id]); // rC dispatched before downtime: pending row + done marker — the boot scan must NOT replay it
    for (const r of [rA, rB, rDenied])
      recoveryAppend(recoveryFile("channel:c1"), r);
    recoveryScanned = false;
    smokeSpawns = [];
    const noticeBefore = sent.length;
    await recoveryBootScan();
    check(
      "recovery: the boot scan replays downtime pending rows through the normal dispatch path",
      smokeSpawns.length === 2 &&
        smokeSpawns.some(
          (s) => s.convKey === "channel:c1" && s.text.includes("replay me"),
        ) &&
        smokeSpawns.some(
          (s) => s.convKey === "channel:c1" && s.text.includes("me too"),
        ),
      JSON.stringify(smokeSpawns),
    );
    check(
      "recovery: the boot scan posts one ♻️ recovered-notice to the conversation when N>0",
      sent
        .slice(noticeBefore)
        .some(
          (s) =>
            s.channelId === "c1" &&
            s.content.includes(
              "recovered 2 missed messages from while I was down",
            ),
        ),
      JSON.stringify(
        sent
          .slice(noticeBefore)
          .filter((s) => s.channelId === "c1")
          .map((s) => s.content),
      ),
    );
    const rows7b = recRows("channel:c1");
    check(
      "recovery: replayed rows flip to done; the already-done row never re-dispatches (durable dedup by message id)",
      rows7b.every((r) => r.state === "done") &&
        !smokeSpawns.some((s) => s.triggerMessageId === rC.id),
      JSON.stringify(rows7b),
    );
    check(
      "recovery: a row denied by the CURRENT gates drops with the reason on its done row (never dispatched)",
      rows7b.some(
        (r) =>
          r.id === rDenied.id &&
          r.state === "done" &&
          typeof r.dropped === "string" &&
          r.dropped.startsWith("user:"),
      ) && !smokeSpawns.some((s) => s.triggerMessageId === rDenied.id),
      JSON.stringify(rows7b.find((r) => r.id === rDenied.id)),
    );
    routing.delete("channel:c1");
    pendingByConv.delete("channel:c1");
    streamers.delete("channel:c1");
  }
  {
    // (7c) the delivery-obstruction path: terminal finalize failure -> the finalized
    // text persists -> the NEXT dispatch retries it -> delivered ONCE (the dedup
    // guard: the delivered message id is recorded, a done row never re-posts)
    routing.set("conv:recd", { sessionId: "s-recd", controlPort: 0, pid: 390 });
    const stD = streamerOf("conv:recd");
    stD.channelId = "chan-recd";
    stD.triggerChannelId = "chan-recd";
    stD.triggerMessageId = "trig-recd";
    scripted.push({
      match: (me, p) => me === "POST" && p === "/channels/chan-recd/messages",
      error: rl429(),
    }); // chunk-1 dies
    scripted.push({
      match: (me, p) => me === "POST" && p === "/channels/chan-recd/messages",
      error: rl429(),
    }); // the consolidated fallback dies too — TERMINAL
    await onBeaconEvent("s-recd", "message_end", {
      text: "the reply that must survive the crash",
    });
    const owed7c = recRows("conv:recd", true).filter(
      (r) => r.state === "pending",
    );
    check(
      "recovery: a terminally failed delivery persists the finalized reply text (delivery-pending row)",
      owed7c.length === 1 &&
        owed7c[0].text === "the reply that must survive the crash" &&
        owed7c[0].channelId === "chan-recd",
      JSON.stringify(owed7c),
    );
    // the drain needs a real delivered message id back — the stub's POST returns {}
    // (finalize's consolidated-fallback semantics rely on that); fix up THIS channel only
    const realReq7c = rest.request;
    rest.request = async (me, p, b) => {
      const res7c = await realReq7c(me, p, b);
      return me === "POST" && p === "/channels/chan-recd/messages"
        ? { id: "recd-delivered-1" }
        : res7c;
    };
    await dispatchToConversation(
      "conv:recd",
      "chan-recd",
      "chan-recd",
      "trig-recd-next",
      "the next turn",
      "u1",
    ); // the next dispatch drains the owed reply FIRST
    check(
      "recovery: the next dispatch redelivers the owed reply with the ♻️ marker (at-least-once)",
      sent.some(
        (s) =>
          s.channelId === "chan-recd" &&
          s.content ===
            "♻️ recovered a reply that failed to deliver earlier:\n\nthe reply that must survive the crash",
      ),
      JSON.stringify(
        sent.filter((s) => s.channelId === "chan-recd").map((s) => s.content),
      ),
    );
    const owedAfter7c = recRows("conv:recd", true);
    check(
      "recovery: the delivered message id is recorded and the row flips done",
      owedAfter7c.length === 1 &&
        owedAfter7c[0].state === "done" &&
        owedAfter7c[0].deliveredMessageId === "recd-delivered-1",
      JSON.stringify(owedAfter7c),
    );
    await dispatchToConversation(
      "conv:recd",
      "chan-recd",
      "chan-recd",
      "trig-recd-next2",
      "another turn",
      "u1",
    ); // a later dispatch must NOT re-post the delivered row
    check(
      "recovery: the dedup guard never re-posts a delivered reply (exactly one ♻️ recovery)",
      sent.filter(
        (s) =>
          s.channelId === "chan-recd" &&
          s.content.startsWith("♻️ recovered a reply"),
      ).length === 1,
      `recoveries=${
        sent.filter(
          (s) =>
            s.channelId === "chan-recd" &&
            s.content.startsWith("♻️ recovered a reply"),
        ).length
      }`,
    );
    rest.request = realReq7c;
    routing.delete("conv:recd");
    streamers.delete("conv:recd");
    // (7d) recovery=false -> no ledger writes (admit + dispatch leave the dir empty)
    process.env.DISCORD_RECOVERY = "false";
    try {
      fs.rmSync(RECOVERY_DIR, { recursive: true, force: true });
    } catch {}
    smokeSpawns = [];
    const m7d = msg({
      content: "<@555000111222333444> no ledger when off",
      mentions: [{ id: "555000111222333444" }],
    });
    await handleMessage(m7d);
    await new Promise((res) => setTimeout(res, 700));
    const files7d = (() => {
      try {
        return fs.readdirSync(RECOVERY_DIR);
      } catch {
        return [];
      }
    })();
    check(
      "recovery: recovery=false admits and dispatches with ZERO ledger writes",
      smokeSpawns.length === 1 && files7d.length === 0,
      JSON.stringify({ spawns: smokeSpawns.length, files: files7d }),
    );
    delete process.env.DISCORD_RECOVERY;
    const conv7d =
      loadConfig().thread_policy === "always"
        ? `thread:t-${m7d.id}`
        : "channel:c1";
    routing.delete(conv7d);
    pendingByConv.delete(conv7d);
    batchers.delete(conv7d);
    streamers.delete(conv7d);
  }
  {
    // (7e) boot prune: the 30-day horizon + the 1k-per-conversation cap
    try {
      fs.rmSync(RECOVERY_DIR, { recursive: true, force: true });
    } catch {}
    const f7e = recoveryFile("channel:prune");
    const row7e = (id, ageDays) => ({
      id,
      ts: new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000).toISOString(),
      convKey: "channel:prune",
      channelId: "c1",
      triggerChannelId: "c1",
      guildId: "g1",
      authorId: "u1",
      authorBot: false,
      mentioned: true,
      text: "x",
      state: "done",
    });
    recoveryAppend(f7e, row7e("p-horizon", 31)); // 31 days — past the horizon, dropped at prune
    for (let i = 0; i < 1001; i++) recoveryAppend(f7e, row7e(`p-${i}`, 1)); // 1k+1 done rows — the cap prunes to 1k
    recoveryScanned = false;
    await recoveryBootScan(); // prunes first; channel:prune carries no pending rows -> no replays, no notices
    const lines7e = fs.readFileSync(f7e, "utf-8").split("\n").filter(Boolean);
    const ids7e = new Set(
      lines7e.map((l) => {
        try {
          return JSON.parse(l).id;
        } catch {
          return null;
        }
      }),
    );
    check(
      "recovery: boot prune drops rows past the 30-day horizon (a 31-day row is gone)",
      !ids7e.has("p-horizon"),
      `rows=${lines7e.length}`,
    );
    check(
      "recovery: boot prune caps a conversation at 1k rows (1k+1 done rows -> 1000)",
      lines7e.length === 1000,
      `rows=${lines7e.length}`,
    );
  }

  {
    // (7f) inbound attachments (hermes-catalog #3 slice 1): text-doc injection
    // ≤100KB. The inflated text IS the dispatch text — the recovery row stores
    // it and the spawn carries it. Hermetic: fetchAttachment is stubbed for the
    // e2e dispatch checks, then RESTORED for the fetch-helper checks (global
    // fetch swapped there — the section-4b pattern); nothing reaches discord.com.
    process.env.DISCORD_RECOVERY = "true";
    process.env.DISCORD_ALLOWED_GUILDS = "g1"; // handleMessage reads live config — the 7a env-injection pattern
    process.env.DISCORD_ALLOWED_USERS = "u1";
    process.env.DISCORD_ALLOWED_CHANNELS = "c1";
    process.env.DISCORD_REQUIRE_MENTION = "true";
    const realFetchAttachment = fetchAttachment;
    const attFetches = [];
    let attStub = () => ({ text: "" });
    fetchAttachment = async (att, cfg) => {
      attFetches.push(attName(att));
      return attStub(att, cfg);
    };
    const att = (over = {}) => ({
      filename: "doc.txt",
      content_type: "text/plain",
      size: 12,
      url: "https://cdn.discordapp.com/attachments/g1/c1/f1/doc.txt",
      proxy_url: "https://media.discordapp.net/attachments/g1/c1/f1/doc.txt",
      ...over,
    });
    const mention = () => [{ id: "555000111222333444" }];
    const convOf = (m) =>
      loadConfig().thread_policy === "always"
        ? `thread:t-${m.id}`
        : "channel:c1"; // the convKey the dispatch path resolved under this policy
    const cleanupAtt = (m) => {
      const c = convOf(m);
      routing.delete(c);
      pendingByConv.delete(c);
      batchers.delete(c);
      streamers.delete(c);
    };
    const settle = () => new Promise((res) => setTimeout(res, 700)); // live text_batch_ms (600) flush -> dispatch (smoke records the spawn)
    {
      // text attachment -> inlined content (trailing whitespace trimmed); the
      // pending recovery row stores the inflated text BEFORE dispatch
      smokeSpawns = [];
      attFetches.length = 0;
      attStub = () => ({ text: "ERROR: boom\n\n" });
      const m7f1 = msg({
        content: "<@555000111222333444> what's wrong with this log",
        mentions: mention(),
        attachments: [att()],
      });
      await handleMessage(m7f1);
      const conv7f1 = convOf(m7f1);
      const row7f1 = recRows(conv7f1).find((r) => r.id === String(m7f1.id));
      check(
        "attachments: a text attachment inlines into the pending recovery row BEFORE dispatch (trailing whitespace trimmed)",
        !!row7f1 &&
          row7f1.state === "pending" &&
          row7f1.text.includes("what's wrong with this log") &&
          row7f1.text.endsWith("[attached: doc.txt]\nERROR: boom") &&
          attFetches.length === 1,
        JSON.stringify({ row: row7f1, fetches: attFetches.length }),
      );
      await settle();
      check(
        "attachments: the inflated text IS the dispatch text (the spawn carries the inlined content)",
        smokeSpawns.length === 1 &&
          !!row7f1 &&
          smokeSpawns[0].text === row7f1.text &&
          smokeSpawns[0].text.includes("[attached: doc.txt]\nERROR: boom"),
        JSON.stringify(smokeSpawns.map((s) => s.text)),
      );
      cleanupAtt(m7f1);
    }
    {
      // over-cap on the payload's own size -> placeholder, zero fetches
      smokeSpawns = [];
      attFetches.length = 0;
      const m7f2 = msg({
        content: "<@555000111222333444> here is a huge log",
        mentions: mention(),
        attachments: [att({ filename: "big.log", size: 102401 })],
      });
      await handleMessage(m7f2);
      await settle();
      check(
        "attachments: an over-cap attachment skips on the payload size WITHOUT fetching (never fetch-and-discard)",
        smokeSpawns.length === 1 &&
          smokeSpawns[0].text.includes(
            "[attachment big.log skipped: 102401 bytes > 100KB cap]",
          ) &&
          !smokeSpawns[0].text.includes("[attached:") &&
          attFetches.length === 0,
        JSON.stringify({
          text: smokeSpawns[0]?.text,
          fetches: attFetches.length,
        }),
      );
      cleanupAtt(m7f2);
    }
    {
      // binary/unknown types -> placeholders, zero fetches
      smokeSpawns = [];
      attFetches.length = 0;
      const m7f3 = msg({
        content: "<@555000111222333444> look at these",
        mentions: mention(),
        attachments: [
          att({ filename: "photo.png", content_type: "image/png" }),
          att({ filename: "noext", content_type: "" }),
        ],
      });
      await handleMessage(m7f3);
      await settle();
      check(
        "attachments: binary/unknown attachments become placeholders (no fetch)",
        smokeSpawns.length === 1 &&
          smokeSpawns[0].text.includes(
            "[attachment photo.png skipped: non-text]",
          ) &&
          smokeSpawns[0].text.includes(
            "[attachment noext skipped: non-text]",
          ) &&
          attFetches.length === 0,
        JSON.stringify({
          text: smokeSpawns[0]?.text,
          fetches: attFetches.length,
        }),
      );
      cleanupAtt(m7f3);
    }
    {
      // >3 attachments -> 3 inlined, the rest placeholders
      smokeSpawns = [];
      attFetches.length = 0;
      attStub = () => ({ text: "line" });
      const m7f4 = msg({
        content: "<@555000111222333444> five logs",
        mentions: mention(),
        attachments: ["a", "b", "c", "d", "e"].map((n) =>
          att({ filename: `${n}.txt` }),
        ),
      });
      await handleMessage(m7f4);
      await settle();
      const t7f4 = smokeSpawns[0]?.text ?? "";
      check(
        "attachments: only 3 attachments inline per message — the rest become placeholders",
        smokeSpawns.length === 1 &&
          ["a", "b", "c"].every((n) => t7f4.includes(`[attached: ${n}.txt]`)) &&
          t7f4.includes(
            "[attachment d.txt skipped: only 3 attachments inline per message]",
          ) &&
          t7f4.includes(
            "[attachment e.txt skipped: only 3 attachments inline per message]",
          ) &&
          attFetches.length === 3,
        JSON.stringify({ text: t7f4, fetches: attFetches.length }),
      );
      cleanupAtt(m7f4);
    }
    {
      // fetch 403 -> placeholder, the dispatch continues with what it has
      smokeSpawns = [];
      attFetches.length = 0;
      attStub = () => {
        throw new RestError(403, "forbidden");
      };
      const m7f5 = msg({
        content: "<@555000111222333444> this one will 403",
        mentions: mention(),
        attachments: [att({ filename: "x.log", size: 5 })],
      });
      await handleMessage(m7f5);
      await settle();
      check(
        "attachments: a failed fetch (403) becomes a placeholder and the dispatch continues",
        smokeSpawns.length === 1 &&
          smokeSpawns[0].text.includes("this one will 403") &&
          smokeSpawns[0].text.includes(
            "[attachment x.log fetch failed: HTTP 403]",
          ),
        JSON.stringify(smokeSpawns.map((s) => s.text)),
      );
      cleanupAtt(m7f5);
    }
    {
      // attachments=false -> zero fetch calls, the raw text dispatches alone
      smokeSpawns = [];
      attFetches.length = 0;
      process.env.DISCORD_ATTACHMENTS = "false";
      const m7f6 = msg({
        content: "<@555000111222333444> gate is off",
        mentions: mention(),
        attachments: [att()],
      });
      await handleMessage(m7f6);
      delete process.env.DISCORD_ATTACHMENTS;
      await settle();
      check(
        "attachments: attachments=false makes ZERO fetch calls — the raw text dispatches alone",
        smokeSpawns.length === 1 &&
          !smokeSpawns[0].text.includes("[attached") &&
          attFetches.length === 0,
        JSON.stringify({
          text: smokeSpawns[0]?.text,
          fetches: attFetches.length,
        }),
      );
      cleanupAtt(m7f6);
    }
    // the REAL fetch helper: hermetic via a swapped global fetch (the section-4b
    // pattern) — the stream cap, the per-fetch timeout, and the dedicated bucket
    fetchAttachment = realFetchAttachment;
    const realFetch7f = globalThis.fetch;
    try {
      {
        // stream cap backstop: the payload size lies — the read stops at the cap
        // and the stream is cancelled (never fetch-and-discard)
        let cancelled7f = false;
        const bigBody = new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(102400));
            c.enqueue(new Uint8Array(50000));
          }, // exactly the cap, then past it
          cancel() {
            cancelled7f = true;
          },
        });
        globalThis.fetch = async () => ({ status: 200, body: bigBody });
        const r7f7 = await fetchAttachment(
          att({ filename: "liar.log", size: 5 }),
          loadConfig(),
        ); // size says 5 bytes — the stream must win
        check(
          "attachments: the stream read enforces the cap on a lying/absent size (cancels early, never fetch-and-discard)",
          r7f7.tooLarge === true &&
            r7f7.bytes === 152400 &&
            cancelled7f === true,
          JSON.stringify(r7f7) + ` cancelled=${cancelled7f}`,
        );
      }
      {
        // per-fetch timeout -> the placeholder reason reads "timeout" (fast via env)
        process.env.DISCORD_ATTACHMENT_FETCH_TIMEOUT_MS = "30";
        globalThis.fetch = (_url, opts) =>
          new Promise((resolve, reject) => {
            // a REAL fetch rejects on signal abort — the fake must honor it too, or the case can't happen
            const timer = setTimeout(
              () => resolve({ status: 200, body: null }),
              200,
            );
            const onAbort = () => {
              clearTimeout(timer);
              reject(
                new DOMException(
                  "The operation was aborted due to timeout",
                  "TimeoutError",
                ),
              );
            };
            if (opts?.signal?.aborted) onAbort();
            else
              opts?.signal?.addEventListener("abort", onAbort, { once: true });
          });
        const t7f8 = await inlineAttachments(
          [att({ filename: "slow.log", size: 5 })],
          loadConfig(),
        );
        delete process.env.DISCORD_ATTACHMENT_FETCH_TIMEOUT_MS;
        check(
          "attachments: a per-fetch timeout surfaces as the placeholder reason 'timeout'",
          t7f8.includes("[attachment slow.log fetch failed: timeout]"),
          JSON.stringify(t7f8),
        );
      }
      {
        // a 429 parks ONLY the dedicated attachment bucket; the bounded retry lands
        const calls7f9 = [];
        globalThis.fetch = async () => {
          calls7f9.push(Date.now());
          return calls7f9.length === 1
            ? {
                status: 429,
                text: async () => JSON.stringify({ retry_after: 0.05 }),
              }
            : {
                status: 200,
                body: new ReadableStream({
                  start(c) {
                    c.enqueue(new TextEncoder().encode("fine"));
                    c.close();
                  },
                }),
              };
        };
        const t7f9 = await inlineAttachments(
          [att({ filename: "rate.log", size: 5 })],
          loadConfig(),
        );
        check(
          "attachments: an attachment 429 parks the DEDICATED bucket only (bounded retry lands, a slow CDN never parks message sends)",
          t7f9.includes("[attached: rate.log]\nfine") &&
            calls7f9.length === 2 &&
            calls7f9[1] - calls7f9[0] >= 140 &&
            bucketCooldowns.has(ATTACHMENT_BUCKET_KEY),
          JSON.stringify({
            t7f9,
            calls: calls7f9.length,
            gap: calls7f9.length === 2 ? calls7f9[1] - calls7f9[0] : null,
            parked: [...bucketCooldowns.keys()],
          }),
        );
      }
    } finally {
      globalThis.fetch = realFetch7f;
    }
    delete process.env.DISCORD_RECOVERY; // the env-injection pattern restores what it set
    delete process.env.DISCORD_ALLOWED_GUILDS;
    delete process.env.DISCORD_ALLOWED_USERS;
    delete process.env.DISCORD_ALLOWED_CHANNELS;
    delete process.env.DISCORD_REQUIRE_MENTION;
  }

  // transport-level ping deny (D5; review finding 8): the real payload builders ran
  // for every recorded send, edit, and interaction callback — assert the deny rides each
  const amOk = (b) =>
    b !== null &&
    typeof b === "object" &&
    JSON.stringify(b.allowed_mentions) === '{"parse":[]}';
  check(
    "transport: every recorded send carries allowed_mentions {parse: []}",
    sent.length > 0 && sent.every((s) => amOk(s.body)),
    `sends=${sent.length}`,
  );
  check(
    "transport: every recorded edit carries allowed_mentions {parse: []}",
    edits.length > 0 && edits.every((e) => amOk(e.body)),
    `edits=${edits.length}`,
  );
  check(
    "transport: every interaction callback carries allowed_mentions {parse: []}",
    callbacks.length > 0 &&
      callbacks.every((c) => c.body?.data && amOk(c.body.data)),
    `callbacks=${callbacks.length}`,
  );

  // whole-run gate proof: a reactions-off run (DISCORD_REACTIONS=false) must end
  // with ZERO reaction calls recorded across every section — not just the gated ones
  check(
    "reack: a reactions-off run ends with zero recorded reaction calls",
    loadConfig().reactions || reactions.length === 0,
    `total=${reactions.length}`,
  );

  // runtime-artifact hygiene: the smoke's own ledger writes leave nothing behind
  try {
    fs.rmSync(LEDGER_PATH, { force: true });
  } catch {}
  try {
    fs.rmSync(RECOVERY_DIR, { recursive: true, force: true });
  } catch {} // recovery rows carry raw message text — the smoke never leaves them behind
  log(`smoke complete: ${failed === 0 ? "ALL PASS" : failed + " FAILURES"}`);
  process.exit(failed === 0 ? 0 : 1);
}

if (SMOKE)
  smoke().catch((e) => {
    log("smoke crashed:", e?.message ?? e);
    process.exit(1);
  });
else
  main().catch((e) => {
    log("fatal:", e?.message ?? e);
    process.exit(1);
  });
