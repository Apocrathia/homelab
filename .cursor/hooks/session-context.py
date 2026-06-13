#!/usr/bin/env python3
"""
sessionStart: inject ``additional_context`` for new agent sessions.

This hook is **fire-and-forget** from Cursor's perspective for blocking, but it
*does* shape first-turn behavior by pointing models at ``AGENTS.md``—the repo's
human-oriented hub—instead of duplicating long policy here (rules already load
via Cursor's rule system).
"""

import json
import sys

# --- Injected context (markdown) --------------------------------------------
# Built from short string fragments so Ruff line-length stays sane and we avoid
# thousand-character triple-quoted blobs that never get reviewed.
CONTEXT = "\n".join(
    [
        "## Workspace entry (from .cursor/hooks)",
        "",
        (
            "**Treat [`AGENTS.md`](./AGENTS.md) at the repo root as the entrypoint** "
            "for this repository's agent context: what this repo is, what you may do "
            "without asking versus what requires explicit operator permission, and the "
            "non-negotiables (including commits and live cluster changes). Always orient "
            "from there first; it links into the rest of the system."
        ),
        "",
        (
            "From `AGENTS.md`: stack and architecture are in [`README.md`](./README.md); "
            "the `.cursor/` discovery map starts at [`.cursor/README.md`](./.cursor/README.md) "
            "(rules, skills, agents, commands, memories, plans). Project rules under "
            "`.cursor/rules/` load per Cursor's scoping — `AGENTS.md` is the "
            "human-oriented hub that tells you how to navigate them."
        ),
    ]
)


def main() -> None:
    # Cursor may send a JSON body; we do not need fields today but must drain stdin
    # so the process exits cleanly if the parent waits on EOF.
    try:
        sys.stdin.read()
    except Exception:
        # Broken pipe / encoding oddities: still emit best-effort context.
        pass
    # ``continue`` is part of the sessionStart output schema; omitting it can cause
    # Cursor to drop ``additional_context`` on some builds.
    out = {"additional_context": CONTEXT.strip(), "continue": True}
    print(json.dumps(out), flush=True)
    sys.exit(0)


if __name__ == "__main__":
    main()
