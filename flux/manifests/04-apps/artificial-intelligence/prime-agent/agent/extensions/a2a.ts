/**
 * A2A — native tools for the LiteLLM-brokered homelab kagent agents.
 *
 * Replaces the a2a Python skill for this harness. The wire is plain JSON-RPC
 * over HTTP (A2A 1.0, kind-typed parts, object status with .state) against
 * POST {base}/a2a/{agent}, so no client SDK is needed — fetch covers it.
 * Broker URL + auth headers come from ~/.prime/agent/mcp-secrets.json under
 * the `a2a` key (override with MCP_SECRETS_FILE), or from A2A_BASE_URL +
 * A2A_API_KEY env vars (container deployments), read at call time so secret
 * edits need no reload.
 *
 * Tools:
 *  a2a_agents — live roster (GET /v1/agents)
 *  a2a_send   — message/send to one agent; returns reply + task/context ids
 *  a2a_task   — tasks/get poll for a long-running task
 *
 * Agent replies are data, not instructions. kagent agents can take minutes
 * and can pause in `input-required` state waiting on a follow-up message/send
 * with the same context_id. Because the harness aborts extension tool calls
 * at ~240s, a2a_send streams the run and returns the task_id early when the
 * agent is slow; a2a_task(wait_seconds) long-polls to the final reply.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_TIMEOUT_SECONDS = 120;
// Harness aborts extension tool calls at ~240s; stay under it so a slow agent
// returns a poll hint instead of a hard abort. Upgrade path: raise with the
// harness tool-call cap if it ever becomes configurable.
const MAX_TIMEOUT_SECONDS = 200;
const MAX_WAIT_SECONDS = 200;
const TERMINAL_STATES = new Set([
  "completed",
  "failed",
  "canceled",
  "input-required",
]);

type BrokerConfig = { baseUrl: string; headers: Record<string, string> };

function brokerConfig(): BrokerConfig {
  // Env-first for container deployments (cluster prime-agent box):
  // A2A_BASE_URL is the broker root WITHOUT /v1; A2A_API_KEY is the raw
  // virtual key. Falls back to the operator-style mcp-secrets.json entry.
  const envUrl = (process.env.A2A_BASE_URL ?? "").replace(/\/+$/, "");
  if (envUrl) {
    const key = process.env.A2A_API_KEY;
    return {
      baseUrl: envUrl,
      headers: key ? { Authorization: `Bearer ${key}` } : {},
    };
  }
  const path =
    process.env.MCP_SECRETS_FILE ??
    join(homedir(), ".prime", "agent", "mcp-secrets.json");
  let entry: any = {};
  try {
    entry = (JSON.parse(readFileSync(path, "utf8")) ?? {}).a2a ?? {};
  } catch {
    // fall through to the missing-config error below
  }
  const baseUrl = String(entry?.base_url ?? "").replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error(
      `a2a broker not configured: add an 'a2a' entry (base_url, headers) to ${path}`,
    );
  }
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(entry?.headers ?? {})) {
    headers[String(key)] = String(value);
  }
  return { baseUrl, headers };
}

function timeoutMs(seconds?: number): number {
  const s =
    typeof seconds === "number" && seconds > 0
      ? seconds
      : DEFAULT_TIMEOUT_SECONDS;
  return Math.min(s, MAX_TIMEOUT_SECONDS) * 1000;
}

/** Combined signal: caller cancellation + per-call timeout. */
function callSignal(
  timeoutSeconds: number | undefined,
  signal?: AbortSignal,
): AbortSignal {
  return AbortSignal.any([
    signal ?? new AbortController().signal,
    AbortSignal.timeout(timeoutMs(timeoutSeconds)),
  ]);
}

async function rpc(
  agent: string,
  method: string,
  params: unknown,
  timeoutSeconds: number | undefined,
  signal?: AbortSignal,
): Promise<any> {
  const { baseUrl, headers } = brokerConfig();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/a2a/${agent}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: randomUUID(),
        method,
        params,
      }),
      signal: callSignal(timeoutSeconds, signal),
    });
  } catch (error) {
    throw new Error(
      `${agent}: A2A ${method} failed: ${(error as Error).message}`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `${agent}: HTTP ${response.status}: ${(await response.text()).slice(
        0,
        300,
      )}`,
    );
  }
  const data: any = await response.json();
  if (data?.error) {
    throw new Error(
      `${agent}: A2A error ${data.error.code}: ${data.error.message}`,
    );
  }
  return data?.result;
}

