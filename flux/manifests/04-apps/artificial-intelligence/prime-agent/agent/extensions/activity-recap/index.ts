/**
 * Activity-recap writer — populates the agents-view "Activity" column without
 * Prime Inference (operator decision 2026-09-17: no prime-inference auth, ever).
 *
 * Why: the built-in daemon summarizer (daemon-session-summarizer.ts) is the
 * only native writer of `agent_status` session entries, and it hard-requires
 * prime-inference/qwen/qwen3-30b-a3b-instruct-2507 with configured auth. This
 * host has none, so recaps never generate and the column renders blank
 * (64k persisted agent_status entries here, zero non-empty summaries).
 *
 * What this does instead:
 *  1. turn_end: derive a one-line recap from the turn's final assistant
 *     message and append an `agent_status` entry through ctx.sessionManager.
 *     That object is typed read-only (ReadonlySessionManager) but the runtime
 *     instance is the full SessionManager, so appendAgentStatus exists.
 *  2. Sweep every 5 min (lock-guarded): backfill one `agent_status` line per
 *     saved session file under ~/.prime/agent/sessions/. Entries chain
 *     parentId to the file's last entry — the same entry type the native
 *     summarizer persists, so the scanner and agents view pick them up.
 *  3. /activity-recap: run the sweep immediately.
 *
 * Recaps are heuristic and free (first sentence of the last assistant
 * message, capped). Upgrade path: swap deriveRecap() for a litellm call.
 *
 * Caveats (accepted):
 *  - Live agents-view rows read daemon in-memory summaryState, which only the
 *    native summarizer writes. A fresh recap surfaces in live rows after a
 *    worker re-seed (restart/reopen); saved rows update immediately.
 *  - taskState is always needs_input — the same verdict the native no-auth
 *    fallback would settle, and what unjudged idle sessions default to.
 *  - basedOnMessageCount counts file-wide message entries (what the
 *    saved-session scanner counts), not the daemon's branch-based count; the
 *    difference only affects verdict-currency display, not the recap text.
 */

import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  openSync,
  readSync,
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

// --- tunables ----------------------------------------------------------------

const SWEEP_INTERVAL_MS = 5 * 60_000;
const SWEEP_START_DELAY_MS = 15_000;
const LIVE_APPEND_MIN_INTERVAL_MS = 10_000;
/** Skip session files touched this recently — a live worker owns them. */
const LIVE_FILE_MAX_AGE_MS = 2 * 60_000;
/** Sweep claim lifetime; stale claims are reclaimed by any worker. */
const LOCK_MAX_AGE_MS = 10 * 60_000;
const LOCK_FILE = join(
  process.env.HOME ?? "",
  ".prime",
  "agent",
  "activity-recap.lock.json",
);
const MAX_RECAP_CHARS = 90;
/** Lines above this are oversized tool results; skip parsing them. */
const MAX_PARSE_LINE_CHARS = 512_000;

// --- types -------------------------------------------------------------------

export type AgentTaskState = "needs_input" | "completed" | "error";

export interface AgentStatusLike {
  summary: string;
  taskState?: AgentTaskState;
  basedOnMessageCount: number;
}

/** Runtime shape of ctx.sessionManager (the typed pick omits the appends). */
interface WritableSessionManager {
  appendAgentStatus(status: AgentStatusLike): string;
  getSessionFile(): string;
  getSessionDir(): string;
  getEntries(): Array<{ type?: string }>;
}

export interface SessionFileScan {
  lastEntryId: string | null;
  messageCount: number;
  latestStatus: AgentStatusLike | null;
  lastAssistantText: string | undefined;
}

// --- recap derivation (pure; exported for tests) ------------------------------

/** First text block of an assistant message (content may be a string or blocks). */
export function assistantText(content: unknown): string | undefined {
  if (typeof content === "string") {
    return content || undefined;
  }
  if (!Array.isArray(content)) {
    return undefined;
  }
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: unknown }).type === "text" &&
      typeof (block as { text?: unknown }).text === "string" &&
      (block as { text: string }).text.trim()
    ) {
      return (block as { text: string }).text;
    }
  }
  return undefined;
}

