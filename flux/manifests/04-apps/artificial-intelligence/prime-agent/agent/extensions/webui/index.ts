/**
 * prime-webui beacon — per-agent extension.
 *
 * The webui itself runs as a standalone collector process (server.ts, same
 * directory) that owns the public port and survives agents. This beacon:
 *   - serves /snapshot, /send, /abort and the settings-parity routes
 *     (/models /set-model /set-thinking-level /rename /compact /shutdown
 *     /context-usage) for THIS session on an ephemeral
 *     loopback port (no port conflicts, ever),
 *   - registers the session with the collector (retries; respawns the
 *     collector if it is down),
 *   - forwards live stream events to the collector.
 * Spawns: node <HERE>/server.ts (detached) when the collector is missing.
 */
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as crypto from "node:crypto";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const HERE = path.dirname(fileURLToPath(import.meta.url));

type Config = { port?: number; token?: string };
let cfg: any = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf-8")); } catch {}
const PUBLIC_PORT = parseInt(process.env.PRIME_WEBUI_PORT ?? String(cfg.port ?? 8788), 10);
const INTERNAL_PORT = parseInt(process.env.PRIME_WEBUI_INTERNAL_PORT ?? String(PUBLIC_PORT + 1), 10);
// token resolution (identical chain to server.mjs — keep both in sync):
// env -> config.json -> token file -> generate + persist. Resolving the same
// file on both sides is what lets beacon and collector share a token in any
// deployment shape (local, k8s Secret at webui-token, env-injected) with zero
// hand-maintenance. Never logged (only the source is).
const TOKEN_FILE = process.env.PRIME_WEBUI_TOKEN_FILE ?? path.join(HERE, "webui-token");
function resolveToken(): { token: string; source: string } {
  if (process.env.PRIME_WEBUI_TOKEN) return { token: process.env.PRIME_WEBUI_TOKEN, source: "env" };
  if (cfg.token) return { token: String(cfg.token), source: "config" };
  try {
    const t = fs.readFileSync(TOKEN_FILE, "utf-8").trim();
    if (t) return { token: t, source: "file" };
  } catch {}
  const token = crypto.randomUUID();
  try {
    fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fs.writeFileSync(TOKEN_FILE, token + "\n", { mode: 0o600 });
    try { fs.chmodSync(TOKEN_FILE, 0o600); } catch {}
  } catch (e: any) { console.error("[webui-beacon] token persist failed:", e?.message ?? e); }
  return { token, source: "generated" };
}
const { token: TOKEN, source: TOKEN_SOURCE } = resolveToken();
console.log("[webui-beacon] token source:", TOKEN_SOURCE);

type Item = // 7(r): ts = the message's own timestamp (epoch ms); absent -> the client renders no time
  | { kind: "user"; id: string; ts?: number; text: string }
  | { kind: "assistant"; id: string; ts?: number; text: string; thinking?: string; model?: string; tokens?: number; cost?: number; usage?: any; toolCalls: { id: string; name: string; args: string }[] }
  | { kind: "tool"; id: string; ts?: number; toolName: string; status: "running" | "done" | "error"; args?: string; text?: string }
  | { kind: "custom"; id: string; ts?: number; label: string; text: string }
  | { kind: "notice"; id: string; ts?: number; text: string };

const textOf = (c: any): string =>
  typeof c === "string" ? c : Array.isArray(c) ? c.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n") : "";

function mapMessage(msg: any, key: string): Item[] {
  if (!msg) return [];
  const ts = msg.timestamp; // 7(r): per-item time — every message kind carries it (epoch ms)
  switch (msg.role) {
    case "user": return [{ kind: "user", id: key, ts, text: textOf(msg.content) }];
    case "assistant": {
      const blocks: any[] = Array.isArray(msg.content) ? msg.content : [];
      return [{ kind: "assistant", id: key, ts,
        text: blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n"),
        thinking: blocks.filter((b) => b.type === "thinking").map((b) => b.thinking).join("\n") || undefined,
        model: msg.model,
        // R1 (twin-dialect alignment, 40-ponytail-audit): the collector's
        // mapMessage emits tokens/cost — the only dialect the client
        // renders; the beacon's bare `usage` hid live usage lines. Emit BOTH:
        // tokens/cost mirror server.mjs's derivation, usage stays for compat.
        tokens: msg.usage?.totalTokens,
        cost: msg.usage?.cost?.total,
        usage: msg.usage,
        toolCalls: blocks.filter((b) => b.type === "toolCall").map((b) => ({ id: b.id, name: b.name, args: JSON.stringify(b.arguments ?? {}).slice(0, 2000) })) }];
    }
    case "toolResult": return [{ kind: "tool", id: msg.toolCallId ?? key, ts, toolName: msg.toolName ?? "tool",
      status: msg.isError ? "error" : "done", text: textOf(msg.content).slice(0, 8000) }];
    case "custom": return [{ kind: "custom", id: key, ts, label: msg.customType ?? "custom", text: textOf(msg.content) }];
    case "compactionSummary": return [{ kind: "notice", id: key, ts, text: `Compaction (${msg.tokensBefore ?? "?"} tokens): ${msg.summary}` }];
    case "branchSummary": return [{ kind: "notice", id: key, ts, text: `Branched: ${msg.summary}` }];
    default: return [];
  }
}