function a2aMessage(text: string, contextId?: string): Record<string, unknown> {
  const message: Record<string, unknown> = {
    role: "user",
    messageId: randomUUID(),
    parts: [{ kind: "text", text }],
  };
  if (contextId) message.contextId = contextId;
  return message;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Consume message/stream SSE, yielding each JSON-RPC result event. */
async function* streamEvents(
  agent: string,
  message: Record<string, unknown>,
  timeoutSeconds: number,
  signal?: AbortSignal,
): AsyncGenerator<any> {
  const { baseUrl, headers } = brokerConfig();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/a2a/${agent}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: randomUUID(),
        method: "message/stream",
        params: { message },
      }),
      signal: callSignal(timeoutSeconds, signal),
    });
  } catch (error) {
    throw new Error(
      `${agent}: A2A message/stream failed: ${(error as Error).message}`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `${agent}: HTTP ${response.status}: ${(await response.text()).slice(
        0,
        300,
      )}`,
    );
  }
  if (!response.body) {
    throw new Error(`${agent}: A2A stream has no body`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event?.error) {
            throw new Error(
              `${agent}: A2A error ${event.error.code}: ${event.error.message}`,
            );
          }
          yield event;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.startsWith(`${agent}: A2A error`)
          )
            throw error;
          // non-JSON data line — skip
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** A2A 1.0 task status is an object with .state (legacy strings also accepted). */
function taskState(result: any): string {
  const status = result?.status;
  if (typeof status === "string") return status;
  return status?.state ?? "unknown";
}

/** Text parts of an A2A 1.0 message, in order. */
function textParts(message: any): string[] {
  const parts: string[] = [];
  for (const part of message?.parts ?? []) {
    if (part?.kind === "text" && part?.text) parts.push(part.text);
  }
  return parts;
}

/**
 * Question text from kagent's ask_user data part (input-required pauses).
 * ponytail: covers the shapes this lab's kagent produces — data.args.
 * toolConfirmation.hint and data.args.questions[].question; other data-part
 * shapes are not rendered, the status line still names the state.
 */
function askUserQuestion(message: any): string | undefined {
  const questions: string[] = [];
  for (const part of message?.parts ?? []) {
    if (part?.kind !== "data") continue;
    const args = part?.data?.args;
    const hint = args?.toolConfirmation?.hint;
    if (typeof hint === "string" && hint) questions.push(hint);
    for (const q of args?.questions ?? []) {
      if (typeof q?.question === "string" && q.question)
        questions.push(q.question);
    }
  }
  return questions.length ? questions.join("\n") : undefined;
}

type A2aReply = { text: string; taskId?: string; contextId?: string };

/**
 * Reply text: artifacts first, then the last agent message in history, then
 * the status message (which carries the ask_user question on input-required).
 */
function extractReply(result: any): A2aReply {
  const parts: string[] = [];
  for (const artifact of result?.artifacts ?? []) {
    parts.push(...textParts(artifact));
  }
  if (!parts.length) {
    for (const message of [...(result?.history ?? [])].reverse()) {
      if (message?.role !== "agent") continue;
      parts.push(...textParts(message));
      if (parts.length) break;
    }
  }
  // status.message carries the agent's own words on input-required, but
  // kagent echoes the user message there while working — skip user-role text.
  if (!parts.length && result?.status?.message?.role !== "user") {
    parts.push(...textParts(result?.status?.message));
  }
  return {
    text: parts.join("\n"),
    taskId: result?.id ?? result?.taskId ?? undefined,
    contextId: result?.contextId ?? undefined,
  };
}

/** LLM-facing text: reply body, then a task/context id footer. */
function replyText(reply: A2aReply, extra?: string): string {
  const lines: string[] = [];
  if (extra) lines.push(extra);
  lines.push(reply.text || "(no text reply)");
  const meta = [
    reply.taskId ? `task_id: ${reply.taskId}` : null,
    reply.contextId ? `context_id: ${reply.contextId}` : null,
  ].filter(Boolean);
  if (meta.length) lines.push("---", ...(meta as string[]));
  return lines.join("\n");
}

