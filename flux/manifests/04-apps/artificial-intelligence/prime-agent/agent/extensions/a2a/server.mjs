/**
 * prime-agent inbound A2A webhook — standalone server, owns port 8080.
 * Started by the pod boot script (nohup) and respawned by the a2a
 * extension's session_start handler when its health probe fails. Plain
 * ESM, Node stdlib only. Run: node server.mjs
 *
 * Wire: A2A 1.0 JSON-RPC 2.0 over HTTP — message/send and tasks/get only
 * (no streaming, no push notifications; the agent card says so). Every
 * message/send runs a stateless one-shot `prime-agent -p "<prompt>"`: a
 * fresh session per message, contextId groups tasks but resumes nothing.
 * Runs past 120s keep running and are polled via tasks/get.
 *
 * Auth: bearer token from A2A_WEBHOOK_TOKEN, fail-closed — unset rejects
 * every POST. The token is never logged. Same token as the broker-side
 * litellm-secrets/prime-a2a-authorization header value (with "Bearer ").
 */
import * as http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { spawn } from "node:child_process";

const PORT = parseInt(process.env.A2A_WEBHOOK_PORT ?? "8080", 10);
const PUBLIC_URL =
  process.env.A2A_WEBHOOK_PUBLIC_URL ??
  "http://prime-agent.prime-agent.svc.cluster.local:8080";
const MAX_CONCURRENCY = parseInt(
  process.env.A2A_WEBHOOK_MAX_CONCURRENCY ?? "2",
  10,
);
const TOKEN = process.env.A2A_WEBHOOK_TOKEN ?? "";
const RUN_TIMEOUT_MS = 120_000;
const STDERR_TAIL_CHARS = 300;
const TERMINAL = new Set(["completed", "failed"]);

const log = (...args) => console.error("[a2a-webhook]", ...args);

// ---------- auth (fail-closed; token never logged) ----------
let noTokenWarned = false;
function tokenEq(presented, expected) {
  const a = Buffer.from(String(presented));
  const b = Buffer.from(expected);
  // length pre-check leaks only the length; timingSafeEqual throws on
  // mismatched lengths
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
function authed(req) {
  if (!TOKEN) {
    if (!noTokenWarned) {
      log("auth fail-closed: A2A_WEBHOOK_TOKEN unset - rejecting all POSTs");
      noTokenWarned = true;
    }
    return false;
  }
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") && tokenEq(header.slice(7), TOKEN);
}

// ---------- task store ----------
// ponytail: in-memory task store — a server restart orphans running
// prime-agent children (they finish on their own; sessions persist to the
// PVC) and loses all task history. Upgrade path: a JSONL append log on the
// PVC keyed by task id.
const tasks = new Map(); // id -> task record
const liveChildren = new Set(); // live prime-agent child processes
const running = new Set(); // task ids holding a concurrency slot
// ponytail: simple FIFO queue — no priorities, no cap on queue length.
// Upgrade path: bound the queue and reject overflow with a JSON-RPC
// server error instead of accepting unbounded work.
const queued = []; // {task, prompt} waiting for a slot

/** Task snapshot in the wire shape the a2a client extension parses. */
function snapshot(task) {
  const snap = {
    id: task.id,
    contextId: task.contextId,
    createdAt: task.createdAt,
    status: task.status,
  };
  if (task.artifacts) snap.artifacts = task.artifacts;
  return snap;
}

/** Task snapshot in the a2a-sdk 1.x proto JSON dialect the litellm broker
 * parses replies with (json_format.ParseDict - strict, unknown keys are
 * rejected): flat parts with no kind/type discriminator, TASK_STATE_* enum
 * names, no createdAt (not a proto field). Bare for tasks/get; the
 * message/send leg wraps it as {task} (SendMessageResponse envelope). */
function protoSnapshot(task) {
  const snap = {
    id: task.id,
    contextId: task.contextId,
    status: { state: `TASK_STATE_${String(task.status.state).toUpperCase()}` },
  };
  if (task.status.message) {
    snap.status.message = {
      role: "ROLE_AGENT",
      parts: task.status.message.parts.map((part) => ({ text: part.text })),
    };
  }
  if (task.artifacts) {
    snap.artifacts = task.artifacts.map((artifact) => ({
      parts: artifact.parts.map((part) => ({ text: part.text })),
    }));
  }
  return snap;
}

/** Resolve every waiter parked on this task (state transitions). */
function settle(task) {
  for (const resolve of task.waiters.splice(0)) resolve();
}

/** Resolve when the task reaches a terminal state, or after ms. */
function waitFor(task, ms) {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      const i = task.waiters.indexOf(done);
      if (i !== -1) task.waiters.splice(i, 1);
      resolve();
    };
    const timer = setTimeout(done, ms);
    task.waiters.push(done);
  });
}