// available thinking levels per model — the binary's Yb computation (dump @
// 749884, q4 @ 750540): q4 levels filtered by the model's thinkingLevelMap
// (null = unsupported; xhigh/max need an explicit map entry); ["off"] for
// non-reasoning models; all levels when no model is set (the session's kR
// fallback when !this.model).
const Q4_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
const thinkingLevelsOf = (model: any): string[] => {
  if (!model) return [...Q4_LEVELS];
  if (!model.reasoning) return ["off"];
  return Q4_LEVELS.filter((t) => {
    const v = model?.thinkingLevelMap?.[t];
    if (v === null) return false;
    if (t === "xhigh" || t === "max") return v !== undefined;
    return true;
  });
};

// the /send body pattern, shared by the settings routes: undefined = bad json
async function readJsonBody(r: http.IncomingMessage): Promise<any | undefined> {
  const chunks: Buffer[] = [];
  for await (const ch of r) chunks.push(ch as Buffer);
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { return undefined; }
}

// --- cmd-parity v1 (7v/7av): command-shaped send annotation ------------------
// API VERDICT (0.9.5 binary, dump pos 9766813 + 9737970 + 9742538): the
// beacon's entire send surface is pi.sendUserMessage, which enters the input
// pipeline as _prompt(text, {expandPromptTemplates:false, source:"extension"})
// — and _prompt mirrors that flag into expandSkills AND extensionCommands
// ("ignore"). So on the webui path: /skill:NAME NEVER expands (the TUI's
// _expandSkillCommand runs only with expandSkills:true), extension commands
// NEVER dispatch, and /fork is not a session-level command (G1's session set
// is compact/refine/goal/autonomous — those four execute natively, caught
// before the input event). Every other command-shaped submission lands as
// LITERAL text; only the model's interpretation executes it (probe-proven,
// 7v). The `input` event IS the extension-side normalization hook — it fires
// for source:"extension" submissions BEFORE the flag-disabled expansion — so
// the honest v1 normalizes there: known commands get a directive the model
// executes by interpretation. v2 upgrade path: inject the SKILL.md content
// itself (getCommands sourceInfo.path) instead of the directive.
// /FORK VERDICT (7av): the branch surface EXISTS — ctx.fork(entryId,
// {position:"before"|"at"}) — but ONLY on ExtensionCommandContext (command
// handlers, dump pos 8216669), and sendUserMessage passes
// extensionCommands:"ignore", so no registered command can dispatch on this
// path either; the input event's ctx has no fork. UNREACHABLE from the webui
// until the collector owns an RPC line-client (S6, 27-settings-parity.md).
// Upstream material: sendUserMessage cannot dispatch commands; the
// extension API has no pi-level command invocation surface.
const TUI_ONLY_SEND_COMMANDS = new Set(["fork"]); // clone/tree: same class, follow-ups

function annotateCommandText(text: string, knownNames: Set<string>): string {
  // mirror the runtime's own slash parse (Lu): "/name args..."
  const m = /^\/(\S+)(?:\s+([\s\S]*))?$/.exec(text);
  if (!m) return "";
  const name = m[1];
  if (TUI_ONLY_SEND_COMMANDS.has(name))
    return `The user invoked the command /${name}. /fork branches the session from a previous user message and is TUI-only: the webui send path cannot execute it (no extension-API fork reachable here). Tell the user it must be run in the TUI, or interpret the request if it maps to something you can do.\n\n${text}`;
  if (!knownNames.has(name)) return ""; // unknown /word stays prose
  const directive = name.startsWith("skill:")
    ? `The user invoked the command /${name} — execute it now: load the skill "${name.slice(6)}" (its SKILL.md) and follow it.`
    : `The user invoked the command /${name} — execute it now: perform what this command intends.`;
  return `${directive}\n\n${text}`;
}