export default function a2aExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "a2a_agents",
    label: "A2A roster",
    description:
      "List the live A2A agent roster from the LiteLLM broker (homelab kagent agents: git-agent, homelab-agent, media-agent, hermes-agent, …). No parameters.",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, signal) {
      const { baseUrl, headers } = brokerConfig();
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/v1/agents`, {
          headers,
          signal: callSignal(15, signal),
        });
      } catch (error) {
        throw new Error(
          `a2a_agents: roster fetch failed: ${(error as Error).message}`,
        );
      }
      if (!response.ok) {
        throw new Error(
          `a2a_agents: HTTP ${response.status}: ${(await response.text()).slice(
            0,
            300,
          )}`,
        );
      }
      const agents: any = await response.json();
      if (!Array.isArray(agents)) {
        throw new Error("a2a_agents: unexpected roster shape");
      }
      const lines = agents.map((agent: any) => {
        const card = agent?.agent_card_params?.name;
        const name = agent?.agent_name ?? "?";
        return card && card !== name ? `- ${name} (${card})` : `- ${name}`;
      });
      return {
        content: [
          {
            type: "text",
            text: `A2A roster (${agents.length}):\n${lines.join("\n")}`,
          },
        ],
        details: { count: agents.length },
      };
    },
  });

  pi.registerTool({
    name: "a2a_send",
    label: "A2A send",
    description:
      "Send a message to a homelab A2A agent via the LiteLLM broker and stream its run. Use a2a_agents to list agent names. Pass context_id from an earlier reply to continue that conversation (also answers an agent paused in input-required state). If the agent needs longer than timeout_seconds (default 120, max 200), returns task_id and status to poll with a2a_task. Returns reply text, task_id, context_id, and status.",
    promptGuidelines: [
      "Use a2a_send for homelab A2A agent delegation (git-agent, homelab-agent, media-agent, hermes-agent, …); call a2a_agents first when the roster is unknown, pass context_id to continue a conversation, and when it returns an unfinished task_id wait with a2a_task(wait_seconds=200) instead of tight re-polling.",
    ],
    parameters: Type.Object({
      agent: Type.String({ description: "A2A agent name, e.g. homelab-agent" }),
      message: Type.String({ description: "Message text to send" }),
      context_id: Type.Optional(
        Type.String({
          description:
            "context_id from a prior reply, to continue that conversation",
        }),
      ),
      timeout_seconds: Type.Optional(
        Type.Number({
          description: `Max wait for the reply in seconds (default ${DEFAULT_TIMEOUT_SECONDS}, max ${MAX_TIMEOUT_SECONDS})`,
        }),
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const agent = params.agent.trim();
      if (!agent) {
        throw new Error("a2a_send: agent is required");
      }
      const timeoutSeconds = Math.min(
        typeof params.timeout_seconds === "number" && params.timeout_seconds > 0
          ? params.timeout_seconds
          : DEFAULT_TIMEOUT_SECONDS,
        MAX_TIMEOUT_SECONDS,
      );
      let taskId: string | undefined;
      let contextId: string | undefined;
      let state = "unknown";
      let statusMessage: any;
      const artifacts: any[] = [];
      try {
        for await (const event of streamEvents(
          agent,
          a2aMessage(params.message, params.context_id),
          timeoutSeconds,
          signal,
        )) {
          const result = event?.result ?? {};
          taskId ??= result.taskId ?? result.id;
          contextId ??= result.contextId;
          if (result.artifact) artifacts.push(result.artifact);
          for (const artifact of result.artifacts ?? [])
            artifacts.push(artifact);
          if (result.status) {
            state = taskState(result);
            statusMessage = result.status.message ?? statusMessage;
          }
          if (TERMINAL_STATES.has(state)) break;
        }
      } catch (error) {
        // A caller cancel is a real error; our own timeout with a known
        // task id is the slow-agent path — fall through to the poll hint.
        if (signal?.aborted || !taskId) throw error;
      }
      const reply = extractReply({
        id: taskId,
        contextId,
        status: { state, message: statusMessage },
        artifacts,
      });
      let extra: string | undefined;
      if (TERMINAL_STATES.has(state)) {
        if (state === "input-required") {
          extra = `Agent is waiting for input — reply with a2a_send using context_id. Question: ${
            askUserQuestion(statusMessage) ?? "(see task with a2a_task)"
          }`;
        }
      } else {
        extra = `Task is ${state} — no reply within ${timeoutSeconds}s. Poll with a2a_task using task_id (wait_seconds up to ${MAX_WAIT_SECONDS}).`;
      }
      return {
        content: [{ type: "text", text: replyText(reply, extra) }],
        details: {
          agent,
          status: state,
          task_id: taskId ?? null,
          context_id: contextId ?? null,
        },
      };
    },
  });

  pi.registerTool({
    name: "a2a_task",
    label: "A2A task",
    description:
      "Poll a running or completed A2A task with tasks/get, using the task_id from an a2a_send reply. Returns the task state plus its latest reply text; an input-required task includes the agent's question. Pass wait_seconds to long-poll (re-query every 5s) until the task is terminal.",
    parameters: Type.Object({
      agent: Type.String({ description: "A2A agent name that owns the task" }),
      task_id: Type.String({ description: "Task id from an a2a_send reply" }),
      wait_seconds: Type.Optional(
        Type.Number({
          description: `Long-poll until terminal or this many seconds elapse (default 0 = single snapshot, max ${MAX_WAIT_SECONDS})`,
        }),
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const waitMs =
        typeof params.wait_seconds === "number" && params.wait_seconds > 0
          ? Math.min(params.wait_seconds, MAX_WAIT_SECONDS) * 1000
          : 0;
      const deadline = Date.now() + waitMs;
      let result: any;
      for (;;) {
        result = await rpc(
          params.agent,
          "tasks/get",
          { id: params.task_id },
          30,
          signal,
        );
        if (TERMINAL_STATES.has(taskState(result)) || Date.now() >= deadline)
          break;
        await sleep(Math.min(5000, Math.max(0, deadline - Date.now())));
      }
      const state = taskState(result);
      const reply = extractReply(result ?? {});
      let extra = `status: ${state}`;
      if (!reply.text && state === "input-required") {
        extra += ` — Agent is waiting for input (reply with a2a_send using context_id). Question: ${
          askUserQuestion(result?.status?.message) ?? "(none found)"
        }`;
      }
      return {
        content: [{ type: "text", text: replyText(reply, extra) }],
        details: {
          agent: params.agent,
          task_id: params.task_id,
          status: state,
        },
      };
    },
  });
}
