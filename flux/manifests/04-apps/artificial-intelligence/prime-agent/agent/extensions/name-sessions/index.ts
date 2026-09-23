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
- Length limit: MAX ${LIMIT} CHARACTERS including spaces — the session-picker title column truncates anything longer. Count before sending.
- Name style: lowercase topic slug named for the app/component/task — e.g. "authentik host enrollment", "kavita deploy". Never dates, session ids, or plan numbers.
- If the name_session tool is unavailable, fall back to: prime-agent rename <sessionId> "<slug>" where sessionId is the filename without .jsonl of the conversation-log path shown earlier in this prompt. Keep the fallback under ${LIMIT} characters too. If both fail, skip silently.
- Naming does not replace the user's request — do both.`;

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: TOOL,
    label: "Name session",
    description: `Set this conversation's display name. Max ${LIMIT} characters (picker column truncates longer). Operator rule: every conversation gets named, early. Use once per conversation (again only if the focus pivots).`,
    promptGuidelines: [
      `Use name_session as the first tool call in any unnamed conversation to name it (operator rule); keep the name under ${LIMIT} characters.`,
    ],
    parameters: Type.Object({
      name: Type.String({
        description: `Short lowercase topic slug, 1-4 words, named for the app/component/task, max ${LIMIT} characters including spaces`,
      }),
    }),
    async execute(_toolCallId, params) {
      const name = (params.name || "").trim();
      if (!name) {
        return { content: [{ type: "text", text: "Error: empty name" }] };
      }
      if (name.length > LIMIT) {
        return {
          content: [
            {
              type: "text",
              text: `Error: name is ${name.length} characters — over the ${LIMIT}-character limit (session-picker column truncates at ${LIMIT}). Shorten it: drop filler words, keep the app/component/task slug.`,
            },
          ],
        };
      }
      pi.setSessionName(name);
      return { content: [{ type: "text", text: `Session named: ${name}` }] };
    },
  });

  pi.on("before_agent_start", async (event, _ctx) => {
    if (pi.getSessionName()) return;
    return { systemPrompt: event.systemPrompt + DIRECTIVE };
  });
}