export default function (pi: ExtensionAPI) {
  let ctx: ExtensionContext | null = null;
  let control: http.Server | null = null;
  let controlPort = 0;
  let registered = false;
  let beat: NodeJS.Timeout | undefined;
  let retry: NodeJS.Timeout | undefined;
  let dropTimer: NodeJS.Timeout | undefined; // armed at agent_end: steers idle >1.5s were dropped by the runtime
  const queue: string[] = [];
  let turnTextChars = 0, turnThinkingChars = 0, lastPromptChars = 0, turnStart: number | null = null;

  // constant-time token compare + fail-closed (S1+S3 mirror of the
  // collector's tokenEq/authed — owed across three index.ts slices): the
  // length pre-check leaks only the length (standard); timingSafeEqual
  // never sees mismatched lengths (it throws).
  function tokenEq(presented: unknown, expected: string): boolean {
    const a = Buffer.from(String(presented)), b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  let noTokenWarned = false; // the fail-closed log fires once, not per request
  const authed = (req: http.IncomingMessage): boolean => {
    if (!TOKEN) { // fail-closed: a tokenless beacon serves nothing (the collector's pattern)
      if (!noTokenWarned) { console.error("[webui-beacon] auth fail-closed: no token resolved"); noTokenWarned = true; }
      return false;
    }
    return tokenEq(req.headers["x-prime-token"], TOKEN);
  };

  function post(pathname: string, body: any): Promise<number> {
    return new Promise((resolve) => {
      try {
        const req = http.request(
          { host: "127.0.0.1", port: INTERNAL_PORT, path: pathname, method: "POST",
            // wedged-collector guard (collector twin beaconFetch uses the same
            // 8s): without it every 15s beat piles another hung socket toward EMFILE
            signal: AbortSignal.timeout(8000),
            headers: { "content-type": "application/json", ...(TOKEN ? { "x-prime-token": TOKEN } : {}) } },
          (r) => { r.resume(); resolve(r.statusCode ?? 0); });
        req.on("error", () => resolve(0));
        req.end(JSON.stringify(body));
      } catch { resolve(0); }
    });
  }

  // @-reference candidate search (WEBUI-INPUT-SPEC.md): fd scoped to the
  // SESSION cwd, raw output lines back. fd absent -> fdMissing:true so the
  // client can say so; any error -> empty list. pi.exec is not part of the
  // ExtensionAPI surface in 0.9.5 — node:child_process spawn (already
  // imported) is the closest exec equivalent.
  function runFd(query: string): Promise<{ files: string[]; fdMissing?: boolean }> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = []; // Buffer.concat once (the /send pattern): per-chunk utf8 decode mojibakes split multibyte filenames
      let settled = false, killer: NodeJS.Timeout | undefined;
      const finish = (r: { files: string[]; fdMissing?: boolean }) => {
        if (settled) return;
        settled = true;
        if (killer) clearTimeout(killer);
        resolve(r);
      };
      try {
        const cwd = ctx?.sessionManager.getCwd?.() ?? process.cwd();
        const args = ["--base-directory", cwd, "--max-results", "100",
          "--type", "f", "--type", "d", "--follow", "--hidden",
          "--exclude", ".git", "--exclude", ".git/*", "--exclude", ".git/**"];
        if (query.includes("/")) args.push("--full-path"); // scoped form @src/comp narrows
        args.push(query);
        const child = spawn("fd", args, { stdio: ["ignore", "pipe", "ignore"] });
        child.stdout?.on("data", (d: any) => { chunks.push(d); });
        killer = setTimeout(() => { try { child.kill(); } catch {} }, 3000); // runaway --follow guard
        child.on("error", (e: any) => finish(e?.code === "ENOENT" ? { files: [], fdMissing: true } : { files: [] }));
        child.on("close", () => finish({ files: Buffer.concat(chunks).toString("utf-8").split("\n").filter((l) => l.length > 0) }));
      } catch { finish({ files: [] }); }
    });
  }

  async function spawnCollectorIfDown() {
    // at most one spawn attempt per 30s per process (many beacons share it)
    const G = globalThis as Record<string, any>;
    const now = Date.now();
    if (G.__primeWebuiSpawnAt && now - G.__primeWebuiSpawnAt < 30000) return;
    G.__primeWebuiSpawnAt = now;
    const alive = await post("/internal/register", {}); // probe: any response means alive
    if (alive === 400) return; // server up (bad body => alive)
    try {
      const errLog = fs.openSync(path.join(HERE, "server.log"), "a");
      const child = spawn("node", [path.join(HERE, "server.mjs")], {
        detached: true, stdio: ["ignore", "ignore", errLog],
        env: { ...process.env, PRIME_WEBUI_PORT: String(PUBLIC_PORT),
               PRIME_WEBUI_INTERNAL_PORT: String(INTERNAL_PORT) },
      });
      child.unref();
    } catch (e) { console.error("[webui-beacon] spawn failed:", e); }
  }

  // per-field safe accessor: a throwing getter anywhere in the register
  // payload build left beacons alive-but-unregistered FOREVER (observed in
  // production: 8 live child control servers, zero rows — the 15s heartbeat
  // only armed after a first 200). Every field degrades to undefined instead
  // of killing the registration.
  const safe = <T>(fn: () => T | undefined | null): T | undefined => {
    try { const v = fn(); return v === null || v === undefined ? undefined : v; } catch { return undefined; }
  };
  function armBeat() {
    if (!beat) beat = setInterval(() => register(true), 15000);
  }
  function registeredNow() {
    if (!registered) { registered = true; console.log("[webui-beacon] registered with collector"); }
    armBeat();
  }
  // the landed session-death teardown (reload-resilience deploy #11): timers,
  // queue, control port, registered flag. Shared by the session_shutdown
  // handler and POST /shutdown — idempotent, safe to run twice.
  const teardownBeacon = () => {
    registered = false;
    if (beat) clearInterval(beat); beat = undefined;
    if (retry) clearInterval(retry); retry = undefined;
    if (dropTimer) { clearTimeout(dropTimer); dropTimer = undefined; }
    queue.length = 0; // session-scoped: a phantom strip must not ride into the replacement's first snapshot
    if (control) { control.close(); control = null; }
  };
  async function register(heartbeat: boolean) {
    if (!ctx) return;
    const sm: any = safe(() => ctx!.sessionManager); // the property access itself can throw (same class the field getters got)
    const sessionId = safe(() => sm.getSessionId());
    if (!sessionId) { armBeat(); return; } // degraded getter: retry on the next beat, never dead-register
    const payload = {
      sessionId,
      name: safe(() => sm.getSessionName()),
      file: safe(() => sm.getSessionFile?.()),
      cwd: safe(() => sm.getCwd?.()),
      controlPort, pid: process.pid,
      // TUI-list fields (mirror `prime-agent list`): status, model, created
      status: safe(() => (ctx?.isIdle() ? "idle" : "working")) ?? "working",
      model: safe(() => (ctx as any)?.model?.id ?? (ctx as any)?.model?.modelId),
      created: safe(() => sm.getHeader?.()?.timestamp),
      // TUI-footer fields (TUI-META-SPEC.md §3, §7): mode/thinking, tier, live context
      thinkingLevel: safe(() => (pi as any).getThinkingLevel?.()),
      serviceTier: safe(() => (pi as any).getServiceTier?.() ?? (ctx as any)?.serviceTier),
      contextUsage: safe(() => (ctx as any).getContextUsage?.()),
    };
    const code = await post("/internal/register", payload);
    if (code === 200) { registeredNow(); return; }
    // ANY failed register (degraded payload, collector down, transient
    // error) still arms the 15s beat: registration retries forever — a
    // collector restart or a throwing first payload self-heals on the next
    // tick instead of dead-registering this beacon for its whole life
    armBeat();
    // beat + cold path both self-heal a dead collector (spawn guard: one
    // attempt per 30s per process; the probe POST no-ops when it is up) —
    // otherwise a collector that dies AFTER registration is never respawned
    await spawnCollectorIfDown();
    if (heartbeat) return; // beat path: the next beat IS the retry
    if (!retry) retry = setInterval(async () => {
      const c = await post("/internal/register", payload);
      if (c === 200) { if (retry) clearInterval(retry); retry = undefined; registeredNow(); }
    }, 5000);
  }

  function forward(event: string, data: unknown) {
    if (!registered || !ctx) return;
    const sessionId = safe(() => ctx!.sessionManager.getSessionId());
    if (!sessionId) return; // throwing getter mid-event: drop the frame, never kill the agent
    post("/internal/event", { sessionId, event, data });
  }

  pi.on("session_start", async (_event, c) => {
    ctx = c;
    control = http.createServer(async (req, res) => {
      const serve = (code: number, type: string, body: string) => { res.writeHead(code, { "content-type": type }); res.end(body); };
      let url: URL;
      // malformed request-target (raw socket): 400, never an agent process death
      try { url = new URL(req.url ?? "/", `http://${req.headers.host}`); } catch { return serve(400, "text/plain", "bad request"); }
      if (url.pathname === "/healthz") return serve(200, "text/plain", "ok");
      if (!authed(req)) return serve(401, "text/plain", "unauthorized");
      if (req.method === "GET" && url.pathname === "/snapshot") {
        const sm = ctx!.sessionManager;
        const items: Item[] = [];
        for (const e of sm.getEntries()) {
          if (e.type === "message" && (e as any).message) items.push(...mapMessage((e as any).message, `${e.id}`));
          // G1 (34-entry-census.md §2): custom_message entries compile like
          // messages — the live path already forwards them (message_end, role
          // custom); without this branch they VANISHED on every snapshot
          // refresh. HARNESS-DIGEST PERSISTENCE (operator 2026-09-22,
          // overrides the old TUI-parity skip): harness_digest ALSO compiles
          // — real entries carry display:false, so display must not hide
          // THEM (other display:false kinds stay hidden); snapshot+disk+live
          // AGREE (no vanish-on-work). Accent/detail-mode = dashboard rider.
          // compaction stays disk-only v1.
          else if (e.type === "custom_message" && (e.customType === "harness_digest" || e.display !== false))
            items.push({ kind: "custom", id: `${e.id}`, ts: e.timestamp ? Date.parse(e.timestamp) : undefined,
              label: e.customType ?? "custom",
              text: typeof e.content === "string" ? e.content : textOf(e.content).slice(0, 8000) });
        }
        return serve(200, "application/json", JSON.stringify({
          session: { name: sm.getSessionName() ?? undefined, cwd: sm.getCwd?.() ?? undefined, file: sm.getSessionFile?.() ?? undefined },
          items: items.slice(-400), busy: !ctx!.isIdle(), busySince: turnStart,
          queue: [...queue], // pending steers — a mid-queue refresh renders the strip truthfully
        }));
      }
      if (req.method === "GET" && url.pathname === "/commands") {
        // live palette surface: extension + prompt-template + skill commands
        // with sourceInfo (TUI-local + built-in session commands stay
        // client-side; getCommands may be async — normalize both)
        let commands: any[] = [];
        try { commands = await Promise.resolve((pi as any).getCommands?.() ?? []); } catch {}
        if (!Array.isArray(commands)) commands = [];
        return serve(200, "application/json", JSON.stringify({ commands }));
      }
      if (req.method === "GET" && url.pathname === "/files") {
        // @-reference picker feed; query may be empty ("@" alone = browse)
        return serve(200, "application/json", JSON.stringify(await runFd(url.searchParams.get("q") ?? "")));
      }
      if (req.method === "POST" && url.pathname === "/send") {
        const chunks: Buffer[] = [];
        for await (const ch of req) chunks.push(ch as Buffer);
        let text = "";
        try { text = (JSON.parse(Buffer.concat(chunks).toString()) ?? {}).text ?? ""; }
        catch { return serve(400, "text/plain", "bad json"); }
        if (!text.trim()) return serve(400, "text/plain", "empty");
        try {
          if (ctx!.isIdle()) {
            // anchor the timer at send time: isIdle flips before agent_start
            // fires, and snapshots in that window must still carry a start
            turnStart = Date.now();
            try { pi.sendUserMessage(text); }
            catch { // idle raced a new turn: queue in the runtime AND show it on the strip
              pi.sendUserMessage(text, { deliverAs: "steer" });
              queue.push(text);
              forward("queue", { items: [...queue] });
            }
          } else {
            pi.sendUserMessage(text, { deliverAs: "steer" });
            // TUI-style queue feedback: show it as pending until delivered
            queue.push(text);
            forward("queue", { items: [...queue] });
          }
          return serve(200, "text/plain", "sent");
        } catch (e: any) { return serve(500, "text/plain", String(e?.message ?? e)); }
      }
      if (req.method === "POST" && url.pathname === "/abort") {
        try { ctx?.abort(); } catch {}
        return serve(200, "text/plain", "aborted");
      }
      // ---------- settings-parity slice (27-settings-parity.md S1) ----------
      // The TUI's /model, /effort, /name, /compact, /usage, /quit surface on
      // the beacon: additive, token-guarded by the authed() check above, every
      // pi/ctx call safe()-wrapped — a degraded getter answers nulls, never
      // kills the agent. The only outbound call (the /shutdown unregister)
      // rides post() (8s wedged-collector guard).
      if (req.method === "GET" && url.pathname === "/models") {
        // MUST-1: registry refresh + getAvailable() (auth-filtered — the TUI
        // picker's list) with per-model thinking levels, plus the current
        // model + thinking-level echo (the picker's current marker)
        const reg: any = safe(() => (ctx as any)?.modelRegistry);
        let models: any[] = [];
        if (reg) {
          try {
            // refresh is the data path; a wedged entitlement chain must not
            // hang the port — race it, degrade to the sync list
            models = await Promise.race([
              Promise.resolve(reg.refreshAvailableModels?.()),
              new Promise((r) => setTimeout(() => r(undefined), 5000)),
            ]) ?? reg.getAvailable?.() ?? [];
          } catch { models = safe(() => reg.getAvailable?.()) ?? []; }
        }
        if (!Array.isArray(models)) models = [];
        const cur: any = safe(() => (ctx as any)?.model);
        return serve(200, "application/json", JSON.stringify({
          models: models.map((m: any) => ({ ...m, thinkingLevels: thinkingLevelsOf(m) })),
          current: cur ? { id: cur.id, provider: cur.provider } : undefined,
          thinkingLevel: safe(() => (pi as any).getThinkingLevel?.()),
        }));
      }
      if (req.method === "GET" && url.pathname === "/context-usage") {
        // MUST-6: the /usage parity object (tokens/contextWindow/percent —
        // the same object the register payload carries; nulls before the
        // first metered turn or when the model has no context window)
        const u: any = safe(() => (ctx as any)?.getContextUsage?.());
        return serve(200, "application/json", JSON.stringify({
          tokens: u?.tokens ?? null, contextWindow: u?.contextWindow ?? null, percent: u?.percent ?? null,
        }));
      }
      if (req.method === "POST" && url.pathname === "/set-model") {
        // MUST-1: {id, provider?} -> find -> pi.setModel (bindCore contract:
        // false = no configured auth). The session appends the model_change
        // entry and re-clamps thinking for the new model; the register beat
        // carries both to the row.
        const body = await readJsonBody(req);
        if (typeof body?.id !== "string" || !body.id) return serve(400, "text/plain", "missing id");
        const reg: any = safe(() => (ctx as any)?.modelRegistry);
        if (!reg) return serve(503, "text/plain", "no registry");
        const model: any = typeof body.provider === "string"
          ? safe(() => reg.find(body.provider, body.id))
          : (safe(() => reg.getAvailable?.()) ?? []).find((m: any) => m?.id === body.id);
        if (!model) return serve(404, "text/plain", `model not found: ${body.provider ?? "*"}/${body.id}`);
        try {
          const ok = await (pi as any).setModel(model);
          if (!ok) return serve(403, "text/plain", `no configured auth: ${model.provider}/${model.id}`);
          return serve(200, "application/json", JSON.stringify({
            ok: true, model: { id: model.id, provider: model.provider },
            thinkingLevel: safe(() => (pi as any).getThinkingLevel?.()),
          }));
        } catch (e: any) { return serve(500, "text/plain", String(e?.message ?? e)); }
      }
      if (req.method === "POST" && url.pathname === "/set-thinking-level") {
        // MUST-2: model-clamped — reject levels the CURRENT model does not
        // support (its registry entry's thinkingLevelMap), instead of the
        // TUI's silent auto-clamp
        const body = await readJsonBody(req);
        const level = typeof body?.level === "string" ? body.level : "";
        if (!Q4_LEVELS.includes(level)) return serve(400, "text/plain", "bad level");
        const available = thinkingLevelsOf(safe(() => (ctx as any)?.model));
        if (!available.includes(level))
          return serve(400, "application/json", JSON.stringify({ error: "unsupported level", level, available }));
        try { (pi as any).setThinkingLevel(level); }
        catch (e: any) { return serve(500, "text/plain", String(e?.message ?? e)); }
        return serve(200, "application/json", JSON.stringify({ ok: true, thinkingLevel: level }));
      }
      if (req.method === "POST" && url.pathname === "/rename") {
        // MUST-3: pi.setSessionName -> session_info entry in the session file
        // (disk rows pick it up via enrich; the register beat updates the
        // live row)
        const body = await readJsonBody(req);
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        if (!name) return serve(400, "text/plain", "missing name");
        try { await (pi as any).setSessionName(name); }
        catch (e: any) { return serve(500, "text/plain", String(e?.message ?? e)); }
        return serve(200, "application/json", JSON.stringify({ ok: true, name }));
      }
      if (req.method === "POST" && url.pathname === "/compact") {
        // MUST-5: idle-only (the palette's session-command convention).
        // ctx.compact is fire-and-forget (the binary wraps it in an async
        // IIFE); completion lands as the session's compaction entry, visible
        // in /snapshot through the message pipeline.
        const body = await readJsonBody(req);
        const idle = safe(() => (ctx as any)?.isIdle?.());
        if (idle !== true) return serve(409, "application/json", JSON.stringify({ error: "busy" }));
        try { (ctx as any)?.compact?.({
          customInstructions: typeof body?.instructions === "string" && body.instructions ? body.instructions : undefined,
          onError: (e: any) => console.error("[webui-beacon] compact failed:", e?.message ?? e),
        }); }
        catch (e: any) { return serve(500, "text/plain", String(e?.message ?? e)); }
        return serve(200, "application/json", JSON.stringify({ ok: true, started: true }));
      }
      if (req.method === "POST" && url.pathname === "/shutdown") {
        // MUST-4: ctx.shutdown() is the graceful universal stop. TUI runtimes
        // quit on it; headless ones only FLAG shutdown for the next command
        // boundary — so the beacon lands the same teardown session_shutdown
        // does (unregister via post(), timers, control port) right here.
        const sessionId = safe(() => ctx!.sessionManager.getSessionId());
        safe(() => (ctx as any)?.shutdown?.());
        serve(200, "application/json", JSON.stringify({ ok: true, shuttingDown: true }));
        if (sessionId) await post("/internal/unregister", { sessionId });
        teardownBeacon();
        ctx = null;
        return;
      }
      return serve(404, "text/plain", "not found");
    });
    control.listen(0, "127.0.0.1", () => {
      controlPort = (control!.address() as any).port;
      register(false);
    });
  });

  // cmd-parity v1 (7v/7av): the input event is the runtime's own
  // normalization point — it fires on our sendUserMessage submissions
  // (source "extension") BEFORE the flag-disabled expansion, so the known
  // command-shaped text gets annotated there (annotateCommandText above).
  // The source gate is LOAD-BEARING: "interactive" (TUI) and "rpc"
  // submissions expand + dispatch NATIVELY (their pipelines run
  // expandSkills:true / extensionCommands:"execute"); a transform on those
  // would strip the /skill: form the runtime is about to expand and BREAK
  // the TUI. Agent-injected prompts (heartbeats, agent messages) skip
  // input handlers entirely (skipInputHandlers) — untouched by design.
  pi.on("input", async (event) => {
    if (event?.source !== "extension") return { action: "continue" };
    let names = new Set<string>();
    try {
      const commands = await Promise.resolve((pi as any).getCommands?.() ?? []);
      if (Array.isArray(commands))
        for (const c of commands) if (typeof c?.name === "string") names.add(c.name);
    } catch {}
    const annotated = annotateCommandText(String(event?.text ?? ""), names);
    return annotated ? { action: "transform", text: annotated } : { action: "continue" };
  });

  const throttle: Record<string, number> = {};
  pi.on("message_start", async (event) => {
    const m: any = event.message;
    if (m?.role === "user") lastPromptChars = textOf(m.content).length;
    if (m?.role === "user" && queue.length) {
      queue.shift(); // the oldest queued message is being delivered
      if (dropTimer) { clearTimeout(dropTimer); dropTimer = undefined; } // a turn resumed: not a drop
      forward("queue", { items: [...queue] });
    }
    if (m?.role === "assistant") {
      const item = mapMessage({ ...m, content: [] }, "live")[0];
      forward("item", { ...item, kind: "assistant", text: "", toolCalls: [], placeholder: true });
    }
  });
  pi.on("message_update", async (event) => {
    const m: any = event.message;
    if (m?.role !== "assistant") return;
    const txt = textOf(m.content);
    // 7aj: the live delta carries the thinking TEXT (cumulative — the same
    // joined shape as the snapshot's thinking field) so the client can render
    // the stream live; turnThinkingChars stays the exact block-length sum.
    const thinkingBlocks: any[] = Array.isArray(m.content)
      ? m.content.filter((b: any) => b?.type === "thinking") : [];
    // 7ap throttle verdict (45-stream-granularity.md): the 60ms gate has NO
    // burst-count sibling — it only capped the wire rate. Text/thinking-bearing
    // updates now BYPASS it: the scout captured a text update eaten 14ms behind
    // a thinking forward (payloads are cumulative, so no text was ever lost —
    // but the stream stuttered at ~16 frames/s instead of provider
    // granularity, median 10-char deltas). The gate survives for content-LESS
    // updates only: toolcall-delta bursts repaint an empty body and are worth
    // capping, not streaming.
    const now = Date.now();
    if (!txt && !thinkingBlocks.length && throttle.live && now - throttle.live < 60) return;
    throttle.live = now;
    turnTextChars = txt.length;
    turnThinkingChars = thinkingBlocks.reduce((n: number, b: any) => n + (b.thinking?.length ?? 0), 0);
    forward("live", { text: txt, turnTextChars, turnThinkingChars, thinking: thinkingBlocks.map((b: any) => b.thinking).join("\n") || undefined });
  });
  pi.on("message_end", async (event) => {
    const m: any = event.message;
    const key = m?.role === "assistant" ? "live" : `m-${m?.timestamp}`;
    for (const item of mapMessage(m, key)) forward("item", item);
    if (m?.role === "assistant") delete throttle.live;
  });
  // 7ap live tool partials: the harness streams tool output per chunk
  // (tool_execution_update.partialResult.content carries the LATEST text chunk
  // — verified in the runtime log; ipython is the only emitter in practice).
  // We accumulate per call and forward the CUMULATIVE partial as the existing
  // "tool" event with partial:true (additive fields): the client renders it
  // live in the running card and tool_execution_end's final replaces it.
  // A 40ms per-call gate bounds a chatty tool to ~25 partial frames/s —
  // skipped frames lose nothing (the next frame carries everything).
  const partialText: Record<string, string> = {};
  pi.on("tool_execution_start", async (event) => {
    delete partialText[event.toolCallId];
    forward("tool", { id: event.toolCallId, toolName: event.toolName, status: "running",
      args: JSON.stringify((event as any).args ?? {}).slice(0, 2000) });
  });
  pi.on("tool_execution_update", async (event) => {
    const pr = event.partialResult;
    const chunk = Array.isArray(pr?.content)
      ? pr.content.filter((b) => b?.type === "text").map((b) => b.text).join("") : "";
    partialText[event.toolCallId] = (partialText[event.toolCallId] || "") + chunk;
    const now = Date.now();
    if (throttle[event.toolCallId] && now - throttle[event.toolCallId] < 40) return;
    throttle[event.toolCallId] = now;
    if (!partialText[event.toolCallId]) return;
    forward("tool", { id: event.toolCallId, toolName: event.toolName, status: "running",
      partial: true, text: String(partialText[event.toolCallId]).slice(0, 8000) });
  });
  pi.on("tool_execution_end", async (event) => {
    delete partialText[event.toolCallId];
    delete throttle[event.toolCallId]; // per-call gate state dies with the call — the map never bloats across a long session
    const result: any = (event as any).result;
    const text = Array.isArray(result?.content)
      ? result.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n") : "";
    forward("tool", { id: event.toolCallId, toolName: event.toolName,
      status: (event as any).isError ? "error" : "done", text: String(text).slice(0, 8000) });
  });
  pi.on("agent_start", async () => {
    turnTextChars = 0; turnThinkingChars = 0;
    turnStart = Date.now();
    forward("busy", { busy: true, promptChars: lastPromptChars, startedAt: turnStart });
  });
  pi.on("agent_end", async () => {
    turnStart = null; forward("busy", { busy: false });
    // pending steers at turn end: healthy one-at-a-time delivery starts the
    // next turn within ~0.1ms (message_start cancels this timer via the
    // shift); still queued after 1.5s idle means the runtime dropped them
    // (abort) — say so, clear the phantom strip
    if (queue.length) {
      if (dropTimer) clearTimeout(dropTimer);
      dropTimer = setTimeout(() => {
        dropTimer = undefined;
        if (ctx?.isIdle() && queue.length) {
          const dropped = [...queue];
          queue.length = 0;
          forward("queue", { items: [], dropped });
        }
      }, 1500);
    }
  });
  pi.on("session_shutdown", async (event) => {
    // /reload emits session_shutdown FIRST, then rebuilds the runtime and
    // re-registers the same sessionId on a NEW control port ~0.1-5.5s later.
    // Unregistering here made the collector DELETE the row and end every SSE
    // subscriber mid-blink; the browser's single EventSource auto-reconnect
    // then ate a 404 inside the blink and died PERMANENTLY (WHATWG: non-200 =
    // no retry) — the dashboard feed froze until a manual refresh. Keep the
    // row through the blink (the new instance's register overwrites
    // controlPort via the collector's preserve-merge); every other reason
    // ("quit", session replacement) is real session death — unregister so
    // stale rows prune.
    if (ctx && (event as any)?.reason !== "reload") {
      const sessionId = safe(() => ctx!.sessionManager.getSessionId());
      // best-effort: a throwing getter or a wedged collector must never skip the teardown below
      if (sessionId) await post("/internal/unregister", { sessionId });
    }
    teardownBeacon();
    ctx = null;
  });

  // G9a: live compaction feedback — the harness emits compaction_start/end
  // (agent-session.d.ts); forward the phase so the webui can show "compacting…"
  // instead of a silent hang. The disk notice still lands post-hoc (G2).
  pi.on("compaction_start", async () => {
    await safe(async () => post("/internal/event", { sessionId: safe(() => ctx!.sessionManager.getSessionId()), event: "comp", data: { phase: "start" } }));
  });
  pi.on("compaction_end", async (_event) => {
    const d: Record<string, unknown> = { phase: "end" };
    safe(() => { if ((_event as any)?.tokensBefore != null) d.tokensBefore = (_event as any).tokensBefore; });
    await safe(async () => post("/internal/event", { sessionId: safe(() => ctx!.sessionManager.getSessionId()), event: "comp", data: d }));
  });
}