/** One-line present-ish recap: first sentence of the answer, markdown stripped. */
export function deriveRecap(text: string | undefined): string | undefined {
  if (!text) {
    return undefined;
  }
  let cleaned = text
    // Drop fenced code blocks wholesale; their first line is never a recap.
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, " ")
    .replace(/^\s*[-*+]\s+/gm, " ")
    .replace(/\*\*?([^*]*)\*\*?/g, "$1");
  // Skip header lines (ending ":"), ack/short fillers, and one-word lines
  // BEFORE picking the recap source: a rhetorical header or an "ok" ack
  // must not become the recap (S1, 2026-09-19 — activity-recap review).
  const ACK_RE =
    /^(recorded|understood|noted|applying|done|working|ok)[.!\s]*$/i;
  const lines = cleaned
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
  const pick =
    lines.find(
      (line) => line.length >= 20 && !line.endsWith(":") && !ACK_RE.test(line),
    ) ??
    lines[0] ??
    "";
  // First sentence of the picked line if it has a terminator.
  const sentence = pick.match(/^(.{1,}?[.!?])(\s|$)/);
  cleaned = (sentence ? sentence[1] : pick).replace(/[.\s]+$/, "").trim();
  if (!cleaned || cleaned.startsWith("<")) {
    return undefined;
  }
  if (cleaned.length > MAX_RECAP_CHARS) {
    const cut = cleaned.slice(0, MAX_RECAP_CHARS - 1);
    const boundary = cut.lastIndexOf(" ");
    cleaned = `${(boundary > MAX_RECAP_CHARS / 2
      ? cut.slice(0, boundary)
      : cut
    ).trimEnd()}…`;
  }
  return cleaned;
}

// --- saved-file backfill (pure-ish; exported for tests) -----------------------

/** Stream one session JSONL, keeping only what a backfill decision needs. */
export async function scanSessionFile(path: string): Promise<SessionFileScan> {
  const scan: SessionFileScan = {
    lastEntryId: null,
    messageCount: 0,
    latestStatus: null,
    lastAssistantText: undefined,
  };
  const rl = readline.createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    // The entry id is the only "id" immediately followed by "parentId":
    // every runtime entry serializes as {…, id, parentId, timestamp}. A
    // bare first-"id" match misreads harness refinement entries — nested
    // ids (data.id = "refine_…", details.edits[].id = memory names like
    // "opentakserver_deploy_state") precede the entry's own id — and the
    // sweep then chains agent_status.parentId to a memory name: a dangling
    // id that broke the chain walk (13 real sessions rendered empty).
    const idMatch = trimmed.match(/"id":"([^"]+)","parentId":/);
    if (idMatch) {
      scan.lastEntryId = idMatch[1] ?? scan.lastEntryId;
    }
    if (trimmed.startsWith('{"type":"agent_status"')) {
      if (trimmed.length <= MAX_PARSE_LINE_CHARS) {
        try {
          scan.latestStatus =
            (JSON.parse(trimmed) as { status?: AgentStatusLike }).status ??
            scan.latestStatus;
        } catch {
          // keep the previous latestStatus
        }
      }
      continue;
    }
    if (trimmed.startsWith('{"type":"message"')) {
      scan.messageCount++;
      if (trimmed.length <= MAX_PARSE_LINE_CHARS) {
        try {
          const message = (
            JSON.parse(trimmed) as {
              message?: { role?: string; content?: unknown };
            }
          ).message;
          if (message?.role === "assistant") {
            const text = assistantText(message.content);
            if (text) {
              scan.lastAssistantText = text;
            }
          }
        } catch {
          // unparseable line: not a recap source
        }
      }
    }
  }
  return scan;
}

/** Append iff a recap exists and the persisted one is empty or stale. */
export function shouldBackfill(
  scan: SessionFileScan,
  recap: string | undefined,
): boolean {
  if (!recap || !scan.lastEntryId) {
    return false;
  }
  const latest = scan.latestStatus;
  if (!latest || !latest.summary) {
    return true; // never summarized (native empty fallback) — fill it
  }
  return latest.basedOnMessageCount !== scan.messageCount; // stale — refresh it
}

/** Build a native-shaped agent_status entry (same field order as appendAgentStatus). */
export function buildStatusEntry(
  parentId: string | null,
  status: AgentStatusLike,
) {
  return {
    type: "agent_status" as const,
    id: randomUUID().replace(/-/g, "").slice(0, 12),
    parentId,
    timestamp: new Date().toISOString(),
    status: {
      summary: status.summary,
      taskState: status.taskState,
      basedOnMessageCount: status.basedOnMessageCount,
    },
  };
}

export function appendStatusEntry(
  path: string,
  entry: ReturnType<typeof buildStatusEntry>,
): void {
  // A crash can leave a torn last line with no trailing newline; appending
  // directly would glue this entry onto it and lose both. Guard the seam.
  let prefix = "";
  try {
    const stat = statSync(path);
    if (stat.size > 0) {
      const fd = openSync(path, "r");
      try {
        const last = Buffer.alloc(1);
        readSync(fd, last, 0, 1, stat.size - 1);
        if (last.toString("utf8") !== "\n") {
          prefix = "\n";
        }
      } finally {
        closeSync(fd);
      }
    }
  } catch {
    // unreadable or missing: appendFileSync below surfaces the real error
  }
  appendFileSync(path, `${prefix}${JSON.stringify(entry)}\n`);
}

// --- sweep orchestration ------------------------------------------------------

