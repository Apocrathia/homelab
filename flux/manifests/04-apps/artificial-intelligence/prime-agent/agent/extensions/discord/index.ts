/**
 * prime-agent discord beacon — loads in every prime-agent session.
 *
 * The discord bot (server.mjs, same directory) runs as a detached sidecar
 * that owns the Discord gateway connection, the loopback control port
 * (default 8790), and the spawned agent-conversation farm. This beacon:
 *   - serves /send and /healthz for THIS session on an ephemeral loopback
 *     port (no port conflicts, ever),
 *   - registers the session with the bot (15s heartbeat, retries; respawns
 *     the bot when its health probe fails — probe-first, 30s throttle),
 *   - forwards live assistant stream events to the bot for Discord
 *     streaming (preview edits + finalize),
 *   - relays externally-typed user input (TUI / any non-Discord client)
 *     to the bot so the conversation's Discord surface keeps its context
 *     — the bot posts it there with a provenance tag (never dispatched,
 *     exactly one transcript copy stays in the session),
 *   - injects Discord context + discord-guidelines.md into tagged
 *     conversation sessions' system prompts (before_agent_start),
 *   - registers the discord_thread tool in discord-tagged sessions
 *     (thread_policy "agent"): the AGENT decides whether a topic deserves a
 *     thread — the tool asks the bot to promote the live channel
 *     conversation to a thread (same session, transcript continuity).
 *   - registers the session_topic tool in discord-tagged sessions: the agent
 *     renames the conversation when the topic drifts (the spawn-time surface
 *     name goes stale) — and asserts the session's name on EVERY register
 *     (heartbeats included): a null-name legacy session self-heals, a named
 *     one is never touched.
 *
 * Scope guard (design D1/D3): only the session the bot's spawn CLAIMED for a
 * conversation (tagged DISCORD_CONV_KEY; claimed by its NEW session file under
 * the spawn's pre-spawn snapshot — beacons register daemon-tree pids, so pid
 * matching can never work) ever receives Discord traffic. The operator's
 * interactive sessions and tag-inheriting subagents register for /status
 * display only.
 *
 * Tokens (D9, two credentials since the 2026-09-24 hardening lap):
 *   - machine token (register bootstrap): env DISCORD_EXT_TOKEN ->
 *     config.json ext_token -> discord-token file (0600 — read fallback +
 *     one-time migration source, never written again) -> generate +
 *     persist to config. Identical chain to server.mjs — keep both in
 *     sync. Never logged (only the source). Authenticates the beacon's OUTBOUND
 *     /internal/* calls (register/event/thread/unregister) and the bot's
 *     register gate — nothing else.
 *   - session token (per-session traffic credential): a fresh random value
 *     generated at every session_start, never written to disk, carried in
 *     the register payload, and the ONLY credential /send + /stop accept.
 *     A process that scraped the machine token (env readers, file readers)
 *     can no longer inject turns into any beacon — the any-local-process
 *     class the 2026-09-23 invisible /send audit chased.
 * Credentials gate: with no bot_token configured the beacon is inert.
 *
 * Audit (send-route-audit lap): one console.error line per inbound control
 * request — route, source socket, own session id, which credential
 * authenticated, verdict, outcome, payload bytes. Never the token value,
 * never the message text. /healthz stays silent (the probe, not traffic).
 * Only stderr reaches the daemon supervisor log — console.error is the
 * proven channel.
 */
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOT_PORT = () => parseInt(process.env.DISCORD_BOT_PORT ?? "8790", 10);

// respawnEnv (production 2026-09-27 triple-delivery incident): the respawned bot
// ALWAYS targets the canonical lock port (8790 default) — the child env drops
// DISCORD_BOT_PORT so server.mjs resolves its own default. A beacon whose
// BOT_PORT points at a dead non-canonical port (probe stubs, misconfigured
// sessions) must never gift that free port to a SECOND live bot: the port lock
// only guards 8790, so a bot spawned on any other port sails past it and
// connects a duplicate live gateway — every Discord event then lands N times
// (witnessed live: three gateways, one mention, three replies). The lock makes
// duplicates exit(0); the canonical bot keeps serving. Exported for the smoke.
export function respawnEnv(): Record<string, string | undefined> {
  const env = { ...process.env };
  delete env.DISCORD_BOT_PORT; // the child defaults to 8790 — the single-instance lock port
  return env;
}

// ---------- internal token chain (D9; identical chain in server.mjs — keep in sync) ----------
// chain (webui-beacon alignment, 2026-09-28): env DISCORD_EXT_TOKEN ->
// config.json ext_token -> discord-token file (0600 — read fallback +
// one-time migration source only, never written again) -> generate +
// persist to config. Never logged (only the source).
// Exported for the smoke (the respawnEnv precedent): twin paths in, the
// chain out — the factory's resolveToken delegates with the live paths.
// atomic read-modify-write: every other key preserved, the file's formatting
// discipline (2-space indent + trailing newline), tmp+rename swap, 0600 kept
// when the file already has it (a fresh file defaults to 0600)
function writeExtTokenToConfig(token: string, configFile: string): void {
  let cfg: any = {};
  try {
    cfg = JSON.parse(fs.readFileSync(configFile, "utf-8")) ?? {};
  } catch {} // missing/corrupt -> fresh object (readCfg discipline)
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
function migrateTokenFileToConfig(
  token: string,
  tokenFile: string,
  configFile: string,
): boolean {
  try {
    writeExtTokenToConfig(token, configFile);
  } catch (e: any) {
    console.error(
      "[discord-beacon] token migration to config failed:",
      e?.message ?? e,
    );
    return false;
  }
  try {
    fs.unlinkSync(tokenFile);
  } catch {} // benign: config wins the chain — an orphaned file is inert
  return true;
}
export function resolveTokenFor(
  tokenFile: string,
  configFile: string,
): { token: string; source: string } {
  if (process.env.DISCORD_EXT_TOKEN)
    return { token: process.env.DISCORD_EXT_TOKEN, source: "env" };
  let cfg: any = {};
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
  } catch (e: any) {
    // generated: config is the canonical store — the file path is never written again
    console.error("[discord-beacon] token persist failed:", e?.message ?? e);
  }
  return { token, source: "generated" };
}

