/**
 * Session naming enforcement (operator rule, 2026-09-18; limit added same day).
 *
 * Prime Agent sessions start UUID-only. The operator finds sessions by name
 * in /resume and `prime-agent agents` (Ctrl+N filters to named). A harness
 * prompt note asks agents to name conversations, but a soft prompt rule gets
 * skipped when the agent dives into work — 4 substantive sessions ran after
 * the note landed and only 1 named itself.
 *
 * Fix, two parts:
 *  1. name_session tool — names the session in-process via pi.setSessionName.
 *     Works in every mode (interactive, daemon, -p); no daemon-roster lookup,
 *     unlike `prime-agent rename`, which only works on active daemon sessions.
 *     Hard-validates the 26-character limit: the session-picker title column
 *     truncates at 26 chars (operator-measured), so longer names are rejected
 *     with a count and the agent retries with a shorter slug.
 *  2. While a session is unnamed, every agent turn's system prompt ends with
 *     a naming directive. Clears automatically once named.
 *
 * 2026-09-18 incident (session 01a0b58d-9b5f-72da-ae7a-94e60d790c18):
 * "Count before sending" failed — models cannot count characters reliably
 * ("unifi-os shell prompt setup", 27 chars, and the 1-4-word hint was
 * satisfied yet still over). After the successful retry the agent ended its
 * turn with zero task work. Hardening: word-length heuristic instead of
 * counting, over-limit errors propose a compliant truncation, and the
 * directive plus every tool result repeat that naming never ends a turn.
 *
 * rlm.spawn children are named at spawn, so they never see the directive.
 */

import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const TOOL = "name_session";
const LIMIT = 26;

const DIRECTIVE = `

SESSION NAMING — REQUIRED (operator rule): this session has no name yet.
Call the name_session tool first, batched with your first tool calls:
  name_session(name="<short lowercase topic slug>")

NAMING NEVER ENDS A TURN. After name_session returns — success or error —
immediately continue the user's request with your next tool call in the SAME
turn. The turn ends when the user's work is done, never at the naming step.
A thinking-only or text-only reply is not continuing.

- Length limit: MAX ${LIMIT} CHARACTERS including spaces — the session-picker title column truncates anything longer. Do not count characters: 2-3 short words always fit; 4 words fit only if every word is ≤5 characters; treat 5+ words as over the limit. If your name is rejected, the tool error proposes a compliant one — take it and move on.
- Name style: lowercase topic slug named for the app/component/task — e.g. "authentik host enrollment", "kavita deploy". Never dates, session ids, or plan numbers.
- If the name_session tool is unavailable, fall back to: prime-agent rename <sessionId> "<slug>" where sessionId is the filename without .jsonl of the conversation-log path shown earlier in this prompt. Keep the fallback under ${LIMIT} characters too. If both fail, skip silently and continue the task.`;

function shorten(name: string): string {
  // Largest word-boundary prefix that fits LIMIT; hard slice if one word is over.
  let out = "";
  for (const word of name.split(/\s+/)) {
    const candidate = out ? `${out} ${word}` : word;
    if (candidate.length > LIMIT) break;
    out = candidate;
  }
  return out || name.slice(0, LIMIT);
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: TOOL,
    label: "Name session",
    description: `Set this conversation's display name. Max ${LIMIT} characters (picker column truncates longer). Operator rule: every conversation gets named, early. Use once per conversation (again only if the focus pivots). Naming never ends a turn — after calling it, continue the user's task with your next tool call in the same turn.`,
    promptGuidelines: [
      `Use name_session as the first tool call in any unnamed conversation to name it (operator rule); keep the name under ${LIMIT} characters (2-3 short words). After it returns — success or error — continue the user's request in the same turn; naming never ends a turn.`,
    ],
    parameters: Type.Object({
      name: Type.String({
        description: `Short lowercase topic slug named for the app/component/task; 2-3 short words (4 only if each word is ≤5 characters), max ${LIMIT} characters including spaces`,
      }),
    }),
    async execute(_toolCallId, params) {
      const name = (params.name || "").trim();
      if (!name) {
        return {
          content: [
            {
              type: "text",
              text: "Error: empty name. Retry with a short slug, then continue the user's request in this same turn.",
            },
          ],
        };
      }
      if (name.length > LIMIT) {
        const suggestion = shorten(name);
        return {
          content: [
            {
              type: "text",
              text: `Error: name is ${name.length} characters — over the ${LIMIT}-character limit (session-picker column truncates at ${LIMIT}). Use this instead: "${suggestion}" (${suggestion.length} chars). Then continue the user's request in this same turn — naming never ends a turn.`,
            },
          ],
        };
      }
      pi.setSessionName(name).catch(() => {}); // unhandled-rejection guard: a supervisor name-collision rejection must never kill the worker (discord lane live repro)
      return {
        content: [
          {
            type: "text",
            text: `Session named: ${name}. Continue the user's request in this same turn.`,
          },
        ],
      };
    },
  });

  pi.on("before_agent_start", async (event, _ctx) => {
    if (pi.getSessionName()) return;
    return { systemPrompt: event.systemPrompt + DIRECTIVE };
  });
}