function messageOf(text) {
  const tail = String(text ?? "").slice(0, STDERR_TAIL_CHARS);
  return {
    role: "agent",
    parts: [{ kind: "text", text: tail || "(no stderr captured)" }],
  };
}

/** First terminal state wins; 'error' and 'close' can both fire. */
function finishTask(task, patch) {
  if (TERMINAL.has(task.status.state)) return;
  task.status = { state: patch.state };
  if (patch.message) task.status.message = patch.message;
  if (patch.artifacts) task.artifacts = patch.artifacts;
  log(`task ${task.id} -> ${patch.state}`);
  settle(task);
}

function startTask(task, prompt) {
  running.add(task.id);
  let child;
  try {
    // detached so the run survives a server crash; env inherited (PATH
    // resolves prime-agent); stdio piped for the artifact + stderr tail
    child = spawn("prime-agent", ["-p", prompt], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    running.delete(task.id);
    finishTask(task, { state: "failed", message: messageOf(error) });
    kickQueue();
    return;
  }
  liveChildren.add(child);
  task.child = child;
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });
  child.on("error", (error) => {
    liveChildren.delete(child);
    running.delete(task.id);
    finishTask(task, { state: "failed", message: messageOf(error) });
    kickQueue();
  });
  child.on("close", (code) => {
    liveChildren.delete(child);
    running.delete(task.id);
    log(`task ${task.id} child exit code ${code}`);
    if (code === 0) {
      finishTask(task, {
        state: "completed",
        artifacts: [{ parts: [{ kind: "text", text: stdout }] }],
      });
    } else {
      finishTask(task, { state: "failed", message: messageOf(stderr) });
    }
    kickQueue();
  });
}

function kickQueue() {
  while (queued.length && running.size < MAX_CONCURRENCY) {
    const { task, prompt } = queued.shift();
    log(
      `task ${task.id} dequeued (${running.size}/${MAX_CONCURRENCY} running)`,
    );
    startTask(task, prompt);
  }
}

// ---------- JSON-RPC dispatch ----------
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

function jsonRpc(res, id, { result, error }) {
  const payload = { jsonrpc: "2.0", id };
  if (error) payload.error = error;
  else payload.result = result;
  const body = JSON.stringify(payload);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(body);
}

async function messageSend(params, proto) {
  const parts = Array.isArray(params?.message?.parts)
    ? params.message.parts
    : [];
  const texts = parts
    .filter(
      (part) =>
        // parts-dialect acceptance: A2A 1.0/0.3 JSON tags text parts with
        // kind, older SDKs used type, and a2a-sdk 1.x proto JSON (what the
        // litellm broker sends) is FLAT - {"text": "..."} with no
        // discriminator key at all (Part.text is a proto oneof field).
        (part?.kind === "text" ||
          part?.type === "text" ||
          (part?.kind == null && part?.type == null)) &&
        typeof part?.text === "string" &&
        part.text,
    )
    .map((part) => part.text);
  if (!texts.length) {
    return {
      error: {
        code: -32602,
        message: "message/send requires at least one non-empty text part",
      },
    };
  }
  const prompt = texts.join("\n");
  const task = {
    id: randomUUID(),
    contextId: params.message.contextId ?? randomUUID(),
    createdAt: new Date().toISOString(),
    status: { state: "working" },
    waiters: [],
  };
  tasks.set(task.id, task);
  log(
    `message/send task ${task.id} context ${task.contextId} prompt ${prompt.length} chars`,
  );
  if (running.size >= MAX_CONCURRENCY) {
    log(
      `task ${task.id} queued (${running.size}/${MAX_CONCURRENCY} running, ${queued.length} waiting)`,
    );
    queued.push({ task, prompt });
  } else {
    startTask(task, prompt);
  }
  // over the cap: leave the child running and return the working snapshot
  await waitFor(task, RUN_TIMEOUT_MS);
  // a2a-sdk 1.x parses the send result as a SendMessageResponse envelope
  // (strict protobuf JSON): {"task": {...}}; lowercase callers keep the
  // bare A2A 1.0 JSON task.
  return { result: proto ? { task: protoSnapshot(task) } : snapshot(task) };
}

