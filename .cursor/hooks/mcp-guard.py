#!/usr/bin/env python3
"""
beforeMCPExecution: gate MCP tool calls that look mutating (``permission: ask``).

Cursor passes JSON on stdin; we print JSON permission on stdout. Like
``shell-guard.py``, we **fail open** on malformed input so a typo here does not
freeze the agent unless you opt into ``failClosed`` in ``hooks.json``.

**Why tool names only (not full tool_input):**
- Payload shapes differ per MCP server; maintaining a schema per tool is brittle.
- Tool *names* are still a strong prior for side effects (``createFoo``, ``deleteBar``).
- False negatives: read tools like ``get_create_time`` can still ask (verb ``create``
  appears as its own segment); that is an accepted trade for catching ``user_tool_delete_resource``.

**Normalization:** MCP segments may be ``camelCase``; we insert underscores before
capital boundaries so ``createMergeRequest`` becomes ``create_merge_request``.
Verbs match as **whole snake words** (between ``_`` or at the ends)—so ``delete``
hits ``user_tool_delete_resource`` but does not match ``running`` for verb ``run``.
"""

from __future__ import annotations

import json
import re
import sys

# --- Hook contract -----------------------------------------------------------
# beforeMCPExecution output: permission (+ optional user_message, agent_message).
ALLOW = {"permission": "allow"}

# --- Verb allowlist ----------------------------------------------------------
# Loose write / side-effect stems. After normalizing to snake_case, each verb must
# appear as its **own** segment: (^|_)<verb>(_|$). So ``delete`` matches
# ``user_tool_delete_resource`` and ``foo_delete``, but ``run`` does not match inside
# ``running`` (no underscore boundary around the verb).
#
# Tuning: add verbs when a new MCP family uses a stem we do not cover; remove
# verbs that produce unbearable false positives (short stems are riskier).
VERBS_MUTATING: frozenset[str] = frozenset(
    {
        "abort",
        "accept",
        "activate",
        "add",
        "allocate",
        "apply",
        "approve",
        "archive",
        "assign",
        "attach",
        "authenticate",
        "authorize",
        "ban",
        "bind",
        "block",
        "bootstrap",
        "cancel",
        "clear",
        "close",
        "commit",
        "configure",
        "copy",
        "cordon",
        "create",
        "cut",
        "deactivate",
        "deauthorize",
        "decline",
        "delete",
        "deny",
        "deploy",
        "destroy",
        "detach",
        "disable",
        "disconnect",
        "dismiss",
        "drain",
        "drop",
        "enable",
        "erase",
        "execute",
        "export",
        "fork",
        "grant",
        "import",
        "insert",
        "install",
        "invoke",
        "kick",
        "kill",
        "link",
        "lock",
        "login",
        "logout",
        "merge",
        "migrate",
        "modify",
        "move",
        "pair",
        "patch",
        "pause",
        "pin",
        "post",
        "promote",
        "prune",
        "publish",
        "purge",
        "put",
        "reauthenticate",
        "rebuild",
        "refresh",
        "register",
        "reject",
        "release",
        "remove",
        "rename",
        "replace",
        "restart",
        "restore",
        "resume",
        "retry",
        "revoke",
        "rollback",
        "rotate",
        "run",
        "save",
        "schedule",
        "send",
        "set",
        "ship",
        "start",
        "stop",
        "submit",
        "subscribe",
        "suspend",
        "sync",
        "terminate",
        "toggle",
        "touch",
        "trigger",
        "unassign",
        "unapprove",
        "unarchive",
        "unban",
        "uninstall",
        "unlink",
        "unlock",
        "unpair",
        "unpause",
        "unpublish",
        "unregister",
        "unsubscribe",
        "unsuspend",
        "update",
        "upgrade",
        "upload",
        "wipe",
        "write",
    }
)


def tool_signature(tool_name: str) -> str:
    """Last ``:`` segment when Cursor sends ``MCP:server:tool``; else whole string.

    Keeping **original casing** here matters: ``normalize_tool_segment`` relies on
    capital letters to infer word boundaries for camelCase.
    """
    name = tool_name.strip()
    if ":" in name:
        return name.rsplit(":", maxsplit=1)[-1]
    return name


def normalize_tool_segment(segment: str) -> str:
    """Turn camelCase / PascalCase / snake into lowercase ``snake_case``-ish.

    Two-pass regex is the common split heuristic (handles ``HTTPResponse``-style
    acronyms well enough for MCP tool names; odd servers can extend this function).
    """
    s = segment.strip()
    if not s:
        return ""
    s = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", s)
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s)
    return s.replace("__", "_").lower()


def is_mutating_snake(snake: str) -> bool:
    """True if any verb appears as a whole snake segment (underscore-delimited word)."""
    for verb in VERBS_MUTATING:
        if re.search(rf"(^|_){re.escape(verb)}(_|$)", snake):
            return True
    return False


def ask(user: str, agent: str) -> None:
    print(
        json.dumps(
            {
                "permission": "ask",
                "user_message": user,
                "agent_message": f"{user}\n\n{agent}",
            }
        ),
        flush=True,
    )
    print(f"[homelab-mcp-guard] {user}", file=sys.stderr, flush=True)
    sys.exit(0)


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps(ALLOW))
        sys.exit(0)

    tool_name = str(data.get("tool_name") or "").strip()
    if not tool_name:
        # Empty tool_name should not happen; treat as non-gating.
        print(json.dumps(ALLOW))
        sys.exit(0)

    raw_sig = tool_signature(tool_name)
    snake = normalize_tool_segment(raw_sig)
    if is_mutating_snake(snake):
        ask(
            "This MCP tool call may change external systems. Approve only if you intend to run it.",
            (
                "Homelab hook: MCP tool may mutate remote state or send messages. "
                f"Tool: {tool_name!r}. Confirm operator approval or narrow the tool call."
            ),
        )

    print(json.dumps(ALLOW))
    sys.exit(0)


if __name__ == "__main__":
    main()