function claimSweep(): boolean {
  try {
    if (existsSync(LOCK_FILE)) {
      const { ts } = JSON.parse(readFileSync(LOCK_FILE, "utf8")) as {
        ts?: number;
      };
      if (typeof ts === "number" && Date.now() - ts < LOCK_MAX_AGE_MS) {
        return false;
      }
    }
  } catch {
    // unreadable lock: treat as absent
  }
  try {
    writeFileSync(LOCK_FILE, JSON.stringify({ ts: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

/** One backfill pass over saved top-level sessions; returns the append count. */
export async function sweepOnce(
  sessionDir: string,
  skipFile?: string,
): Promise<number> {
  let appended = 0;
  let files: string[] = [];
  try {
    files = readdirSync(sessionDir).filter((name) => name.endsWith(".jsonl"));
  } catch {
    return 0;
  }
  for (const name of files) {
    const path = join(sessionDir, name);
    if (path === skipFile) {
      continue;
    }
    try {
      if (Date.now() - statSync(path).mtimeMs < LIVE_FILE_MAX_AGE_MS) {
        continue; // a live worker owns this file
      }
      const scan = await scanSessionFile(path);
      const recap = deriveRecap(scan.lastAssistantText);
      if (!shouldBackfill(scan, recap)) {
        continue;
      }
      appendStatusEntry(
        path,
        buildStatusEntry(scan.lastEntryId, {
          summary: recap,
          taskState: "needs_input",
          basedOnMessageCount: scan.messageCount,
        }),
      );
      appended++;
    } catch {
      // one bad file must not abort the sweep
    }
  }
  return appended;
}

async function runSweep(
  ctx: ExtensionContext,
  notify?: (message: string) => void,
): Promise<void> {
  const manager = ctx.sessionManager as unknown as WritableSessionManager;
  const sessionDir = manager.getSessionDir();
  const appended = await sweepOnce(sessionDir, manager.getSessionFile());
  notify?.(
    appended > 0
      ? `Activity recap: ${appended} session(s) updated`
      : "Activity recap: everything current",
  );
}

// --- wiring ---------------------------------------------------------------------

export default function (pi: ExtensionAPI): void {
  let lastLiveAppendAt = 0;
  // Deferred-recap state: the newest throttled recap and its flush timer.
  let pendingRecap: string | undefined;
  let pendingCtx: ExtensionContext | undefined;
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;

  const appendLive = (ctx: ExtensionContext, recap: string): void => {
    const manager = ctx.sessionManager as unknown as WritableSessionManager;
    const messageCount = manager
      .getEntries()
      .filter((entry) => entry.type === "message").length;
    manager.appendAgentStatus({
      summary: recap,
      taskState: "needs_input",
      basedOnMessageCount: messageCount,
    });
    lastLiveAppendAt = Date.now();
  };

  const flushPending = (): void => {
    pendingTimer = undefined;
    const recap = pendingRecap;
    pendingRecap = undefined;
    if (recap !== undefined && pendingCtx !== undefined) {
      appendLive(pendingCtx, recap);
    }
  };

  // Live recap: append after each settled turn. Throttled because a tool-loop
  // burst fires turn_end per LLM response; a throttled recap is deferred
  // (newest wins) and flushed once the window elapses, so a turn's final
  // answer always lands instead of waiting for the sweep to repair it.
  pi.on("turn_end", async (event, ctx) => {
    const text = assistantText(
      (event.message as { content?: unknown } | undefined)?.content,
    );
    const recap = deriveRecap(text);
    if (!recap) {
      return;
    }
    const now = Date.now();
    const sinceLastAppend = now - lastLiveAppendAt;
    if (sinceLastAppend < LIVE_APPEND_MIN_INTERVAL_MS) {
      // Defer instead of drop: keep the newest recap; one timer per window.
      pendingRecap = recap;
      pendingCtx = ctx;
      if (pendingTimer === undefined) {
        pendingTimer = ctx.setTimeout(
          flushPending,
          LIVE_APPEND_MIN_INTERVAL_MS - sinceLastAppend,
        );
      }
      return;
    }
    appendLive(ctx, recap);
  });

  // Sweep: backfill saved sessions. The lock lets exactly one worker run it.
  pi.on("session_start", (_event, ctx) => {
    ctx.setTimeout(() => {
      if (claimSweep()) {
        void runSweep(ctx);
      }
    }, SWEEP_START_DELAY_MS);
    ctx.setInterval(() => {
      if (claimSweep()) {
        void runSweep(ctx);
      }
    }, SWEEP_INTERVAL_MS);
  });

  // Manual trigger.
  pi.registerCommand("activity-recap", {
    description: "Backfill agents-view Activity recaps for saved sessions",
    handler: async (_args, ctx) => {
      if (!claimSweep()) {
        ctx.ui.notify("Activity recap: another worker is sweeping", "info");
        return;
      }
      await runSweep(ctx, (message) => ctx.ui.notify(message, "info"));
    },
  });
}
