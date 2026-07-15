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
            "**Treat [`AGENTS.md`](./AGENTS.md) as the router** — permissions, "
            "hard rules, and a task→module table. Portable config lives under "
            "[`.agents/`](./.agents/README.md) (context, skills, personas, memories). "
            "`.cursor/` is the Cursor adapter (rules, hooks, commands, discovery "
            "symlinks)."
        ),
        "",
        (
            "Before fuzzy or wide work, prefer the `alignment` skill. After editing "
            "agent context files, run `reconcile-context`. Manifest changes: "
            "`manifest-implementer` then `manifest-verifier`. Never commit; never "
            "mutate the live cluster without explicit ask."
        ),
        "",
        (
            "Ephemeral files: use [`.scratch/`](./.scratch/README.md) (not `/tmp`) "
            "for renders and dumps. Gitignored — no secrets there."
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