// typebox (the harness's bundled schema package for tool parameters — the a2a and
// name-sessions precedent) resolves under the extension loader but NOT under a
// plain-node import (the smoke parses this file with one — verified
// ERR_MODULE_NOT_FOUND). Resolve it dynamically and fall back to the equivalent
// hand-built schema, so the discord_thread tool registers a REAL typebox schema in
// live sessions while the smoke import stays green. The only side effect at module
// scope is this resolution attempt; every other effect lives in the factory.
let TypeBox: any = null;
try {
  TypeBox = (await import("typebox")).Type ?? null;
} catch {
  /* plain-node import (smoke): use the fallback schema below */
}
const THREAD_TOOL_PARAMS = TypeBox
  ? TypeBox.Object({
      name: TypeBox.String({
        description:
          "Short thread name: 2-3 lowercase words named for the topic",
      }),
    })
  : {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Short thread name: 2-3 lowercase words named for the topic",
        },
      },
      required: ["name"],
      additionalProperties: false,
    };
const TOPIC_TOOL_PARAMS = TypeBox
  ? TypeBox.Object({
      name: TypeBox.String({
        description:
          "Short topic slug: 2-3 lowercase words named for the conversation's current focus",
      }),
    })
  : {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Short topic slug: 2-3 lowercase words named for the conversation's current focus",
        },
      },
      required: ["name"],
      additionalProperties: false,
    };