function tasksGet(params, proto) {
  const task = tasks.get(params?.id);
  if (!task) {
    return {
      error: {
        code: -32001,
        message: `tasks/get: unknown task id: ${String(params?.id)}`,
      },
    };
  }
  // a2a-sdk 1.x GetTask parses the result as a bare proto Task (strict);
  // lowercase callers keep the bare A2A 1.0 JSON task.
  return { result: proto ? protoSnapshot(task) : snapshot(task) };
}

// litellm's broker client (a2a-sdk 1.x) sends PascalCase method names on
// the agent-facing wire; alias them onto the v0.3 names this dispatch
// routes, and answer those calls in the SDK's proto JSON dialect
// (protoSnapshot). SendStreamingMessage stays unsupported on purpose: the
// card declares streaming:false, so -32601 is the honest reply.
const METHOD_ALIASES = new Map([
  ["SendMessage", "message/send"],
  ["GetTask", "tasks/get"],
]);

async function handlePost(req, res) {
  if (!authed(req)) {
    res.writeHead(401, { "content-type": "text/plain" });
    res.end("unauthorized");
    return;
  }
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return jsonRpc(res, null, {
      error: { code: -32700, message: "parse error: invalid JSON" },
    });
  }
  const id = body?.id ?? null;
  const rawMethod = body?.method;
  const method = METHOD_ALIASES.get(rawMethod) ?? rawMethod;
  // PascalCase methods exist only on the a2a-sdk 1.x wire (strict protobuf
  // JSON reply parsing); lowercase methods keep the A2A 1.0 JSON dialect.
  const proto = METHOD_ALIASES.has(rawMethod);
  log(`rpc ${rawMethod ?? "(none)"} id ${JSON.stringify(id)}`);
  if (method === "message/send") {
    return jsonRpc(res, id, await messageSend(body.params, proto));
  }
  if (method === "tasks/get") {
    return jsonRpc(res, id, tasksGet(body.params, proto));
  }
  return jsonRpc(res, id, {
    error: { code: -32601, message: `method not found: ${String(method)}` },
  });
}

// ---------- routes ----------
const AGENT_CARD = {
  name: "Prime Agent",
  description:
    "One-shot homelab coding tasks via the cluster prime-agent box; stateless - " +
    "contextId groups but does not resume",
  url: PUBLIC_URL,
  protocolVersion: "1.0",
  capabilities: { streaming: false, pushNotifications: false },
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [],
};

function sendJson(res, code, payload) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  } catch {
    res.writeHead(400, { "content-type": "text/plain" });
    res.end("bad request");
    return;
  }
  try {
    if (req.method === "GET") {
      if (url.pathname === "/health") return sendJson(res, 200, { ok: true });
      if (
        url.pathname === "/" ||
        url.pathname === "/.well-known/agent-card.json"
      ) {
        return sendJson(res, 200, AGENT_CARD);
      }
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    if (req.method === "POST") return await handlePost(req, res);
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("method not allowed");
  } catch (error) {
    log(`request error: ${String(error)}`);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "text/plain" });
    }
    res.end("internal error");
  }
});

server.on("error", (error) => {
  log(`server error: ${String(error)}`);
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  log(
    `listening on 0.0.0.0:${PORT} ` +
      `(auth ${TOKEN ? "bearer token" : "FAIL-CLOSED: token unset"})`,
  );
});

process.on("SIGTERM", () => {
  log(`SIGTERM - killing ${liveChildren.size} live children`);
  for (const child of liveChildren) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
  process.exit(0);
});
