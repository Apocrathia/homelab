/**
 * prime-webui collector server — standalone process, owns the public port.
 * Spawned/adopted by agent beacons; survives agents. Run: node server.mjs
 * (plain ESM — portable to any node runtime, incl. the cluster box).
 *
 * Public (config host/port): dashboard, conversation index, SSE per live
 * session, send/abort proxied to that agent's beacon.
 * Internal (127.0.0.1, internalPort = port+1 unless overridden): beacon
 * register/heartbeat/event/unregister. Loopback only; token-guarded.
 *
 * Design: dark minimal terminal — #111 canvas, greys, hairlines, one lime
 * accent for the live role, system mono, square corners, no shadows.
 */
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import * as crypto from "node:crypto";
import * as os from "node:os";

const HERE = path.dirname(fileURLToPath(import.meta.url));

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf-8")); } catch {}
const HOST = process.env.PRIME_WEBUI_HOST ?? cfg.host ?? "127.0.0.1";
const PORT = parseInt(process.env.PRIME_WEBUI_PORT ?? String(cfg.port ?? 8788), 10);
const IPORT = parseInt(process.env.PRIME_WEBUI_INTERNAL_PORT ?? String(PORT + 1), 10);
// token resolution (identical chain to the beacon index.ts — keep both in
// sync): env -> token file -> config.json -> generate + persist. The token
// file default lives in THIS dir so a k8s Secret mount (webui-token) or a
// hand-placed file works with zero config; fresh installs need no token in
// config.json. Auto-gen is last-writer-wins: two cold starts racing both
// generate and the loser holds a stale token until restart — env or file
// deployments never hit that. Never logged.
const TOKEN_FILE = process.env.PRIME_WEBUI_TOKEN_FILE ?? path.join(HERE, "webui-token");
function resolveToken() {
  if (process.env.PRIME_WEBUI_TOKEN) return { token: process.env.PRIME_WEBUI_TOKEN, source: "env" };
  try {
    const t = fs.readFileSync(TOKEN_FILE, "utf-8").trim();
    if (t) return { token: t, source: "file" };
  } catch {}
  if (cfg.token) return { token: String(cfg.token), source: "config" };
  const token = crypto.randomUUID();
  try {
    fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fs.writeFileSync(TOKEN_FILE, token + "\n", { mode: 0o600 });
    try { fs.chmodSync(TOKEN_FILE, 0o600); } catch {}
  } catch (e) { console.error("[prime-webui-server] token persist failed:", e?.message ?? e); }
  return { token, source: "generated" };
}
const { token: TOKEN, source: TOKEN_SOURCE } = resolveToken();
const SESSIONS_DIR = process.env.PRIME_WEBUI_SESSIONS_DIR
  ?? cfg.sessionsDir ?? path.join(process.env.HOME ?? "/tmp", ".prime", "agent", "sessions");
// rlm subagent artifacts root (parent uuid -> sub-<childId> dirs)
const ARTIFACTS_DIR = (process.env.PRIME_WEBUI_ARTIFACTS
  ?? cfg.artifactsDir ?? path.join(process.env.HOME ?? "/tmp", ".prime", "agent", "session-artifacts")).replace(/\/+$/, "");
// Loopback is always trusted (same machine = same trust domain; the token
// guards non-loopback clients). Config can extend with more CIDRs
// (e.g. the cluster pod range when this runs in the prime-agent box).
const TRUSTED_CIDRS = cfg.trustedCidrs ?? ["127.0.0.0/8"];
const PRUNE_SECS = parseInt(process.env.PRIME_WEBUI_PRUNE_SECS ?? "30", 10);

// ---------- registry ----------
const beacons = new Map();
const sseBySession = new Map();

function fanout(sessionId, event, data) {
  const subs = sseBySession.get(sessionId);
  if (!subs) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subs) { try { res.write(payload); } catch { subs.delete(res); } }
}

setInterval(() => {
  const now = Date.now();
  for (const [id, b] of beacons) if (now - b.lastBeat > PRUNE_SECS * 1000) beacons.delete(id);
}, Math.max(2, Math.floor(PRUNE_SECS / 3)) * 1000);

// ---------- session file parsing (disk conversations) ----------
const textOf = (c) =>
  typeof c === "string" ? c : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text).join("\n") : "";