export default function (pi: ExtensionAPI) {
  let ctx: ExtensionContext | null = null;
  let control: http.Server | null = null;
  let controlPort = 0;
  let registered = false;
  let beat: NodeJS.Timeout | undefined;
  let retry: NodeJS.Timeout | undefined;

  // ---------- config + credentials gate (read at call time; edits need no reload) ----------
  const readCfg = (): any => {
    try {
      return (
        JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf-8")) ??
        {}
      );
    } catch {
      return {};
    }
  };
  let cfg: any = readCfg(); // factory-time snapshot for the credentials gate; the injection re-reads per turn (D10)
  const botToken = process.env.DISCORD_BOT_TOKEN ?? String(cfg.bot_token ?? "");
  if (!botToken) {
    console.error(
      "[discord-beacon] inert: no bot_token in config.json and no DISCORD_BOT_TOKEN env — nothing to register with",
    );
    return;
  }

  // ---------- internal token (identical chain to server.mjs — keep in sync; D9) ----------
  // the chain lives at module scope (resolveTokenFor, exported for the smoke);
  // the factory binds the live paths — fresh config read, not the factory-time
  // snapshot (the bot may have just migrated the token into config.json)
  const TOKEN_FILE =
    process.env.DISCORD_TOKEN_FILE ?? path.join(HERE, "discord-token");
  function resolveToken(): { token: string; source: string } {
    return resolveTokenFor(TOKEN_FILE, path.join(HERE, "config.json"));
  }
  const { token: TOKEN, source: TOKEN_SOURCE } = resolveToken();
  console.log("[discord-beacon] token source:", TOKEN_SOURCE); // webui-beacon alignment: same wording as the webui beacon

  // constant-time compare, length pre-checked; fail-closed when no token
  function tokenEq(presented: unknown, expected: string): boolean {
    const a = Buffer.from(String(presented)),
      b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  // ---------- per-session traffic token + inbound audit (2026-09-24 hardening lap) ----------
  // sessionToken authenticates /send + /stop ONLY (strict: the machine token
  // above is rejected there — it stays the register bootstrap). Generated at
  // every session_start, never persisted, never logged; carried in every
  // register payload so the bot's beaconSend/beaconStop present it. A beacon
  // that registered WITHOUT one (a pre-hardening instance) makes the bot fall
  // back to the machine token bot-side — those beacons run the old /send gate
  // and accept it, so live conversations survive the lap; new beacons never do.
  let sessionToken = "";
  let legacyWarned = false;
  // TUI relay (discord-visibility lap): every /send's injected text, consumed by
  // the matching input event — the queue distinguishes discord-sourced turns
  // (never relayed: that text is already the user's own message on the surface)
  // from external ones (relayed). TTL-bounded: a parked steer that never
  // delivered must not hold a match forever.
  const SEND_TEXT_TTL_MS = 10 * 60 * 1000;
  const sendTexts: { text: string; at: number }[] = [];
  // one line per inbound control request (send-route-audit): route, source
  // socket/port, own session id (short), which credential authenticated,
  // verdict, outcome, payload bytes. Never the token value, never the message
  // text — bytes + timestamp correlate with the receiving transcript when
  // needed. 401s log always (the security signal); /healthz never logs.
  const audit = (
    req: http.IncomingMessage,
    route: string,
    tokenSource: string,
    auth: string,
    outcome: string,
    bytes: number,
  ) => {
    const sid = safe(() => ctx!.sessionManager.getSessionId());
    console.error(
      `[discord-beacon] audit route=${route} src=${
        req.socket.remoteAddress ?? "?"
      }:${req.socket.remotePort ?? 0} sessionId=${
        sid ? sid.slice(0, 8) + "…" : "none"
      } tokenSource=${tokenSource} auth=${auth} outcome=${outcome} bytes=${bytes}`,
    );
  };
  const declaredBytes = (req: http.IncomingMessage): number =>
    Number(req.headers["content-length"] ?? 0) || 0;
  const SEND_MAX_BYTES = 16 * 1024; // /send cap: bounded blast radius for a runaway injector (413 + audit line)

  // ---------- per-field safe accessor (webui pattern: a throwing getter must not kill registration) ----------
  const safe = <T>(fn: () => T | undefined | null): T | undefined => {
    try {
      const v = fn();
      return v === null || v === undefined ? undefined : v;
    } catch {
      return undefined;
    }
  };

  function post(pathname: string, body: any): Promise<number> {
    return new Promise((resolve) => {
      try {
        const req = http.request(
          {
            host: "127.0.0.1",
            port: BOT_PORT(),
            path: pathname,
            method: "POST",
            signal: AbortSignal.timeout(8000), // wedged-bot guard (8s like the webui twins)
            headers: {
              "content-type": "application/json",
              ...(TOKEN ? { "x-prime-token": TOKEN } : {}),
            },
          },
          (r) => {
            r.resume();
            resolve(r.statusCode ?? 0);
          },
        );
        req.on("error", () => resolve(0));
        req.end(JSON.stringify(body));
      } catch {
        resolve(0);
      }
    });
  }
  // post() answers with the status code alone; the discord_thread tool needs the
  // body too (the new thread id) — same transport, JSON-parsed response
  function postJson(
    pathname: string,
    body: any,
  ): Promise<{ code: number; json: any }> {
    return new Promise((resolve) => {
      try {
        const req = http.request(
          {
            host: "127.0.0.1",
            port: BOT_PORT(),
            path: pathname,
            method: "POST",
            signal: AbortSignal.timeout(12000), // thread create + member add ride this one call
            headers: {
              "content-type": "application/json",
              ...(TOKEN ? { "x-prime-token": TOKEN } : {}),
            },
          },
          (r) => {
            const chunks: Buffer[] = [];
            r.on("data", (ch) => chunks.push(ch as Buffer));
            r.on("end", () => {
              let json: any = null;
              try {
                json = JSON.parse(Buffer.concat(chunks).toString() || "null");
              } catch {}
              resolve({ code: r.statusCode ?? 0, json });
            });
          },
        );
        req.on("error", () => resolve({ code: 0, json: null }));
        req.end(JSON.stringify(body));
      } catch {
        resolve({ code: 0, json: null });
      }
    });
  }

  // ---------- bot respawn: probe-first, one attempt per 30s per process (D8) ----------
  let spawnLogFd: number | null = null;
  function spawnLog(): number | "ignore" {
    if (spawnLogFd === null) {
      try {
        spawnLogFd = fs.openSync(path.join(HERE, "server.log"), "a");
      } catch {
        spawnLogFd = "ignore";
      }
    }
    return spawnLogFd;
  }
  async function ensureBotUp(): Promise<void> {
    const G = globalThis as Record<string, any>;
    const now = Date.now();
    if (G.__primeDiscordSpawnAt && now - G.__primeDiscordSpawnAt < 30000)
      return; // N sessions share this stamp
    if ((G.__primeDiscordSpawnCount ?? 0) >= 3) return; // per-process cap: a dead non-canonical port (the probe-stub shape) would otherwise churn respawns every 30s for the session's lifetime
    G.__primeDiscordSpawnAt = now;
    try {
      await fetch(`http://127.0.0.1:${BOT_PORT()}/healthz`, {
        signal: AbortSignal.timeout(3000),
      });
      return; // any response means the bot owns its port
    } catch {
      /* down — fall through and spawn */
    }
    G.__primeDiscordSpawnCount = (G.__primeDiscordSpawnCount ?? 0) + 1;
    try {
      const child = spawn("node", [path.join(HERE, "server.mjs")], {
        detached: true,
        stdio: ["ignore", "ignore", spawnLog()],
        env: respawnEnv(),
      });
      child.unref();
      console.error(
        `[discord-beacon] bot health probe failed (port ${BOT_PORT()}) — respawned server.mjs on the canonical lock port (attempt ${
          G.__primeDiscordSpawnCount ?? 0
        } of 3)`,
      ); // console.error: only stderr reaches the daemon supervisor log
    } catch (e: any) {
      console.error("[discord-beacon] bot respawn failed:", e?.message ?? e);
    }
  }

  // ---------- register / heartbeat ----------
  const convTag = process.env.DISCORD_CONV_KEY ?? null; // scope-guard tag: only bot-spawned children carry this
  // session naming (discord-visibility feedback lap): the bot resolves the
  // conversation's SURFACE name (channel name / thread title / DM recipient)
  // and passes it as DISCORD_CONV_NAME on the spawn env — the machine-garbage
  // "discord channel 9967911148" fallback only covers the first spawn before
  // the bot's fetch lands (and untagged fallbacks like probe stubs).
  function sessionNameFor(convKey: string): string {
    const envName = String(process.env.DISCORD_CONV_NAME ?? "")
      .replace(/[\r\n]+/g, " ")
      .trim()
      .replace(/\s+/g, " "); // the bot's resolved name — sanitize defensively, never multi-line
    if (envName) return envName.slice(0, 26); // operator picker limit
    const slug = convKey
      .replace(/[^a-z0-9]+/gi, " ")
      .trim()
      .replace(/\s+/g, " ");
    return ("discord " + slug).slice(0, 26); // operator picker limit
  }
  const BEAT_MS = () => {
    const v = Number(process.env.DISCORD_BEAT_INTERVAL_MS);
    return Number.isFinite(v) && v > 0 ? v : 15000;
  }; // env: the smoke drives heartbeats fast; production 15s
  function armBeat() {
    if (!beat) beat = setInterval(() => register(true), BEAT_MS());
  }
  function registeredNow() {
    if (!registered) {
      registered = true;
      console.log("[discord-beacon] registered with the discord bot");
    }
    // session-name assert on EVERY register, heartbeats included (discord-
    // visibility round 2): a session spawned before the naming code registers
    // name=null forever — the old first-register-only naming never ran for it
    // — so presence fell back to the product name. A falsy name re-asserts
    // here: a legacy session self-heals on its next heartbeat (<=15s), and a
    // failed attempt retries on the next beat. A session that HAS a name (any
    // name, including an agent topic-rename via the session_topic tool) is
    // NEVER touched.
    if (convTag) {
      const current = safe(() => ctx?.sessionManager.getSessionName?.());
      if (!current) {
        // naming is cosmetic; a name-collision rejection must NEVER crash the
        // session worker (unhandled-rejection kill: "name already exists").
        // The daemon's name registry can still reject a FRESH name as a
        // duplicate (a separate operator fix session): retry ONCE with a
        // short unique suffix — "<last2 of session id>" kept inside the
        // picker limit — then give up silently (the next heartbeat re-asserts).
        const base = sessionNameFor(convTag);
        const sid = safe(() => ctx?.sessionManager.getSessionId()) ?? "";
        const fallback = `${base.slice(0, 23)} ${
          sid ? sid.slice(-2) : "x1"
        }`.slice(0, 26);
        const retryOnce = () => {
          try {
            const p2: any = pi.setSessionName(fallback);
            p2?.catch?.(() => {});
          } catch {}
        };
        try {
          const p: any = pi.setSessionName(base);
          p?.catch?.(retryOnce); // rejected (or sync-thrown) -> one suffixed retry; resolved/sync-success never retries
        } catch {
          retryOnce();
        }
      }
    }
    armBeat();
  }
  async function register(heartbeat: boolean) {
    if (!ctx) return;
    const sm: any = safe(() => ctx!.sessionManager);
    const sessionId = safe(() => sm.getSessionId());
    if (!sessionId) {
      armBeat();
      return;
    } // degraded getter: retry on the next beat, never dead-register
    const payload = {
      sessionId,
      controlPort,
      pid: process.pid,
      ...(sessionToken ? { sessionToken } : {}), // the per-session /send+/stop credential — the bot stores it on the route row and presents it; beacons WITHOUT one (pre-hardening) make the bot fall back to the machine token
      ...(convTag ? { convKey: convTag } : {}),
      name: safe(() => sm.getSessionName?.()),
      // the claim inputs (webui beacon shape): prime-agent delegates to the
      // operator's daemon, so pid alone can never prove this session belongs
      // to the bot's spawn — the bot adopts the first NEW session file on the
      // spawn's cwd, created after the spawn (file ∉ pre-spawn snapshot)
      file: safe(() => sm.getSessionFile?.()),
      created: safe(() => sm.getHeader?.()?.timestamp), // session-start stamp — strictly after our wrapper spawned
      cwd: safe(() => sm.getCwd?.()),
      status: safe(() => (ctx?.isIdle?.() ? "idle" : "working")) ?? "working",
    };
    const code = await post("/internal/register", payload);
    if (code === 200) {
      registeredNow();
      return;
    }
    armBeat(); // any failure still arms the beat — a bot restart self-heals on the next tick
    await ensureBotUp();
    if (heartbeat) return;
    if (!retry)
      retry = setInterval(async () => {
        const c = await post("/internal/register", payload);
        if (c === 200) {
          if (retry) clearInterval(retry);
          retry = undefined;
          registeredNow();
        }
      }, 5000);
  }

  const teardownBeacon = () => {
    registered = false;
    if (beat) clearInterval(beat);
    beat = undefined;
    if (retry) clearInterval(retry);
    retry = undefined;
    if (control) {
      control.close();
      control = null;
    }
  };

  // ---------- live event forwarding (assistant text only — the bot streams it to Discord, D6) ----------
  const textOf = (c: any): string =>
    typeof c === "string"
      ? c
      : Array.isArray(c)
        ? c
            .filter((b: any) => b?.type === "text")
            .map((b: any) => b.text)
            .join("\n")
        : "";
  function forward(event: string, data: unknown) {
    if (!registered || !ctx) return;
    const sessionId = safe(() => ctx!.sessionManager.getSessionId());
    if (!sessionId) return; // throwing getter mid-event: drop the frame, never kill the agent
    post("/internal/event", { sessionId, event, data });
  }

  // ---------- discord context injection (conversation sessions learn their surface) ----------
  // Bot-spawned conversations had no idea they run inside Discord. Appends a
  // live "## Discord context" block (surface in words + surface id) plus
  // discord-guidelines.md to the system prompt — name-sessions precedent:
  // before_agent_start may return { systemPrompt }; merge by APPENDING to
  // event.systemPrompt, never replacing.
  // Gate: DISCORD_CONV_KEY (the scope-guard tag) — operator sessions and
  // untagged sessions are never touched. Knobs env > config.json, identical
  // chain to server.mjs loadConfig (keep both in sync):
  //   guidelines (default true; env DISCORD_GUIDELINES) and
  //   guidelines_file (default <HERE>/discord-guidelines.md; env DISCORD_GUIDELINES_FILE).
  let guidelinesWarned = false; // one warn per session — the context block still injects without the file
  function describeSurface(convKey: string): string {
    if (convKey.startsWith("thread:")) return "a Discord thread";
    if (convKey.startsWith("dm:")) return "a direct-message conversation";
    if (convKey.startsWith("channel:")) return "a shared channel";
    return "a Discord conversation"; // ponytail: unknown key shape — truthful words beat a crash
  }
  pi.on("before_agent_start", async (event) => {
    if (!convTag) return; // scope guard: discord conversation sessions only
    const liveCfg = readCfg(); // knobs read per turn — config edits need no reload
    const envOn = process.env.DISCORD_GUIDELINES;
    const on =
      envOn !== undefined && envOn !== ""
        ? envOn === "1" || envOn.toLowerCase() === "true"
        : liveCfg.guidelines !== false; // default true
    if (!on) return;
    const envFile = process.env.DISCORD_GUIDELINES_FILE;
    const file =
      envFile !== undefined && envFile !== ""
        ? envFile
        : typeof liveCfg.guidelines_file === "string" && liveCfg.guidelines_file
          ? liveCfg.guidelines_file
          : path.join(HERE, "discord-guidelines.md"); // "" (or absent) = default path
    let body = "";
    try {
      body = fs.readFileSync(file, "utf-8");
    } catch (e: any) {
      if (!guidelinesWarned) {
        guidelinesWarned = true;
        console.error(
          `[discord-beacon] guidelines file unreadable (${file}): ${
            e?.message ?? e
          } — injecting the Discord context without it`,
        );
      }
    }
    let block = `\n\n## Discord context\n\nThis conversation runs inside Discord. The live surface for this session is ${describeSurface(
      convTag,
    )} (surface id: ${convTag}).`;
    if (body.trim()) block += `\n\n${body}`;
    return { systemPrompt: event.systemPrompt + block };
  });

  // ---------- webui conversation deeplinks (discord-visibility feedback lap) ----------
  // Mirrors server.mjs's knob chain: DISCORD_WEBUI_BASE_URL (non-empty) >
  // config.json webui_base_url; http(s) required, trailing slashes stripped.
  // A malformed base yields "" — the agent's turn never throws over a config
  // mistake (the bot fails loud at its own config load first).
  const webuiLink = (sessionId: string): string => {
    const envRaw = process.env.DISCORD_WEBUI_BASE_URL;
    const raw = String(
      (envRaw !== undefined && envRaw !== ""
        ? envRaw
        : readCfg().webui_base_url) ?? "",
    ).trim();
    if (!raw || !sessionId) return "";
    const base = raw.replace(/\/+$/, "");
    return /^https?:\/\//.test(base)
      ? `${base}#/s/${encodeURIComponent(sessionId)}`
      : "";
  };

  // ---------- discord_thread tool (thread_policy "agent"): the agent decides ----------
  // Registered ONLY in discord-tagged sessions (the scope-guard tag) — the
  // operator's interactive sessions never see it. Same registerTool surface as the
  // a2a and name-sessions extensions: { name, label, description, promptGuidelines,
  // parameters, async execute(toolCallId, params) }. The tool POSTs the bot's
  // /internal/thread: the bot creates a PUBLIC thread from the conversation's
  // current trigger message, adds the trigger author to its members, re-keys the
  // conversation (channel:<id> -> thread:<id>, SAME session — no respawn, context
  // preserved), and answers with the new thread id.
  if (convTag) {
    pi.registerTool({
      name: "discord_thread",
      label: "Start a Discord thread",
      description:
        'Move this shared-channel conversation into a new public thread created from the current message — shared-channel promotion only, never inside an existing thread or in DMs. A TASK ("go fix X", "open an MR", "investigate Y", "build Z", any multi-step work) means call discord_thread FIRST, before starting the work. Rule of thumb: if the work needs more than one tool call — or you are about to spawn/delegate to a child agent — it deserves a thread. Quick answers stay in the channel — do NOT call this for them. Substantial topics (research, a build, a review): call it with a short lowercase name (2-3 words), then continue the reply in the thread. Returns the new thread id. The conversation\'s Discord guidelines carry the full etiquette.',
      promptGuidelines: [
        'A TASK ("go fix X", "open an MR", "investigate Y", "build Z", any multi-step work) in a shared channel: call discord_thread FIRST, before starting the work, then continue the reply in the thread.',
        "Rule of thumb: if the work needs more than one tool call — or you are about to spawn/delegate to a child agent — it deserves a thread.",
        "Quick answers stay in the channel (no discord_thread call). For a substantial topic (research, a build, a review, multi-step work), call discord_thread with a short lowercase name (2-3 words) and continue the reply in the thread — replies land there automatically.",
        "Never call discord_thread inside an existing thread or in DMs — shared-channel promotion only.",
      ],
      parameters: THREAD_TOOL_PARAMS,
      async execute(_toolCallId: string, params: any) {
        const name = String(params?.name ?? "").trim();
        if (!name) {
          return {
            content: [
              {
                type: "text",
                text: "discord_thread: empty name — retry with a short thread name (2-3 lowercase words), then continue the user's request.",
              },
            ],
          };
        }
        const sessionId = safe(() => ctx!.sessionManager.getSessionId());
        if (!sessionId) {
          return {
            content: [
              {
                type: "text",
                text: "discord_thread: no live session id — answer in place instead.",
              },
            ],
          };
        }
        const { code, json } = await postJson("/internal/thread", {
          sessionId,
          name,
        });
        if (code === 200 && json?.ok) {
          const uiLink = webuiLink(sessionId); // "" when the feature is off — the conversation moved WITH this session, so the link still opens it
          return {
            content: [
              {
                type: "text",
                text:
                  `Thread created: ${json.convKey ?? "thread"} (id ${
                    json.threadId
                  }). Continue the reply in the thread — it lands there automatically; the ✅ ack still lands on the channel message.` +
                  (uiLink ? ` Conversation ui link: ${uiLink}` : ""),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `discord_thread: ${
                json?.error ?? `bot unreachable (HTTP ${code})`
              } — answer in place instead.`,
            },
          ],
        };
      },
    });

    // ---------- session_topic tool (discord-visibility round 2): topic renames ----------
    // The spawn-time name (the bot's DISCORD_CONV_NAME surface name) is accurate
    // at spawn and goes stale as the work evolves — "always initially just
    // 'discord something'". The agent renames the conversation when the topic
    // clearly changes: the guarded setSessionName below uses the SAME
    // retry-once-suffix-then-silence shape as the register-path naming, so a
    // supervisor rejection can never escape as the unhandled rejection that
    // kills workers (the reason the native name_session is blocked in
    // discord-tagged sessions — session_topic is the sanctioned rename). The
    // next heartbeat (<=15s) carries the new name in the register payload, so
    // presence, /status, and the thread rename (maybeRenameThread) all track
    // it; a truthy name also pins the register-path assert — the beacon never
    // fights the agent's rename.
    pi.registerTool({
      name: "session_topic",
      label: "Rename the conversation's topic",
      description:
        "Rename this conversation to its CURRENT topic. The name starts as the Discord surface (\"discord <channel/thread>\") and goes stale as the work evolves. Call it when the conversation clearly moves onto a new subject — a new task, a pivot, a different deliverable — with a short topic slug (2-3 lowercase words, <=26 chars). The rename shows in the operator's session picker, the bot's presence line, /status, and the thread title (threads), within ~15s. Do not rename for quick follow-ups on the same topic.",
      promptGuidelines: [
        "When the work clearly pivots to a NEW topic mid-conversation, call session_topic with a short topic slug (2-3 lowercase words, <=26 chars), then continue the user's task.",
        "Same-topic follow-ups need no rename; renames ride the next heartbeat (~15s).",
      ],
      parameters: TOPIC_TOOL_PARAMS,
      async execute(_toolCallId: string, params: any) {
        const raw = String(params?.name ?? "")
          .replace(/[\r\n]+/g, " ")
          .trim()
          .replace(/\s+/g, " "); // the sessionNameFor discipline — never multi-line
        if (!raw) {
          return {
            content: [
              {
                type: "text",
                text: "session_topic: empty name — retry with a short topic slug (2-3 lowercase words, <=26 chars), then continue the user's request.",
              },
            ],
          };
        }
        if (typeof pi.setSessionName !== "function") {
          return {
            content: [
              {
                type: "text",
                text: "session_topic: unavailable — this harness exposes no session-name API; continue the user's request.",
              },
            ],
          };
        }
        const name = raw.slice(0, 26); // the operator picker limit (sessionNameFor's clamp)
        // guarded setSessionName: a rejection (a dead session holds the name) retries
        // ONCE with the "<last2 of session id>" suffix, then gives up silently — the
        // register-path pattern, awaited so the tool can report the outcome
        const tryName = (n: string): Promise<boolean> =>
          new Promise((resolve) => {
            let done = false;
            const finish = (ok: boolean) => {
              if (!done) {
                done = true;
                resolve(ok);
              }
            };
            try {
              const p: any = pi.setSessionName(n);
              if (p && typeof p.then === "function")
                p.then(
                  () => finish(true),
                  () => finish(false),
                );
              else finish(true); // sync success — no promise returned (the register-path bare-return shape)
            } catch {
              finish(false);
            } // sync-throw -> the guarded failure leg, never a worker crash
          });
        if (await tryName(name)) {
          return {
            content: [
              {
                type: "text",
                text: `session_topic: renamed — "${name}" (presence, /status, and the thread title follow on the next heartbeat, <=15s).`,
              },
            ],
          };
        }
        const sid = safe(() => ctx?.sessionManager.getSessionId()) ?? "";
        const suffixed = `${name.slice(0, 23)} ${
          sid ? sid.slice(-2) : "x1"
        }`.slice(0, 26);
        if (await tryName(suffixed)) {
          return {
            content: [
              {
                type: "text",
                text: `session_topic: rejected — "${name}" is held by a dead session; retried with suffix: "${suffixed}" (presence, /status, and the thread title follow on the next heartbeat, <=15s).`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: "session_topic: unavailable — the name could not be set; the conversation keeps its current name. Continue with the user's task.",
            },
          ],
        };
      },
    });
  }

  // ---------- session-name tool guard (production 2026-09-27 worker-death fix) ----------
  // WITNESSED (daemon log 01:15:13Z): the model's name_session call can KILL the
  // session worker mid-turn. The operator's name-sessions extension runs
  // pi.setSessionName(name) fire-and-forget with no catch — a supervisor
  // name-collision rejection ("an agent of that name already exists at depth 0",
  // eviction off = dead saved sessions hold names forever) escapes as an unhandled
  // rejection at setStateSessionNameViaSupervisor and the worker dies; the daemon
  // recovers it without replaying the uncertain turn_start and the conversation
  // cascades into a stuck 👀. The beacon names discord conversations itself
  // (registeredNow -> sessionNameFor, rejection caught there), so the model's call
  // is redundant — and here it is fatal. Block it benignly in discord-tagged
  // sessions; untagged sessions (the operator's interactive work) keep the tool.
  const NAME_TOOLS = new Set([
    "name_session",
    "set_session_name",
    "setSessionName",
  ]);
  pi.on("tool_call", async (event) => {
    // the block contract: { block: true, reason } -> the loop returns an error tool result carrying the reason
    if (!convTag) return; // scope guard: only discord-tagged sessions
    if (!NAME_TOOLS.has(String(event?.toolName ?? ""))) return;
    return {
      block: true,
      reason:
        "session name is managed for this conversation (the discord bot names it) — use the session_topic tool to rename it, and continue with the user's task",
    };
  });

  // ---------- session lifecycle ----------
  pi.on("session_start", async (_event, c) => {
    ctx = c;
    sessionToken = crypto.randomUUID(); // the per-session /send+/stop credential — fresh at every session_start (a /reload re-registers and re-binds the route to the new token)
    control = http.createServer(async (req, res) => {
      const serve = (code: number, type: string, body: string) => {
        res.writeHead(code, { "content-type": type });
        res.end(body);
      };
      let url: URL;
      try {
        url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      } catch {
        audit(req, "(invalid)", "none", "fail", "400", declaredBytes(req));
        return serve(400, "text/plain", "bad request");
      }
      if (url.pathname === "/healthz")
        return serve(200, "application/json", JSON.stringify({ ok: true })); // silent by design: the health probe, not traffic
      // strict per-session gate: ONLY this session's token opens /send + /stop.
      // 401s always audit — a wrong-token probe on the loopback port is the
      // highest-signal event the pre-audit build swallowed whole (the 2026-09-23
      // invisible /send mystery was invisible for exactly this reason).
      const presented = req.headers["x-prime-token"];
      if (!sessionToken || !tokenEq(presented, sessionToken)) {
        audit(req, url.pathname, "none", "fail", "401", declaredBytes(req));
        if (!legacyWarned && TOKEN && tokenEq(presented, TOKEN)) {
          // the machine token specifically: the caller IS the old bot (or a machine-token scraper) — name the window once
          legacyWarned = true;
          console.error(
            "[discord-beacon] a machine-token caller was rejected on session traffic — the running bot predates per-session tokens (restart server.mjs) or an unhardened local process is probing; session traffic stays session-token-only",
          );
        }
        return serve(401, "text/plain", "unauthorized");
      }
      if (req.method === "POST" && url.pathname === "/send") {
        const declared = declaredBytes(req);
        if (declared > SEND_MAX_BYTES) {
          audit(req, "/send", "session", "ok", "413", declared);
          return serve(413, "text/plain", "payload too large");
        } // the cap rejects before reading the body
        const chunks: Buffer[] = [];
        let total = 0;
        for await (const ch of req) {
          total += (ch as Buffer).length;
          if (total > SEND_MAX_BYTES) break;
          chunks.push(ch as Buffer);
        } // stop buffering past the cap — the rest is discarded with the response
        if (total > SEND_MAX_BYTES) {
          audit(req, "/send", "session", "ok", "413", total);
          return serve(413, "text/plain", "payload too large");
        } // chunked posts with no content-length still cap
        let text = "";
        try {
          text =
            (JSON.parse(Buffer.concat(chunks).toString()) ?? {}).text ?? "";
        } catch {
          audit(req, "/send", "session", "ok", "400", total);
          return serve(400, "text/plain", "bad json");
        }
        if (!text.trim()) {
          audit(req, "/send", "session", "ok", "400", total);
          return serve(400, "text/plain", "empty");
        }
        sendTexts.push({ text, at: Date.now() }); // the relay's negative: this text is ALREADY on the Discord surface — the input event consumes the match below
        while (
          sendTexts.length &&
          Date.now() - sendTexts[0].at > SEND_TEXT_TTL_MS
        )
          sendTexts.shift(); // TTL prune — a parked steer that never delivered self-heals
        try {
          const idle = safe(() => ctx?.isIdle?.());
          if (idle) {
            try {
              pi.sendUserMessage(text);
              audit(req, "/send", "session", "ok", "turn", total);
              return serve(
                200,
                "application/json",
                JSON.stringify({ ok: true, delivered: "turn" }),
              );
            } catch {
              // idle raced a new turn — queue instead
              pi.sendUserMessage(text, { deliverAs: "steer" });
              audit(req, "/send", "session", "ok", "steer", total);
              return serve(
                200,
                "application/json",
                JSON.stringify({ ok: true, delivered: "steer" }),
              );
            }
          } else {
            pi.sendUserMessage(text, { deliverAs: "steer" });
            audit(req, "/send", "session", "ok", "steer", total);
            return serve(
              200,
              "application/json",
              JSON.stringify({ ok: true, delivered: "steer" }),
            );
          }
        } catch (e: any) {
          audit(req, "/send", "session", "ok", "500", total);
          return serve(500, "text/plain", String(e?.message ?? e));
        }
      }
      if (req.method === "POST" && url.pathname === "/stop") {
        // busy-UX /stop (hermes-catalog #1): the webui POST /abort twin — the per-session gate above already covers this route like /send
        const p: any = safe(() => ctx?.abort?.()); // abort() = requestAbort (the LLM stream + in-flight turn actions cancel, queue-visible turns PARK — the next message resumes them) + await idle; agent_end still fires on abort, so the busy:false settle resolves the ack on its own
        if (p && typeof p.then === "function") p.catch(() => {}); // fire-and-forget: an abort rejection must never escape as an unhandled rejection (the 2026-09-27 worker-death lesson)
        audit(req, "/stop", "session", "ok", "stop", declaredBytes(req));
        return serve(200, "application/json", JSON.stringify({ ok: true }));
      }
      audit(req, url.pathname, "session", "ok", "404", declaredBytes(req)); // an authed caller probing an unknown route — rare, always worth a line
      return serve(404, "text/plain", "not found");
    });
    control.listen(0, "127.0.0.1", () => {
      controlPort = (control!.address() as any).port;
      register(false);
    });
  });

  // ---------- TUI relay (discord-visibility lap): external user input lands on the Discord surface ----------
  // A conversation session is shared: the operator can talk to it through the
  // TUI / any daemon client while the conversation is also live on Discord. The
  // REPLY to such a turn already lands on the surface (message_end -> finalize)
  // — but the question itself was invisible there: the surface saw an answer
  // to an unseen question. The pi `input` event carries every turn's raw user
  // text + its source ("interactive" | "rpc" | "extension"; agent-injected
  // prompts — heartbeats, agent messages — skip input handlers entirely, so
  // machine noise never relays). Everything the bot's own /send injected is
  // consumed by the pending-match (already the user's own Discord message —
  // never relayed); everything else relays to the bot's /internal/relay, which
  // posts it on the surface with a provenance tag. The agent transcript keeps
  // exactly ONE copy (the session's own write): this path never calls
  // sendUserMessage. Knob (identical chain to server.mjs loadConfig — keep
  // both in sync): relay_external, default true; env DISCORD_RELAY_EXTERNAL.
  function relayExternalOn(): boolean {
    const env = process.env.DISCORD_RELAY_EXTERNAL;
    if (env !== undefined && env !== "")
      return env === "1" || env.toLowerCase() === "true";
    return readCfg().relay_external !== false; // default true
  }
  function relayExternal(text: string, source: string) {
    if (!registered || !ctx) return; // same discipline as forward(): nothing exists to relay onto before the route lands
    if (!convTag) return; // scope guard: only bot-spawned conversation sessions relay — the operator's interactive sessions are never a Discord conversation
    if (!relayExternalOn()) return;
    const sessionId = safe(() => ctx!.sessionManager.getSessionId());
    if (!sessionId) return;
    post("/internal/relay", { sessionId, text, source }); // fire-and-forget: a 409 (no route yet) drops, exactly like a dropped forward()
  }
  pi.on("input", async (event: any) => {
    const text = String(event?.text ?? "");
    if (!text.trim()) return;
    // suffix-match, not equality: a same-chain input transform may PREPEND a
    // directive (the webui beacon annotates command-shaped extension texts) —
    // the raw /send text stays the suffix, so the match survives any order the
    // extensions load in
    const at = sendTexts.findIndex((p) => text.endsWith(p.text));
    if (at >= 0) {
      sendTexts.splice(at, 1);
      return;
    } // discord-sourced — already on the surface
    relayExternal(text, String(event?.source ?? ""));
  });

  pi.on("message_update", async (event) => {
    const m: any = event.message;
    if (m?.role !== "assistant") return;
    const text = textOf(m.content);
    if (text) forward("message_update", { text }); // cumulative text — the bot throttles edits its side
  });
  pi.on("message_end", async (event) => {
    const m: any = event.message;
    if (m?.role !== "assistant") return;
    forward("message_end", { text: textOf(m.content) });
  });
  // ---------- turn signals (production 2026-09-27 typing-never-appears fix) ----------
  // PRODUCTION FACT (spawned-agents.log, 52k events): rpc sessions emit BOTH pairs —
  // agent_start/agent_end (779/834 witnessed) AND turn_start/turn_end (168/181) — and
  // the runtime forwards both to extension handlers (0.9.5 compiled _emitExtensionEvent:
  // every event type has an emit branch). The bot's typing/timer no longer DEPEND on
  // these (they start at dispatch), so these forwards are the redundant live signal —
  // whichever pair a future runtime delivers, busy:true arrives. turn_start also covers
  // the register-flush race: the FIRST agent_start of a spawned session fires while the
  // register 200 is still in flight (the flush's /send resolves it), before `registered`
  // flips — forward() drops exactly that one; the next turn_start still lands mid-run.
  // turn_end is deliberately NOT forwarded as busy:false: it fires after EVERY tool-call
  // turn mid-run, and a mid-run settle resolves the trigger ⚠️ while the agent keeps
  // working — the exact 2026-09-26 ⚠️-on-a-delivered-turn shape. agent_end (834
  // witnessed in production) is the true loop-end; a lost agent_end is the turn timer's
  // job, never a mid-run turn_end's.
  let noticedAgentStart = false,
    noticedTurnStart = false; // one-time receipt notices — production evidence in the worker stderr (daemon supervisor log)
  pi.on("agent_start", async () => {
    if (!noticedAgentStart) {
      noticedAgentStart = true;
      console.error(
        "[discord-beacon] live signal: agent_start received (forwarding busy)",
      );
    } // console.error: only stderr reaches the daemon supervisor log
    forward("busy", { busy: true });
  });
  pi.on("agent_end", async () => {
    forward("busy", { busy: false });
  });
  pi.on("turn_start", async () => {
    if (!noticedTurnStart) {
      noticedTurnStart = true;
      console.error(
        "[discord-beacon] live signal: turn_start received (forwarding busy)",
      );
    } // console.error: only stderr reaches the daemon supervisor log
    forward("busy", { busy: true }); // mid-run turns keep the busy signal warm — idempotent on the bot side
  });

  pi.on("session_shutdown", async (event) => {
    // /reload emits shutdown FIRST then rebuilds + re-registers the same id on
    // a NEW port (~the webui blink): keep the row through a reload, unregister
    // on every other reason so stale routes prune
    if (ctx && (event as any)?.reason !== "reload") {
      const sessionId = safe(() => ctx!.sessionManager.getSessionId());
      if (sessionId) await post("/internal/unregister", { sessionId });
    }
    teardownBeacon();
    ctx = null;
  });
}