// G1+G2 (34-entry-census.md §2): the disk compile — custom_message and
// compaction entries carry real conversational content AND chain membership
// (id/parentId verified on real files), but the type==="message" filter
// dropped them: agent messages rendered live then VANISHED on refresh
// (84 on disk, 0 in view for the real lap), and compactions cut the feed
// with zero feedback. custom_message -> the same "custom" item kind the
// live path forwards (message_end, role custom); display:false kinds and
// harness_digest stay hidden (TUI parity, dump @6002529). compaction -> the
// boundary notice ("Compacted — N tokens before" + the Goal-recap summary).
function mapEntry(e) {
  if (e.type === "message" && e.message) return mapMessage(e.message, `${e.id}`);
  if (e.type === "custom_message" && e.display !== false && e.customType !== "harness_digest")
    return [{ kind: "custom", id: `${e.id}`, ts: e.timestamp ? Date.parse(e.timestamp) : undefined,
      label: e.customType ?? "custom",
      text: typeof e.content === "string" ? e.content : textOf(e.content).slice(0, 8000) }];
  if (e.type === "compaction")
    return [{ kind: "notice", id: `${e.id}`, ts: e.timestamp ? Date.parse(e.timestamp) : undefined,
      boundary: true, // the G2 boundary marker: the context cut gets its dashed strip
      text: `Compacted — ${e.tokensBefore ?? "?"} tokens before` + (e.summary ? `\n\n${String(e.summary).slice(0, 800)}` : "") }];
  return [];
}
function mapMessage(msg, key) {
  if (!msg) return [];
  const ts = msg.timestamp; // 7(r): per-item time — every message kind carries it (epoch ms)
  switch (msg.role) {
    case "user": return [{ kind: "user", id: key, ts, text: textOf(msg.content) }];
    case "assistant": {
      const blocks = Array.isArray(msg.content) ? msg.content : [];
      return [{ kind: "assistant", id: key, ts,
        text: blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n"),
        thinking: blocks.filter((b) => b.type === "thinking").map((b) => b.thinking).join("\n") || undefined,
        model: msg.model,
        tokens: msg.usage?.totalTokens,
        cost: msg.usage?.cost?.total,
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
// bounded positional reads (ponytail R3, 2026-09-21): the >cap paths read
// ONLY the needed bytes — the old readFileSync-then-slice loaded the WHOLE
// file first (a 500MB transcript = a 500MB transient string per refresh;
// the comment named a ceiling the code didn't deliver). New true ceiling:
// transient memory caps at the chunk (128KB head / 24MB tail) + one open
// fd per read; a chunk cut mid-line or mid-multibyte just parse-fails that
// line (same as the old slice did). Upgrade path: a persistent sidecar index.
function readHead(p, n) {
  const fd = fs.openSync(p, "r");
  try {
    const buf = Buffer.alloc(n);
    const r = fs.readSync(fd, buf, 0, n, 0);
    return buf.subarray(0, r).toString("utf-8");
  } finally { fs.closeSync(fd); }
}
function readTail(p, size, n) {
  const fd = fs.openSync(p, "r");
  try {
    const start = Math.max(0, size - n);
    const buf = Buffer.alloc(size - start);
    const r = fs.readSync(fd, buf, 0, buf.length, start);
    return buf.subarray(0, r).toString("utf-8");
  } finally { fs.closeSync(fd); }
}
function parseSessionFile(p) {
  const MAX = 24 * 1024 * 1024;
  const stat = fs.statSync(p);
  const raw = stat.size > MAX ? "\n" + readTail(p, stat.size, MAX) : fs.readFileSync(p, "utf-8");
  const entries = [];
  for (const line of raw.split("\n")) { if (line.trim()) { try { entries.push(JSON.parse(line)); } catch {} } }
  const header = entries.find((e) => e?.type === "session");
  let name;
  const byId = new Map();
  let msgEntries = 0; // message entries in the file, any branch (fallback trigger)
  for (const e of entries) { if (e?.id) byId.set(e.id, e); if (e?.type === "message" && e.message) msgEntries++; if (e?.type === "session_info" && e.name) name = e.name; }
  let cur = [...entries].reverse().find((e) => e?.id);
  const chain = []; const seen = new Set();
  while (cur && !seen.has(cur.id)) { seen.add(cur.id); chain.push(cur); cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
  chain.reverse();
  const items = [];
  for (const e of chain) items.push(...mapEntry(e));
  // empty-views fallback (20-probe-edge.md §6): an activity-recap agent_status
  // can end the file with a parentId that is a STATE-NAME string, not an entry
  // id — the walk from the LAST entry dead-ends with zero message items while
  // the file holds real messages (13/276 real sessions rendered empty). Walk
  // tail candidates whose parentId resolves to a real entry id; keep the
  // deepest viable chain.
  if (!items.length && msgEntries) {
    let best = null;
    for (const cand of [...entries].reverse()) {
      if (!cand?.id || !cand.parentId || !byId.has(cand.parentId)) continue;
      const ch = []; const s = new Set();
      let c = cand;
      while (c && !s.has(c.id)) { s.add(c.id); ch.push(c); c = c.parentId ? byId.get(c.parentId) : undefined; }
      if (!best || ch.length > best.length) best = ch;
      if (best.length >= entries.length) break; // full-depth chain: nothing deeper exists
    }
    if (best) { best.reverse(); for (const e of best) items.push(...mapEntry(e)); }
  }
  return { name, cwd: header?.cwd, date: header?.timestamp, items: items.slice(-400), truncated: items.length > 400 };
}
// ---------- session metadata cache (TUI-style list info) ----------
// name, first user message, date, cwd, message count per session file.
// Full-read enrich once per file, invalidated by mtime+size. ponytail:
// files > 32MB get head-read only (count omitted) — the transient is capped
// at the 128KB head chunk (readHead), not whole-file memory; upgrade path
// is a persistent sidecar index.
const metaCache = new Map();
// model registry (TUI-META-SPEC.md §2): id -> contextWindow; env-overridable for tests
let modelWindowCache = null;
function contextWindowFor(modelId) {
  if (!modelId) return undefined;
  if (modelWindowCache === null) {
    modelWindowCache = {};
    try {
      const p = process.env.PRIME_WEBUI_MODELS
        ?? path.join(process.env.HOME ?? "/tmp", ".prime", "agent", "cache", "litellm-models.json");
      const j = JSON.parse(fs.readFileSync(p, "utf-8"));
      for (const m of j.models ?? []) if (m?.id && m.contextWindow) modelWindowCache[m.id] = m.contextWindow;
    } catch {}
  }
  return modelWindowCache[modelId];
}
// per-message char size for the context estimate (§2: anchor + ceil(chars/4) of subsequent messages)
function entryChars(e) {
  const m = e?.message; if (!m) return 0;
  let n = 0;
  const c = m.content;
  if (typeof c === "string") n += c.length;
  else if (Array.isArray(c)) for (const b of c) {
    if (b?.type === "text") n += (b.text ?? "").length;
    else if (b?.type === "thinking") n += (b.thinking ?? "").length;
    else if (b?.type === "toolCall") n += (b.name ?? "").length + JSON.stringify(b.arguments ?? {}).length;
  }
  return n;
}
function enrich(p, st) {
  const MAX_FULL = 32 * 1024 * 1024;
  const full = st.size <= MAX_FULL;
  const raw = full ? fs.readFileSync(p, "utf-8") : readHead(p, 128 * 1024);
  let name, firstMessage, cwd, date, model, thinkingLevel, serviceTier, ctxAnchor, ctxTail = 0, count = 0, totalTokens = 0, totalCost = 0;
  const byId = new Map(), statusById = new Map(); let lastId = null; // active-chain reconstruction
  for (const line of raw.split("\n")) {
    if (!line.startsWith('{"type":"')) continue;
    let e = null;
    try { e = JSON.parse(line); } catch { continue; } // full parse: custom_message/custom serialize content/details BEFORE the entry id, so position-assuming id regexes keyed phantoms
    const eid = typeof e?.id === "string" ? e.id : null; // entry-level id only — never nested data.id / details.edits[].id
    if (eid) { // entries without an entry-level id (some custom) cannot join the chain; lastId stays on the last entry that has one
      lastId = eid;
      byId.set(eid, e.parentId ?? null);
      if (e.type === "agent_status" && e.status) statusById.set(eid, e.status); // activity-recap entries (TUI Activity column)
    }
    if (e.type === "message") {
      count++;
      const m = e?.message;
      // context estimate (TUI-META-SPEC.md §2, line-scan approx of the active chain)
      if (m?.role === "assistant" && m.usage?.totalTokens) { ctxAnchor = m.usage.totalTokens; ctxTail = 0; }
      else if (ctxAnchor !== undefined) ctxTail += Math.ceil(entryChars(e) / 4);
      if (firstMessage === undefined) {
        if (m?.role === "user") firstMessage = textOf(m.content).slice(0, 120);
        // else keep looking for the first user message
      } else if (m?.role === "assistant" && m.usage) {
        totalTokens += m.usage.totalTokens ?? 0;
        totalCost += m.usage?.cost?.total ?? 0;
      }
      continue;
    }
    if (e.type === "compaction") { ctxAnchor = undefined; ctxTail = 0; continue; }
    if (e.type === "thinking_level_change") { if (e?.thinkingLevel) thinkingLevel = e.thinkingLevel; continue; } // latest wins
    if (e.type === "service_tier_change") { if (e?.serviceTier) serviceTier = e.serviceTier; continue; } // latest wins
    if (e.type === "session") { cwd = e.cwd; date = e.timestamp; continue; }
    if (e.type === "model_change") { if (e?.modelId) model = e.modelId; continue; } // latest wins
    if (e.type === "session_info") { if (e?.name) name = e.name; continue; } // latest wins
  }
  let activity, taskState; // latest agent_status on the ACTIVE chain (walk parentId from the last entry)
  if (full) { // over-cap reads hold only the head: no chain anchor, skip activity like totals
    const seen = new Set(); let cur = lastId;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const status = statusById.get(cur);
      if (status) { activity = status.summary; taskState = status.taskState; break; }
      cur = byId.get(cur);
    }
  }
  const contextWindow = contextWindowFor(model);
  const contextTokens = ctxAnchor === undefined ? null : ctxAnchor + ctxTail;
  const m = { name, firstMessage: firstMessage || "", cwd, date, model, thinkingLevel, serviceTier,
    activity, taskState,
    count: full ? count : undefined,
    totalTokens: full ? totalTokens : undefined, totalCost: full ? totalCost : undefined,
    contextWindow, contextTokens,
    contextPercent: contextWindow && contextTokens !== null ? Math.round((contextTokens / contextWindow) * 100) : null,
    mtimeMs: st.mtimeMs, size: st.size };
  return m;
}
function metaFor(id, p, st) {
  const c = metaCache.get(id);
  if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return c;
  const m = enrich(p, st);
  metaCache.set(id, m);
  return m;
}

const poisonLogged = new Set(); // unreadable session files already console.error'd once
function diskSessions() {
  const out = [];
  try {
    for (const f of fs.readdirSync(SESSIONS_DIR)) {
      if (!f.endsWith(".jsonl")) continue;
      const p = path.join(SESSIONS_DIR, f);
      let st;
      try { st = fs.statSync(p); } catch { continue; } // deleted between readdir and stat: skip the row, never kill the listing
      out.push({ id: f.replace(/\.jsonl$/, ""), path: p, modified: st.mtimeMs });
    }
  } catch {}
  return out.sort((a, b) => b.modified - a.modified);
}

// ---------- rlm subagent hierarchy (recursive session-artifacts scan) ----------
// children of session P: <artifacts-root>/<P>/sub-<childId>/ holding
// rlm-subagent.json + <child-session-uuid>.jsonl (a regular session file).
// Depth-2+ children nest the same way INSIDE their parent's own sub dir
// (<root-uuid>/sub-<id1>/sub-<id2>/... — live-verified 2026-09-20 via the
// 5-layer test chain), and the child kernel-artifacts dirs
// (<dir>/session-artifacts/<child-uuid>/) are walked too, so every nesting
// shape is covered at any depth. Symlinked dirs are skipped at the dirent
// level (never followed — no loops) plus a depth cap as the second guard.
// ponytail: the walk result is CACHED behind a dir-mtime signature
// (47-performance-bench.md P0#1): the recursive walk cost ~52ms at 500
// artifact roots and ran on EVERY /api/sessions AND every session view.
// The sig is one statSync per directory the walk read, checked per
// request; every walked dir is in the sig (not just the root), so deep
// changes ARE caught — mtime bubbles one level, the sig covers every
// level. rlm-subagent.json parsing rides the subCache below (mtimeMs+size
// keyed, the metaFor precedent). Ceiling: the sig pass is ~1 stat per dir
// per request (measured ~10ms at 500 roots / ~1400 dirs on the bench Mac
// vs the ~57ms walk it replaces; still linear in dir count — on network
// storage the persistent index sidecar is the real fix) and FILE mtimes
// are not sigged, so content-only changes (child jsonl append, rlm json
// status flip) keep the cached rows until the next structural change; live
// rows re-stamp from the beacon registry every call, so the staleness is
// dead-row display fields only. fs.watch rejected: unreliable on k8s NFS.
const subCache = new Map(); // rlm-subagent.json path -> { mtimeMs, size, info }
const childIndex = new Map(); // child session uuid -> child row (flat)
const MAX_SCAN_DEPTH = 16; // second loop guard; real chains are <= 5 layers
// walk cache: { sig: Map(dirPath -> [mtimeMs, size] | "absent"), byParent: Map }
let walkCache = null;
let walkSig = null; // sig collector armed while a walk runs
function sigRecord(p, st) { if (walkSig) walkSig.set(p, st ? [st.mtimeMs, st.size] : "absent"); }
function walkSigValid(cache) {
  for (const [p, want] of cache.sig) {
    let st;
    try { st = fs.statSync(p); } catch { if (want !== "absent") return false; continue; } // vanished dir = rebuild
    if (want === "absent" || st.mtimeMs !== want[0] || st.size !== want[1]) return false;
  }
  return true;
}
function subDirsOf(pdir) {
  try {
    sigRecord(pdir, fs.statSync(pdir)); // stat BEFORE readdir: a change landing between the two still mismatches the NEXT check (never one stale cycle)
    return fs.readdirSync(pdir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith("sub-")).map((e) => e.name);
  } catch { return []; } // absent dirs record nothing: their (re)appearance moves the parent dir's mtime, which IS in the sig
}
function subInfo(p) {
  let st;
  try { st = fs.statSync(p); } catch { return {}; }
  const c = subCache.get(p);
  if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return c.info;
  let info = {};
  try { Object.assign(info, JSON.parse(fs.readFileSync(p, "utf-8"))); } catch {}
  subCache.set(p, { mtimeMs: st.mtimeMs, size: st.size, info });
  return info;
}
function mergeByParent(byParent, owner, arr) { // dedupe by row identity; keeps newest first
  if (!arr?.length) return;
  const cur = byParent.get(owner);
  if (!cur) { byParent.set(owner, arr.slice().sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0))); return; }
  if (cur === arr) return;
  const seen = new Set(cur);
  const merged = cur.concat(arr.filter((r) => !seen.has(r)));
  merged.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
  byParent.set(owner, merged);
}
function scanSubs(parent, pdir, byParent, depth = 0) {
  if (depth > MAX_SCAN_DEPTH) return;
  const children = [];
  for (const s of subDirsOf(pdir)) {
    const dirPath = path.join(pdir, s);
    const info = subInfo(path.join(dirPath, "rlm-subagent.json"));
    let file;
    try { sigRecord(dirPath, fs.statSync(dirPath)); } catch {} // sig the dir the .jsonl entry-list read comes from
    try { file = fs.readdirSync(dirPath).find((f) => f.endsWith(".jsonl") && f !== "semantic-edges.jsonl"); } catch {}
    const sfId = typeof info.sessionFile === "string" && info.sessionFile.endsWith(".jsonl")
      ? path.basename(info.sessionFile).replace(/\.jsonl$/, "") : undefined; // file's own uuid cross-check
    const row = {
      childId: info.childId ?? s,
      id: file ? file.replace(/\.jsonl$/, "") : sfId,
      name: info.sessionName ?? s,
      status: info.status,
      model: typeof info.model === "object" ? info.model?.modelId : info.model,
      file: file ? path.join(dirPath, file)
        : (typeof info.sessionFile === "string" && info.sessionFile.endsWith(".jsonl") ? info.sessionFile : undefined),
      modified: undefined, createdAt: info.createdAt,
      parent: (typeof info.parent === "string" && info.parent) || parent, // file's own field wins; directory-derived is the fallback
    };
    if (row.file) { try { row.modified = fs.statSync(row.file).mtimeMs; } catch {} }
    children.push(row);
    if (row.id) scanSubs(row.id, dirPath, byParent, depth + 1); // grandchildren INSIDE this sub dir (live-verified shape)
  }
  const sa = path.join(pdir, "session-artifacts"); // child kernel artifacts: <dir>/session-artifacts/<child-uuid>/
  let saUuids = [];
  try { sigRecord(sa, fs.statSync(sa)); saUuids = fs.readdirSync(sa, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch {}
  for (const u of saUuids) scanSubs(u, path.join(sa, u), byParent, depth + 1); // children spawned under kernel-artifact dirs
  if (children.length) {
    children.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
    mergeByParent(byParent, parent, children);
  }
}
function walkFresh() {
  // 47-bench P0#1: serve the cached walk while the dir-mtime sig holds; the
  // walk itself (recursive readdir/stat, the dominant /api/sessions + view
  // cost) only runs on invalidation. First call always walks (walkCache null).
  if (walkCache && walkSigValid(walkCache)) return walkCache;
  const byParent = new Map();
  const sig = new Map();
  walkSig = sig;
  try { sigRecord(ARTIFACTS_DIR, fs.statSync(ARTIFACTS_DIR)); } catch { sig.set(ARTIFACTS_DIR, "absent"); } // root absent = its own sig entry: appearance invalidates
  try {
    for (const e of fs.readdirSync(ARTIFACTS_DIR, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      scanSubs(e.name, path.join(ARTIFACTS_DIR, e.name), byParent);
    }
  } catch {}
  walkSig = null;
  walkCache = { sig, byParent };
  return walkCache;
}
function hierarchy() {
  // parentUuid -> children rows; rows nest their own children recursively.
  const walk = walkFresh(); // cached FILE-system-derived rows; beacon stamps + attach rebuild fresh per call below
  const byParent = new Map();
  for (const [k, rows] of walk.byParent) byParent.set(k, rows.map((r) => ({ ...r }))); // fresh clones: attach + beacon/route stamps mutate rows per call — the cache never sees them
  childIndex.clear();
  // id-cycle guard (20-probe-edge.md §2.8/2.9): a child jsonl named as an
  // ancestor uuid made attach() recurse into itself forever (RangeError ->
  // 500 on /api/sessions AND every /api/session view — the view path refreshes
  // hierarchy() per request). path = the current walk's ancestors; cycle edges
  // are dropped, so the loop-breaking row renders without the self/ancestor
  // edge and never hangs. path.delete backtracks so shared subtrees (duplicate
  // childIds) keep their children on every occurrence.
  const attach = (rows, path) => { for (const r of rows) {
    if (path.has(r)) continue;
    path.add(r);
    r.children = (byParent.get(r.id) ?? []).filter((c) => !path.has(c));
    r.live = false;
    if (r.id) childIndex.set(r.id, r);
    attach(r.children, path);
    path.delete(r);
  } };
  for (const rows of byParent.values()) attach(rows, new Set());
  // registry wins (33-subs-contradiction.md, 7w): stamp liveness + status on
  // artifact rows INSIDE hierarchy(), after childIndex is built, so every
  // consumer (list AND session-view subs) counts post-attach rows. The list
  // keeps its richer per-row overrides (model/name/modified) and the synth
  // race fallback on top of this base stamp.
  for (const [id, b] of beacons) {
    const row = childIndex.get(id);
    if (row) { row.live = true; if (b.status) row.status = b.status; }
  }
  return byParent;
}
// subagent bar counts (TUI-META-SPEC.md §4): live+working=running, live+idle=idle, else inactive
function countSubs(children) {
  const subs = { running: 0, idle: 0, inactive: 0, total: 0 };
  const walk = (rows) => { for (const c of rows ?? []) {
    subs.total++;
    if (c.live && c.status === "working") subs.running++;
    else if (c.live) subs.idle++;
    else subs.inactive++;
    walk(c.children);
  } };
  walk(children);
  return subs;
}
// 47-bench P0#3 payload diet: children[].file is 22% of every /api/sessions
// response at 500 artifact roots with ZERO client readers (the client renders
// name/status/model only — verified by grep). Server-side consumers (view
// totals, the stale-beacon ts shim, disk fallback) keep `file` on the
// childIndex rows — this strips the RESPONSE tree only.
function childDiet(rows) {
  return (rows ?? []).map((c) => {
    const { file, ...rest } = c;
    if (c.children?.length) rest.children = childDiet(c.children);
    return rest;
  });
}

// ---------- beacon control proxy ----------
async function beaconFetch(sessionId, subpath, init) {
  const b = beacons.get(sessionId);
  if (!b) return { status: 404, body: "no live agent" };
  try {
    const res = await fetch(`http://127.0.0.1:${b.controlPort}${subpath}`, {
      method: init?.method ?? (init?.json ? "POST" : "GET"),
      headers: { ...(init?.json ? { "content-type": "application/json" } : {}), ...(TOKEN ? { "x-prime-token": TOKEN } : {}) },
      body: init?.json ? JSON.stringify(init.json) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    try { return { status: res.status, body: JSON.parse(text) }; } catch { return { status: res.status, body: text }; }
  } catch (e) { return { status: 502, body: String(e?.message ?? e) }; }
}

// ---------- spawned agents (POST /api/new: new conversation) ----------
// prime-agent rpc children this collector spawned for new webui
// conversations. stdin is a held-open PIPE (rpc mode reads it; the child
// dies with the pipe), so handles must stay referenced: Map pid -> child.
// ponytail: collector death SIGTERMs its spawned agents — webui agents do
// NOT survive a collector restart; the ceiling is kill-on-shutdown, no
// adoption/re-attach of orphans; upgrade path is a supervisor step that
// re-adopts live agents instead of killing them.
const spawnedAgents = new Map(); // pid -> ChildProcess
let spawnLogFd = null;
function spawnLog() {
  if (spawnLogFd === null) { try { spawnLogFd = fs.openSync(path.join(HERE, "spawned-agents.log"), "a"); } catch { spawnLogFd = "ignore"; } }
  return spawnLogFd;
}
// cwd resolution for POST /api/new: body.cwd ?? cfg.defaultCwd ?? home;
// ""/whitespace = absent; "~" | "~/" expand to home; relative paths are
// rejected — the operator picks where conversations live, the collector
// never leaks its own dir into spawned agents.
function resolveNewCwd(raw) {
  const pick = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const s = pick(raw) ?? pick(cfg.defaultCwd) ?? os.homedir();
  const expanded = s === "~" ? os.homedir() : s.startsWith("~/") ? path.join(os.homedir(), s.slice(2)) : s;
  if (!path.isAbsolute(expanded)) return { error: `invalid cwd: ${s}: must be absolute` };
  const abs = path.resolve(expanded);
  let st = null;
  try { st = fs.statSync(abs); } catch {}
  if (!st?.isDirectory()) return { error: `invalid cwd: ${abs}: not a directory` };
  return { cwd: abs };
}
// 7aq in-flight resume cap: one resume spawn per id at a time — a rapid
// double-click must never spawn two rpc agents onto the same session.
// Entries clear at register (the row goes live -> the 409 becomes "already
// live"), at child exit (crash before registering), and by the TTL below.
const resumeInflight = new Map(); // session id -> spawn timestamp (ms)
const RESUME_TTL_MS = 60000; // ponytail: a spawn that boots but never registers locks the id for at most this long — honest ceiling; upgrade path is the /api/new spawn->sessionId handshake
function spawnAgent(cwd, resumeId) { // resumeId: 7aq — resume an existing session instead of creating a new one
  const child = spawn("prime-agent",
    ["--mode", "rpc", "--session-dir", SESSIONS_DIR, "-e", path.join(HERE, "index.ts"),
     ...(resumeId ? ["--resume", resumeId] : [])],
    { cwd,
      env: { ...process.env,
        PRIME_WEBUI_PORT: String(PORT), PRIME_WEBUI_INTERNAL_PORT: String(IPORT),
        PRIME_WEBUI_SESSIONS_DIR: SESSIONS_DIR, ...(TOKEN ? { PRIME_WEBUI_TOKEN: TOKEN } : {}) },
      stdio: ["pipe", spawnLog(), spawnLog()] });
  spawnedAgents.set(child.pid, child);
  child.on("error", (e) => { spawnedAgents.delete(child.pid); if (resumeId) resumeInflight.delete(resumeId); console.error("[prime-webui-server] spawn failed:", e?.message ?? e); });
  child.on("exit", () => { spawnedAgents.delete(child.pid); if (resumeId) resumeInflight.delete(resumeId); });
  return child;
}
function killSpawned() {
  for (const c of spawnedAgents.values()) { try { c.kill("SIGTERM"); } catch {} }
}
// collector shutdown reaps the agents it spawned (stdin pipe alone is not a
// reliable kill: keep them re-killable by handle)
process.on("SIGTERM", () => { killSpawned(); process.exit(0); });
process.on("SIGINT", () => { killSpawned(); process.exit(0); });

// ---------- dashboard ----------
// ---------- 7aa system metrics: /api/system (2s-cached sample, header-authed route) ----------
const SYS_CACHE_MS = 2000;
const SYS_MIN_DELTA_MS = 250; // a cpu% delta needs this much window to mean anything
const PROC_OK = (() => { try { fs.accessSync("/proc/stat", fs.constants.R_OK); return true; } catch { return false; } })(); // Linux: /proc; elsewhere (the mac dev host) the os fallback runs
// 7aa-c: the macOS path parses vm_stat instead of os.freemem() — freemem
// counts instantly-purgeable file cache as USED (macOS holds most RAM as
// evictable cache), so the bar read ~98% while Activity Monitor showed ~70%
// (the ponytail comment below predicted exactly this).
let sysCpu = null; // last raw {t,idle,total} — the PRE-sample: the next window's delta anchor (kept from the previous call, so responses stay fast)
let sysCache = null; // {at, body} — the 2s response cache
function readCpu() { // raw counters: /proc/stat first line on Linux, os.cpus() time sums elsewhere
  if (PROC_OK) {
    const v = fs.readFileSync("/proc/stat", "utf8").split("\n")[0].trim().split(/\s+/).slice(1).map(Number);
    const idle = (v[3] ?? 0) + (v[4] ?? 0); // idle + iowait: iowait is cpu-idle too
    return { idle, total: v.reduce((a, b) => a + (b || 0), 0) };
  }
  let idle = 0, total = 0;
  for (const c of os.cpus()) for (const k in c.times) { total += c.times[k]; if (k === "idle") idle += c.times[k]; }
  return { idle, total };
}
function vmStatUsed(sample) { // bytes, or null when the dump is unparseable — the Activity-Monitor-shaped used-memory approximation from a vm_stat dump
  const pg = Number((/page size of (\d+) bytes/.exec(sample) || [])[1]);
  if (!pg) return null;
  const n = (re) => { const m = re.exec(sample); return m ? Number(m[1]) : null; };
  const active = n(/Pages active:\s+(\d+)/), wired = n(/Pages wired down:\s+(\d+)/),
    comp = n(/Pages occupied by compressor:\s+(\d+)/), purge = n(/Pages purgeable:\s+(\d+)/);
  if (active == null || wired == null || comp == null) return null;
  // ponytail: App+Wired+Compressed approximation (active includes purgeable
  // file cache, so it is subtracted); swap/other classes are out of scope —
  // Activity-Monitor parity, not accounting truth.
  return (active + wired + comp - (purge ?? 0)) * pg;
}
function readMem() { // bytes {total, used, pct}: MemTotal/MemAvailable on Linux (honest used), vm_stat on macOS, freemem only as the last fallback
  let total = 0, used = 0;
  if (PROC_OK) {
    const info = {};
    for (const line of fs.readFileSync("/proc/meminfo", "utf8").split("\n")) {
      const m = /^(\w+):\s+(\d+)\s*kB/.exec(line);
      if (m) info[m[1]] = Number(m[2]) * 1024;
    }
    total = info.MemTotal ?? 0; used = total - (info.MemAvailable ?? 0); // available, not free: reclaimable cache is not "used"
  } else {
    total = os.totalmem();
    let vm = null; // 7aa-c: vm_stat first; freemem is the degraded fallback (a high read beats a lying 0)
    try { vm = vmStatUsed(spawnSync("vm_stat", { timeout: 2000, encoding: "utf8" }).stdout ?? ""); } catch {}
    used = vm != null ? Math.min(vm, total) : total - os.freemem();
  }
  return { total, used, pct: total ? Math.round((used / total) * 100) : 0 };
}
async function systemBody() { // at most one sample per 2s window; the cached pre-sample keeps every response fast
  const now = Date.now();
  if (sysCache && now - sysCache.at < SYS_CACHE_MS) return sysCache.body;
  let cur = { ...readCpu(), t: Date.now() };
  let prev = sysCpu;
  if (!prev || cur.t - prev.t < SYS_MIN_DELTA_MS) { // boot pre-sample too fresh: burn one honest window
    prev = cur;
    await new Promise((r) => setTimeout(r, SYS_MIN_DELTA_MS));
    cur = { ...readCpu(), t: Date.now() };
  }
  sysCpu = cur; // the pre-sample for the NEXT window
  const dT = cur.total - prev.total, dI = cur.idle - prev.idle;
  const cpuPct = dT > 0 ? Math.min(100, Math.max(0, Math.round((1 - dI / dT) * 100))) : 0;
  const lv = os.loadavg();
  const body = { cpuPct, mem: readMem(), cores: os.cpus().length, load: [lv[0] ?? 0, lv[1] ?? 0, lv[2] ?? 0] };
  sysCache = { at: Date.now(), body };
  return body;
}
sysCpu = { ...readCpu(), t: Date.now() }; // boot pre-sample: the FIRST /api/system call is already fast (no 250ms wait)

const CSS = fs.readFileSync(path.join(HERE, "dashboard.css"), "utf-8");
const JS = fs.readFileSync(path.join(HERE, "dashboard.js"), "utf-8");
const MARK = fs.readFileSync(path.join(HERE, "mark.svg"));
function dashboardHtml() {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prime Agent</title>
<link rel="icon" type="image/svg+xml" href="/mark.svg">
<style>${CSS}</style>
</head><body>
<header>
  <img class="mark" src="/mark.svg" alt="prime">
  <span class="wordmark">PRIME AGENT</span>
  <div class="sysmeter hidden" id="sysmeter">
    <div class="sysrow" id="cpuRow"><span class="syslabel">CPU</span><span class="systack"><span class="sysfill" id="cpuFill"></span></span><span class="syspct" id="cpuPct"></span></div>
    <div class="sysrow" id="memRow"><span class="syslabel">MEM</span><span class="systack"><span class="sysfill" id="memFill"></span></span><span class="syspct" id="memPct"></span></div>
  </div>
  <span class="status-right"><span class="new-form hidden" id="newForm"><input id="newCwd" type="text" placeholder="cwd (empty = home)" spellcheck="false" autocomplete="off"><button id="newCreate">Create</button><button id="newCancel">Cancel</button></span><button id="new" title="New conversation">+</button><span class="new-note hidden" id="newNote"></span><span class="busy-timer" id="busyTimer"></span><span class="dot" id="dot"></span></span>
</header>
<main>
  <aside id="sidebar">
    <div class="list-head"><span class="caps">Conversations</span><button id="sToggle" class="stoggle" title="Collapse sidebar">«</button></div>
    <div class="search-row"><input id="search" type="text" placeholder="search" spellcheck="false" autocomplete="off"><span class="search-count" id="searchCount"></span></div>
    <div id="rows"></div>
  </aside>
  <div id="sash" title="Drag to resize — double-click or Esc resets"></div>
  <button id="sExpand" class="s-expand" title="Show sidebar">»</button>
  <section id="session">
    <div class="session-head">
      <button class="dmode" id="detailMode">Collapsed mode</button>
      <button class="dmode" id="resumeBtn" title="Resume this session" style="display:none">Resume</button>
      <button id="menuBtn" class="menubtn" title="Session settings" style="display:none">☰</button>
      <div class="title" id="sTitle"></div>
      <div class="sub" id="sSub"></div>
      <div class="sub ssubs" id="sSubs" style="display:none"></div>
    </div>
    <div id="feed"></div>
    <div class="note" id="emptyNote">No conversation selected.</div>
    <div class="note" id="pastNote" style="display:none">Past session — read-only until resumed (pane header or the row's right-click menu).</div>
    <div class="note" id="sError" style="display:none">session unavailable</div>
    <div id="queue"></div>
    <footer id="composer" class="hidden">
      <textarea id="input" placeholder="Message prime agent…" rows="1"></textarea>
      <button id="send" class="primary">Send</button>
      <button id="stop">Stop</button>
    </footer>
  </section>
</main>
<script>const SESSION_API="/api/session/";${JS}</script>
</body></html>`;
}

// ---------- 7ac: file viewer (GET /api/file?path=) ----------
// The feed linkifies file paths (session jsonl, briefs/reports under
// .scratch/.worktrees); this route serves the click. SECURITY (the /static
// suite's lessons, hardened): allow-listed REAL roots ONLY — the agent
// session dirs (SESSIONS_DIR/ARTIFACTS_DIR, env/config-aware), the GitOps
// repo root (.scratch + .worktrees live under it), the extensions dir.
// resolve() then fs.realpathSync on BOTH target and root — a symlink planted
// inside a root that points outside resolves outside and dies at the
// containment check BEFORE any read (the L1 residual fix). No /proc, no
// /etc, no home root: nothing outside the list is reachable at all.
// Extension allow-list (text-ish) + 2MB cap on top; traversal forms fail the
// same containment guard (resolve collapses them first).
const FILE_EXT = new Set(["md", "txt", "json", "jsonl", "py", "js", "mjs", "ts", "css", "html", "yaml", "yml", "toml", "sh", "log"]);
const FILE_MAX_BYTES = 2 * 1024 * 1024;
const FILE_REPO_ROOT = process.env.PRIME_WEBUI_FILE_REPO_ROOT ?? "/Users/ianyoung/Projects/homelab";
const FILE_ROOTS = [SESSIONS_DIR, ARTIFACTS_DIR, FILE_REPO_ROOT,
  path.join(os.homedir(), ".prime", "agent", "extensions")];
// G1-slice deny-list (pathlink-review belt-and-braces on the config.json
// same-secret verdict): secret-bearing basenames NEVER serve, even inside
// allowed roots — config.json (the beacon token), *token*, auth*, settings*,
// *secret*. Matched on the resolved basename, deliberately not the full path
// (innocent files under a matching parent dir stay servable; known collateral:
// authentik-*.md research docs now 403 under auth* — accepted, the reviewer
// pinned the pattern set). Runs BEFORE the extension allow-list could serve
// one of these names.
function deniedName(p) {
  const b = path.basename(p).toLowerCase();
  return b === "config.json" || b.includes("token") || b.startsWith("auth")
    || b.startsWith("settings") || b.includes("secret");
}
function fileView(p) { // -> {path,size,text} | [status, {error}]
  if (typeof p !== "string" || !p || /[\x00-\x1f]/.test(p)) return [400, { error: "bad request" }];
  let abs;
  if (p.startsWith("/")) abs = p;
  else if (p === "~" || p.startsWith("~/")) abs = path.join(os.homedir(), p.slice(1));
  else if (p.startsWith(".scratch/") || p.startsWith(".worktrees/")) abs = path.resolve(FILE_REPO_ROOT, p);
  else return [400, { error: "bad request" }];
  const resolved = path.resolve(abs);
  let real;
  try { real = fs.realpathSync(resolved); } catch { return [404, { error: "not found" }]; }
  let under = false;
  for (const root of FILE_ROOTS) {
    let rr;
    try { rr = fs.realpathSync(root); } catch { continue; } // absent on this box: that root just never serves
    if (real.startsWith(rr + path.sep)) { under = true; break; }
  }
  if (!under) return [400, { error: "outside roots" }];
  if (deniedName(real)) return [403, { error: "forbidden" }];
  let st;
  try { st = fs.statSync(real); } catch { return [404, { error: "not found" }]; }
  if (!st.isFile()) return [400, { error: "unsupported" }];
  if (!FILE_EXT.has(path.extname(real).slice(1).toLowerCase())) return [400, { error: "unsupported" }];
  if (st.size > FILE_MAX_BYTES) return [400, { error: "too large" }];
  try { return { path: real, size: st.size, text: fs.readFileSync(real, "utf-8") }; }
  catch { return [404, { error: "not found" }]; }
}

// ---------- servers ----------
const j = (s, o) => JSON.stringify(o);
function inTrusted(remote) {
  const m = remote.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const ip = (((+m[1] << 24) | (+m[2] << 16) | (+m[3] << 8) | +m[4]) >>> 0);
  for (const c of TRUSTED_CIDRS) {
    const [base, bitsStr] = c.split("/");
    const bm = base.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!bm) continue;
    const b = (((+bm[1] << 24) | (+bm[2] << 16) | (+bm[3] << 8) | +bm[4]) >>> 0);
    const bits = parseInt(bitsStr ?? "32", 10);
    const mask = bits === 0 ? 0 : ((0xffffffff << (32 - bits)) >>> 0);
    if ((ip & mask) === (b & mask)) return true;
  }
  return false;
}
// constant-time token compare (F7/S3): the length pre-check leaks only the
// length (standard); timingSafeEqual never sees mismatched lengths (it throws).
function tokenEq(presented, expected) {
  const a = Buffer.from(String(presented)), b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
// per-IP auth-FAILURE window, public server only (F7/S3): RL_MAX 401s inside
// RL_WINDOW_SECS -> 429 BEFORE the compare, so a throttled peer gets no oracle
// responses. Trusted-CIDR peers skip it entirely. Env overrides for the test.
const RL_WINDOW_SECS = Math.max(1, parseInt(process.env.PRIME_WEBUI_RL_WINDOW_SECS ?? "60", 10));
const RL_MAX = Math.max(1, parseInt(process.env.PRIME_WEBUI_RL_MAX ?? "30", 10));
const authFails = new Map(); // ip -> [timestamps of 401s]
function authFailCount(ip) { // prune-while-counting
  const now = Date.now();
  const ts = (authFails.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_SECS * 1000);
  if (ts.length) authFails.set(ip, ts); else authFails.delete(ip);
  return ts.length;
}
function recordAuthFail(ip) {
  const now = Date.now();
  const ts = (authFails.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_SECS * 1000);
  ts.push(now);
  authFails.set(ip, ts);
}
let noTokenWarned = false; // the fail-closed !token log fires once, not per request
function authed(req, url, token, allowQuery = false) {
  if (inTrusted((req.socket.remoteAddress ?? "").replace(/^::ffff:/, ""))) return true;
  if (!token) { // fail-closed (F7/S3): a tokenless collector serves nothing
    if (!noTokenWarned) { console.error("[prime-webui-server] auth fail-closed: no token resolved"); noTokenWarned = true; }
    return false;
  }
  // query token ONLY where the client cannot set headers (EventSource on /events)
  if (allowQuery && tokenEq(url.searchParams.get("token"), token)) return true;
  return tokenEq(req.headers["x-prime-token"], token);
}

const internal = http.createServer(async (req, res) => {
  const reply = (code, body, type = "text/plain") => {
    res.writeHead(code, { "content-type": type }); res.end(body);
  };
  let url;
  // malformed request-target (raw socket): 400, never a collector process death
  try { url = new URL(req.url ?? "/", `http://${req.headers.host}`); } catch { return reply(400, "bad request"); }
  if (!authed(req, url, TOKEN)) return reply(401, "unauthorized");
  if (req.method === "POST" && url.pathname === "/internal/register") {
    const body = await readJson(req);
    if (!body?.sessionId || !body.controlPort) return reply(400, "bad register");
    const prev = beacons.get(body.sessionId);
    // field-preserving merge on the TUI-footer fields: an older beacon version
    // heartbeating without them (e.g. pre-upgrade session) must not wipe them
    beacons.set(body.sessionId, {
      sessionId: body.sessionId, name: body.name, file: body.file, cwd: body.cwd,
      controlPort: body.controlPort, pid: body.pid, lastBeat: Date.now(),
      status: body.status, model: body.model, created: body.created,
      busySince: body.busySince ?? prev?.busySince,
      thinkingLevel: body.thinkingLevel ?? prev?.thinkingLevel,
      serviceTier: body.serviceTier ?? prev?.serviceTier,
      contextUsage: body.contextUsage ?? prev?.contextUsage,
    });
    resumeInflight.delete(body.sessionId); // 7aq: the resumed row went live — its in-flight lock clears
    return reply(200, "ok");
  }
  if (req.method === "POST" && url.pathname === "/internal/event") {
    const body = await readJson(req);
    if (body?.sessionId && body.event) {
      // busy events also update the registry status (TUI-list field)
      if (body.event === "busy" && beacons.has(body.sessionId)) {
        const b = beacons.get(body.sessionId);
        b.status = body.data?.busy ? "working" : "idle";
      }
      fanout(body.sessionId, body.event, body.data ?? {});
    }
    return reply(200, "ok");
  }
  if (req.method === "POST" && url.pathname === "/internal/unregister") {
    const body = await readJson(req);
    if (body?.sessionId) {
      beacons.delete(body.sessionId);
      const subs = sseBySession.get(body.sessionId);
      if (subs) { for (const r of subs) { try { r.end(); } catch {} } sseBySession.delete(body.sessionId); }
    }
    return reply(200, "ok");
  }
  return reply(404, "not found");
});

function readJson(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve(null); } });
  });
}

// settings-proxy route table (menu slice): endpoint -> method. The beacon
// (index.ts S1) owns the contracts; the collector forwards method+body and
// passes every status through (compact's 409-busy included).
const S_ROUTES = {
  "models": "GET", "set-model": "POST", "set-thinking-level": "POST",
  "rename": "POST", "compact": "POST", "shutdown": "POST", "context-usage": "GET",
};

const public_ = http.createServer(async (req, res) => {
  const serve = (code, type, body, extra) => {
    res.writeHead(code, { "content-type": type, ...extra }); res.end(body);
  };
  let url;
  // malformed request-target (raw socket): 400, never a collector process death
  try { url = new URL(req.url ?? "/", `http://${req.headers.host}`); } catch { return serve(400, "text/plain", "bad request"); }
  if (url.pathname === "/healthz") return serve(200, "text/plain", "ok");
  // /mark.svg rides <img>/<link> subresources, which cannot send headers:
  // pre-auth like /healthz or the logo/favicon 401s off-loopback (F4/S1)
  if (req.method === "GET" && url.pathname === "/mark.svg")
    return serve(200, "image/svg+xml", MARK, { "cache-control": "max-age=86400" });
  // /static assets (7ad vendored md libs; the page inlines its own JS/CSS):
  // pre-auth for the same subresource reason (<script src> cannot send
  // headers — F4/S1). Allow-list, not a listing: extension-mapped known
  // files (.js/.css/.svg), traversal-proof name (charset + no ".."
  // post-decode + resolved path stays under HERE — the session-id guard's
  // pattern); anything else 404s before fs is touched.
  if (req.method === "GET" && url.pathname.startsWith("/static/")) {
    const STATIC_MIME = { js: "text/javascript", css: "text/css", svg: "image/svg+xml" };
    let name = "";
    try { name = decodeURIComponent(url.pathname.slice("/static/".length)); }
    catch { return serve(404, "text/plain", "not found"); }
    const m = /^(?!.*\.\.)[A-Za-z0-9_.-]+\.(js|css|svg)$/.exec(name);
    const sp = m ? path.resolve(HERE, m[0]) : null;
    if (!sp || !sp.startsWith(HERE + path.sep)) return serve(404, "text/plain", "not found");
    try { return serve(200, STATIC_MIME[m[1]], fs.readFileSync(sp, "utf-8"), { "cache-control": "max-age=86400" }); }
    catch { return serve(404, "text/plain", "not found"); }
  }
  const ip = (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
  const trusted = inTrusted(ip);
  if (!trusted && authFailCount(ip) >= RL_MAX) // throttled pre-compare: no oracle
    return serve(429, "text/plain", "too many auth failures", { "retry-after": String(RL_WINDOW_SECS) });
  if (!authed(req, url, TOKEN, req.method === "GET" && url.pathname === "/events")) {
    if (!trusted) recordAuthFail(ip);
    return serve(401, "text/plain", "unauthorized");
  }
  try {
    if (req.method === "GET" && url.pathname === "/") return serve(200, "text/html; charset=utf-8", dashboardHtml());

    if (req.method === "GET" && url.pathname === "/api/sessions") {
      const disk = diskSessions();
      const hier = hierarchy();
      const rows = [];
      const seen = new Set();
      const synth = []; // [parentUuid, childRow] live artifacts children missing from disk
      const artRoot = ARTIFACTS_DIR + path.sep;
      for (const [id, b] of beacons) {
        seen.add(id);
        const childRow = childIndex.get(id);
        if (childRow) { // live subagent: attach under its parent, not as a root row
          childRow.live = true;
          if (b.status) childRow.status = b.status;
          childRow.model = b.model ?? childRow.model;
          childRow.name = b.name ?? childRow.name;
          childRow.modified = b.lastBeat;
          continue;
        }
        const rel = typeof b.file === "string" && b.file.startsWith(artRoot)
          ? b.file.slice(artRoot.length).split(path.sep) : null;
        if (rel && rel.length >= 2 && rel[1].startsWith("sub-")) {
          // live artifacts child missing from the index (spawn race): attach
          // under the DEEPEST known ancestor in its own path — a depth-2+ live
          // row must never surface as the root session's direct child
          let p = rel[0];
          for (let i = rel.length - 3; i >= 1; i--) {
            const rr = childIndex.get(rel[i])
              ?? [...childIndex.values()].find((v) => v.childId === rel[i]);
            if (rr) { p = rr.id ?? rr.childId; break; }
          }
          synth.push([p, { childId: rel[rel.length - 2], id, name: b.name, status: b.status, model: b.model,
            file: b.file, modified: b.lastBeat, createdAt: b.created, live: true }]);
          continue;
        }
        let m = { name: undefined, firstMessage: "", cwd: undefined, date: undefined, count: undefined };
        const d = disk.find((x) => x.id === id);
        if (d) { try { m = metaFor(id, d.path, fs.statSync(d.path)); } catch {} }
        rows.push({ id, name: b.name ?? m.name, live: true, cwd: b.cwd ?? m.cwd,
          modified: b.lastBeat, firstMessage: m.firstMessage, date: m.date, count: m.count, totalCost: m.totalCost,
          status: b.status, model: b.model ?? m.model, created: b.created,
          thinkingLevel: b.thinkingLevel ?? m.thinkingLevel, serviceTier: b.serviceTier ?? m.serviceTier,
          contextTokens: b.contextUsage?.tokens ?? m.contextTokens, contextWindow: b.contextUsage?.contextWindow ?? m.contextWindow,
          contextPercent: b.contextUsage?.percent ?? m.contextPercent, activity: m.activity, taskState: m.taskState });
      }
      for (const d of disk) {
        // poison guard (20-probe-edge.md §1.9/1.10): one unreadable/misshapen
        // file (chmod-000 -> EACCES, dir named <uuid>.jsonl -> EISDIR) must
        // degrade to a bare row, never 500 the whole listing; one
        // console.error per poisoned file (log-once, not a refresh flood).
        let m;
        try { m = metaFor(d.id, d.path, fs.statSync(d.path)); }
        catch (e) {
          m = { firstMessage: "" };
          if (!poisonLogged.has(d.path)) { poisonLogged.add(d.path); console.error("[prime-webui-server] unreadable session file:", d.path, e?.message ?? e); }
        }
        if (seen.has(d.id)) {
          const r = rows.find((x) => x.id === d.id);
          if (r) { r.modified = Math.max(r.modified, d.modified); r.cwd = m.cwd; r.count = m.count;
            r.totalCost = m.totalCost; r.firstMessage = m.firstMessage; r.date = m.date; }
          continue;
        }
        rows.push({ id: d.id, live: false, modified: d.modified, name: m.name,
          firstMessage: m.firstMessage, cwd: m.cwd, date: m.date, count: m.count, totalCost: m.totalCost,
          model: m.model, thinkingLevel: m.thinkingLevel, serviceTier: m.serviceTier,
          contextTokens: m.contextTokens, contextWindow: m.contextWindow, contextPercent: m.contextPercent,
          activity: m.activity, taskState: m.taskState });
      }
      for (const r of rows) r.children = hier.get(r.id) ?? [];
      for (const [p, c] of synth) { // race parents can be CHILD rows (depth-2+): nest under the known ancestor row
        const r = rows.find((x) => x.id === p);
        if (r) { r.children = r.children.concat([c]); continue; }
        const t = childIndex.get(p);
        if (t) { t.children = (t.children ?? []).concat([c]); t.subs = countSubs(t.children); }
      }
      for (const r of rows) r.subs = countSubs(r.children ?? []);
      for (const r of rows) r.children = childDiet(r.children); // 47-bench P0#3: response-only file strip (post-subs, post-synth)
      rows.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || b.modified - a.modified);
      return serve(200, "application/json", j(0, { sessions: rows }));
    }

    if (req.method === "GET" && url.pathname === "/api/system") { // 7aa: header-authed (query token stays SSE-only); 2s-cached
      const body = await systemBody();
      return serve(200, "application/json", j(0, body));
    }

    if (req.method === "GET" && url.pathname === "/api/file") { // 7ac: the path-link viewer's fetch — header-authed like /api/system (query token stays SSE-only)
      const r = fileView(url.searchParams.get("path"));
      if (Array.isArray(r)) return serve(r[0], "application/json", j(0, r[1]));
      return serve(200, "application/json", j(0, r));
    }

    if (req.method === "GET" && /^\/api\/session\/[A-Za-z0-9_-]+\/commands$/.test(url.pathname)) {
      const id = decodeURIComponent(url.pathname.split("/")[3]);
      if (!/^[A-Za-z0-9_-]+$/.test(id)) return serve(404, "text/plain", "bad id");
      const r = await beaconFetch(id, "/commands");
      return serve(r.status, typeof r.body === "string" ? "text/plain" : "application/json", typeof r.body === "string" ? r.body : JSON.stringify(r.body));
    }
    if (req.method === "GET" && /^\/api\/session\/[A-Za-z0-9_-]+\/files$/.test(url.pathname)) {
      const id = decodeURIComponent(url.pathname.split("/")[3]);
      if (!/^[A-Za-z0-9_-]+$/.test(id)) return serve(404, "text/plain", "bad id");
      const r = await beaconFetch(id, "/files?q=" + encodeURIComponent(url.searchParams.get("q") ?? ""));
      return serve(r.status, typeof r.body === "string" ? "text/plain" : "application/json", typeof r.body === "string" ? r.body : JSON.stringify(r.body));
    }
    // ---------- settings proxy (27-settings-parity S2, menu slice) ----------
    // The beacon settings endpoints are loopback-only (each session's own
    // control port); the browser reaches them ONLY through the collector.
    // /api/s/<id>/<endpoint> forwards method+body to the session's beacon
    // port from the registry, header-authed with the SAME token the beacon's
    // authed() re-checks (belt and braces — the route already sits behind
    // the public authed() gate). Settings need the session RUNNING: an id
    // with no registry row answers 404 {"error":"not live"}. Must stay BELOW
    // the /commands + /files handlers (it would otherwise shadow their
    // /api/session/... paths — "ession" matches the id charset).
    if (/^\/api\/s\/[A-Za-z0-9_-]+\/[a-z-]+$/.test(url.pathname)) {
      const seg = url.pathname.split("/"); // ["", "api", "s", id, endpoint]
      const id = seg[3]; // charset pinned by the route regex — no decode surprises
      const method = S_ROUTES[seg[4]];
      if (!method) return serve(404, "text/plain", "not found");
      if (req.method !== method) return serve(405, "text/plain", "method not allowed");
      if (!beacons.has(id)) return serve(404, "application/json", JSON.stringify({ error: "not live" }));
      const r = await beaconFetch(id, "/" + seg[4], method === "POST" ? { json: (await readJson(req)) ?? {} } : undefined);
      return serve(r.status, typeof r.body === "string" ? "text/plain" : "application/json",
        typeof r.body === "string" ? r.body : JSON.stringify(r.body));
    }

        if (req.method === "GET" && url.pathname.startsWith("/api/session/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/session/".length));
      if (!/^[A-Za-z0-9_-]+$/.test(id)) return serve(404, "text/plain", "bad id");
      const hier = hierarchy(); // refresh childIndex (flat map of artifact child sessions)
      const childRow = childIndex.get(id);
      const b = beacons.get(id);
      if (b) {
        const snap = await beaconFetch(id, "/snapshot");
        if (snap.status === 200) {
          const body = snap.body;
          const dd = diskSessions().find((x) => x.id === id);
          let totals = {};
          if (dd) { try { totals = metaFor(id, dd.path, fs.statSync(dd.path)); } catch {} }
          else if (childRow?.file) { try { totals = metaFor(id, childRow.file, fs.statSync(childRow.file)); } catch {} }
          const items = body.items ?? [];
          // stale-beacon ts shim (gapfix2 review spec): a beacon still on
          // pre-#19 index.ts emits snapshot items WITHOUT ts (live workers
          // keep old code for hours after a deploy). Stamp missing ts by
          // item id from the disk parse — only stamp, never reorder; entry
          // ids match because both mapMessages key items by e.id. No-op
          // once beacons carry ts. ponytail: one extra disk parse per live
          // view while a stale beacon is open; upgrade path is the
          // beacon-side module-load fix (ts natively).
          if (items.length && items.some((it) => !it?.ts)) {
            const dp = dd?.path ?? childRow?.file;
            if (dp) {
              try {
                const byId = new Map();
                for (const di of parseSessionFile(dp).items) if (di.ts !== undefined) byId.set(di.id, di.ts);
                for (const it of items) if (!it?.ts && byId.has(it.id)) it.ts = byId.get(it.id);
              } catch {} // unreadable file: serve unstamped items, never 500
            }
          }
          return serve(200, "application/json", j(0, { id, live: true, name: body.session?.name ?? b.name,
            cwd: body.session?.cwd ?? b.cwd, items, busy: !!body.busy,
            busySince: body.busySince ?? b.busySince ?? undefined,
            totalTokens: totals.totalTokens, totalCost: totals.totalCost, parent: childRow?.parent,
            model: b.model ?? totals.model,
            thinkingLevel: b.thinkingLevel ?? totals.thinkingLevel, serviceTier: b.serviceTier ?? totals.serviceTier,
            contextTokens: b.contextUsage?.tokens ?? totals.contextTokens,
            contextWindow: b.contextUsage?.contextWindow ?? totals.contextWindow,
            contextPercent: b.contextUsage?.percent ?? totals.contextPercent,
            subs: countSubs(hier.get(id) ?? []) }));
        }
      }
      let d = diskSessions().find((x) => x.id === id);
      if (!d && childRow?.file) { try { fs.statSync(childRow.file); d = { id, path: childRow.file }; } catch {} }
      if (!d) return serve(404, "text/plain", "no session");
      let parsed, meta;
      try { // poison guard (the list's per-row twin, 20-probe-edge.md §1.9/1.10):
        // one unreadable file degrades to an empty view, never a 500; log-once like the list
        parsed = parseSessionFile(d.path);
        meta = metaFor(id, d.path, fs.statSync(d.path));
      } catch (e) {
        if (!poisonLogged.has(d.path)) { poisonLogged.add(d.path); console.error("[prime-webui-server] unreadable session file:", d.path, e?.message ?? e); }
        return serve(200, "application/json", j(0, { id, live: false, items: [] }));
      }
      return serve(200, "application/json", j(0, { id, live: false, name: parsed.name ?? childRow?.name, cwd: parsed.cwd,
        date: parsed.date, items: parsed.items, truncated: parsed.truncated,
        totalTokens: meta.totalTokens, totalCost: meta.totalCost, parent: childRow?.parent,
        model: meta.model,
        thinkingLevel: meta.thinkingLevel, serviceTier: meta.serviceTier,
        contextTokens: meta.contextTokens, contextWindow: meta.contextWindow, contextPercent: meta.contextPercent,
        subs: countSubs(hier.get(id) ?? []) }));
    }

    if (req.method === "GET" && url.pathname === "/events") {
      const id = url.searchParams.get("session") ?? "";
      if (!beacons.has(id)) {
        // No registry row: reload blink, collector restart (in-memory
        // registry wiped), or a beacon whose first register has not landed.
        // A 404 here kills a browser EventSource PERMANENTLY (WHATWG:
        // non-200 = fail, no retry) and freezes an open dashboard view until
        // a manual refresh. Serve a 200 SSE stream with a short retry hint
        // + a not_live event, then close cleanly: the EventSource
        // auto-reconnects every retry interval until the row is back. The
        // dashboard ignores unknown events (not_live) — no client change.
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-accel-buffering": "no",
        });
        res.flushHeaders();
        res.write("retry: 1000\n\n");
        res.write(`event: not_live\ndata: ${JSON.stringify({ session: id, live: false })}\n\n`);
        res.end();
        return;
      }
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });
      res.flushHeaders();
      // subscribe FIRST, snapshot after (STATE.md:77 — the documented
      // protocol; the old snapshot-first order lost every delta that landed
      // during the snapshot fetch). A buffer target holds the fanout frames
      // until the snapshot lands, then forwards them in arrival order AFTER
      // it — no delta lost, and the stream still opens with the snapshot
      // (the client's snapshot handler wipes + replays, so a superseded
      // frame is a harmless re-render). The buffer->res swap is synchronous:
      // nothing slips between delete and add.
      let subs = sseBySession.get(id);
      if (!subs) { subs = new Set(); sseBySession.set(id, subs); }
      const buffered = [];
      const bufRes = { write: (payload) => buffered.push(payload) };
      subs.add(bufRes);
      req.on("close", () => { subs.delete(res); subs.delete(bufRes); });
      try {
        const snap = await beaconFetch(id, "/snapshot");
        if (snap.status === 200) {
          res.write(`event: snapshot\ndata: ${JSON.stringify(snap.body)}\n\n`);
        }
      } finally {
        if (!res.destroyed) {
          subs.add(res);
          for (const payload of buffered) res.write(payload);
        }
        subs.delete(bufRes);
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/send") {
      const body = await readJson(req);
      const id = body?.session;
      if (!id || !body.text?.trim()) return serve(400, "text/plain", "bad request");
      const r = await beaconFetch(id, "/send", { json: { text: body.text } });
      return serve(r.status, typeof r.body === "string" ? "text/plain" : "application/json", typeof r.body === "string" ? r.body : JSON.stringify(r.body));
    }
    if (req.method === "POST" && url.pathname === "/abort") {
      const body = await readJson(req);
      const id = body?.session;
      if (!id) return serve(400, "text/plain", "bad request");
      const r = await beaconFetch(id, "/abort", { json: {} });
      return serve(r.status, typeof r.body === "string" ? "text/plain" : "application/json", typeof r.body === "string" ? r.body : JSON.stringify(r.body));
    }
    if (req.method === "POST" && url.pathname === "/api/new") {
      const body = await readJson(req);
      const r = resolveNewCwd(body?.cwd);
      if (r.error) return serve(400, "text/plain", r.error);
      const child = spawnAgent(r.cwd); // stdin PIPE held open; its beacon registers it
      return serve(202, "application/json", j(0, { ok: true, pid: child.pid }));
    }
    if (req.method === "POST" && url.pathname === "/api/resume") { // 7aq: bring a dead root session back as a collector-spawned rpc child; the resumed beacon re-registers the SAME session id (transcript continuity)
      const body = await readJson(req);
      const id = body?.id;
      if (typeof id !== "string" || !/^[A-Za-z0-9_-]+$/.test(id)) return serve(400, "text/plain", "bad id");
      const d = diskSessions().find((x) => x.id === id); // root sessions only: resume is a root-session lifecycle act — artifact children belong to their parent
      if (!d) return serve(404, "application/json", JSON.stringify({ error: "no session" }));
      if (beacons.has(id)) return serve(409, "application/json", JSON.stringify({ error: "already live" }));
      const infl = resumeInflight.get(id);
      if (infl !== undefined && Date.now() - infl < RESUME_TTL_MS) return serve(409, "application/json", JSON.stringify({ error: "resume in progress" }));
      let meta;
      try { meta = metaFor(id, d.path, fs.statSync(d.path)); } catch {} // unreadable file yields no verifiable cwd (the poison-guard class)
      if (!meta?.cwd) return serve(400, "application/json", JSON.stringify({ error: "no cwd recorded" }));
      const rc = resolveNewCwd(meta.cwd); // the same validation as /api/new: the recorded dir may have been deleted since the session ended
      if (rc.error) return serve(400, "text/plain", rc.error);
      const child = spawnAgent(rc.cwd, id);
      resumeInflight.set(id, Date.now());
      return serve(200, "application/json", j(0, { ok: true, pid: child.pid }));
    }
    return serve(404, "text/plain", "not found");
  } catch (e) { return serve(500, "text/plain", String(e?.message ?? e)); }
});

async function main() {
console.log(`[prime-webui-server] token source: ${TOKEN_SOURCE}`);
internal.listen(IPORT, "127.0.0.1", () => console.log(`[prime-webui-server] internal on 127.0.0.1:${IPORT}`));
internal.on("error", (e) => { if (e?.code === "EADDRINUSE") { console.error("[prime-webui-server] internal port busy, exiting"); process.exit(0); } });
public_.on("error", (e) => {
  console.error("[prime-webui-server] public bind error:", e?.code);
  process.exit(1); // never linger half-bound (internal up, public dead)
});
public_.listen(PORT, HOST, () => console.log(`[prime-webui-server] serving http://${HOST}:${PORT}`));
setInterval(() => {
  for (const subs of sseBySession.values()) for (const r of subs) { try { r.write(": ping\n\n"); } catch {} }
  const cutoff = Date.now() - RL_WINDOW_SECS * 1000; // limiter memory bound (F7/S3)
  for (const [ip, ts] of authFails) if (!ts.length || ts[ts.length - 1] < cutoff) authFails.delete(ip);
}, 15000);
}
main();
