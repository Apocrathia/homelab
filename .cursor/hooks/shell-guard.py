#!/usr/bin/env python3
"""
beforeShellExecution: gate risky shell commands with ``permission: ask``.

Cursor spawns this process, sends hook JSON on stdin, and reads JSON on stdout.
We **fail open** (allow on parse errors / odd input) so a broken hook does not
brick the agent; tighten with ``failClosed`` in ``hooks.json`` only if you
accept blocking runs when the script errors.

**Check order matters:**
1. Infra tools (kubectl, flux, …) run on ``infra`` = command with one leading
   ``sudo`` stripped—so ``sudo kubectl apply`` hits the kubectl mutation path,
   not only a generic ``sudo`` hit from ``UNSAFE_CHECKS``.
2. Read-only kubectl exits **before** ``UNSAFE_CHECKS``, so
   ``sudo kubectl get …`` allows without a redundant sudo prompt.
3. Pure ``rm``/``mv`` with every path under repo ``.scratch/`` allows before
   ``UNSAFE_CHECKS`` (ephemeral cleanup; ``..`` escapes still ask).
4. ``UNSAFE_CHECKS`` runs on the **original** command string so we still see
   ``sudo`` when it is load-bearing (e.g. ``sudo curl``).
"""

from __future__ import annotations

import json
import re
import shlex
import sys
from pathlib import Path

# --- Hook contract (stdout JSON) --------------------------------------------
# beforeShellExecution output: permission (+ optional user_message, agent_message).
# Do not emit ``continue`` here — that field belongs to sessionStart / beforeSubmitPrompt.
ALLOW = {"permission": "allow"}


def strip_leading_sudo(s: str) -> str:
    """Strip one leading ``sudo`` so infra heuristics classify the real binary.

    We only strip **once**: nested ``sudo sudo kubectl`` is pathological; count=1
    keeps the regex cheap and matches how humans type wrappers.
    """
    return re.sub(r"^\s*sudo\s+", "", s, count=1)


def is_scratch_confined_rm_or_mv(cmd: str, cwd: str) -> bool:
    """True when the command is a pure ``rm``/``mv`` with every path under ``.scratch/``.

    Compound shells (``&&``, pipes, ``;``) return False so other verbs stay gated.
    ``Path.resolve()`` collapses ``..`` escapes, so ``.scratch/../flux`` is not allowed.
    """
    if re.search(r"[|;&]|&&|\|\|", cmd):
        return False
    try:
        tokens = shlex.split(cmd)
    except ValueError:
        return False

    i = 0
    # Skip leading ``VAR=value`` assignments so ``FOO=1 rm .scratch/x`` still classifies.
    while i < len(tokens) and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", tokens[i]):
        i += 1
    if i >= len(tokens) or tokens[i] not in ("rm", "mv"):
        return False

    paths: list[str] = []
    for arg in tokens[i + 1 :]:
        if arg == "--":
            continue
        if arg.startswith("-") and arg != "-":
            continue
        paths.append(arg)
    if not paths:
        return False

    scratch_root = (Path(cwd) / ".scratch").resolve()
    for raw in paths:
        candidate = Path(raw)
        resolved = candidate.resolve() if candidate.is_absolute() else (Path(cwd) / candidate).resolve()
        try:
            resolved.relative_to(scratch_root)
        except ValueError:
            return False
    return True


def ask(user: str, agent: str) -> None:
    """Emit ask + exit 0; non-zero exits are fail-open unless failClosed."""
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
    # Stderr mirrors user_message in the Hooks output channel during approval.
    print(f"[homelab-shell-guard] {user}", file=sys.stderr, flush=True)
    sys.exit(0)


# --- Broad unsafe patterns (see hooks README) -------------------------------
# Ordered checks on the **original** command string (not ``infra``) so ``sudo`` still
# triggers when the rest of the line was allow-listed (e.g. read-only kubectl).
# First match wins — put more specific categories before broad ones (``sudo`` last).
#
# Intentionally **not** matched: generic ``docker ps`` / ``git pull`` / ``npm install``
# (too noisy or ambiguous); add a tuple here when your workflow needs more coverage.
UNSAFE_CHECKS: list[tuple[re.Pattern[str], str, str]] = [
    (
        # Shell word ``eval``, not ``eval`` inside quoted search patterns (``rg 'eval '``).
        re.compile(r"(?i)(?:^|[|;&]|&&|\|\|)\s*eval\s"),
        "Shell eval (arbitrary code execution).",
        "Homelab hook: eval invocation. Confirm operator approval.",
    ),
    (
        re.compile(r"(?i)\b(nc|ncat|netcat)(\s|$)"),
        "Netcat (raw network socket).",
        "Homelab hook: netcat/nc detected. Confirm operator approval.",
    ),
    (
        re.compile(r"(?i)\b(rm|mv|chmod|chown|dd)\b"),
        "Destructive filesystem (rm/mv/chmod/chown/dd).",
        "Homelab hook: rm/mv/chmod/chown/dd detected. Confirm operator approval.",
    ),
    (
        re.compile(r"(?i)\b(curl|wget|aria2c)\b"),
        "Remote download (curl/wget/aria2c).",
        "Homelab hook: curl/wget/aria2c detected. Confirm operator approval.",
    ),
    (
        re.compile(r"(?i)\b(ssh|scp|rsync|sftp)\b"),
        "Remote access (ssh/scp/rsync/sftp).",
        "Homelab hook: ssh/scp/rsync/sftp detected. Confirm operator approval.",
    ),
    (
        re.compile(r"(?i)\bdocker(\s+compose)?\s+(up|down|run|exec|rm|rmi|stop|kill|pull|push|prune|build)\b"),
        "Docker container/image change.",
        "Homelab hook: docker lifecycle command. Confirm operator approval.",
    ),
    (
        re.compile(r"(?i)\bpodman\s+(up|down|run|exec|rm|stop|kill|pull|push|prune|build)\b"),
        "Podman container/image change.",
        "Homelab hook: podman lifecycle command. Confirm operator approval.",
    ),
    (
        re.compile(r"(?i)\b((git|gh)\s+push|git\s+(commit|reset|merge|rebase|clean)|git\s+stash\s+(pop|apply))\b"),
        "Sensitive git operation.",
        "Homelab hook: git push/commit/reset or similar. Confirm operator approval.",
    ),
    (
        re.compile(r"(?i)\bsudo\b"),
        "Elevated privileges (sudo).",
        "Homelab hook: sudo detected. Confirm operator approval.",
    ),
]


def main() -> None:
    # --- Parse stdin ---------------------------------------------------------
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        # Malformed hook payload: never block the shell on our account.
        print(json.dumps(ALLOW))
        sys.exit(0)

    cmd = (data.get("command") or "").strip()
    if not cmd:
        print(json.dumps(ALLOW))
        sys.exit(0)

    cwd = (data.get("cwd") or "").strip() or str(Path.cwd())
    lower = cmd.lower()
    # Infra classification uses ``infra``; broad unsafe uses full ``cmd``/``lower``
    # as described in the module docstring.
    infra = strip_leading_sudo(lower)

    # --- Scratch-confined cleanup (before UNSAFE_CHECKS rm/mv) -----------------
    # Agents use ``.scratch/`` for ephemeral files; allow pure rm/mv there so the
    # destructive-filesystem check does not spam approvals for temp cleanup.
    if is_scratch_confined_rm_or_mv(cmd, cwd):
        print(json.dumps(ALLOW))
        sys.exit(0)

    # --- Safe planning paths (tofu/terraform) ---------------------------------
    # Dry-run and read-only plan operations should not nag—operators use these
    # constantly in GitOps review.
    if re.search(r"--dry-run|dry-run=(client|server)", infra):
        print(json.dumps(ALLOW))
        sys.exit(0)
    if re.search(r"\b(plan|validate|fmt|show|output|graph)\b", infra) and re.search(r"\b(tofu|terraform)\s+", infra):
        print(json.dumps(ALLOW))
        sys.exit(0)

    # --- Kubernetes read path (exit before UNSAFE_CHECKS) ---------------------
    # ``kubectl get/describe/…`` is the bread and butter of debugging; allow list
    # must stay conservative—anything that can exec into pods or mutate is listed
    # in the negated second regex.
    if re.match(r"^kubectl\s+", infra):
        if re.search(
            r"\b(get|describe|logs?|explain|api-resources|api-versions|top|wait|auth\s+can-i|version|cluster-info|config\s+view|config\s+get-contexts|config\s+current-context|completion|proxy)\b",
            infra,
        ) and not re.search(
            r"\b(apply|delete|replace|patch|exec|attach|cp|port-forward|rollout|scale|set|drain|cordon|uncordon|taint|label|annotate|adm|create|run|edit)\b",
            infra,
        ):
            print(json.dumps(ALLOW))
            sys.exit(0)

    # --- Kubernetes mutations -------------------------------------------------
    if re.search(r"^kubectl\s+", infra) and re.search(
        r"\b(apply|delete|replace|patch|exec|attach|cp|port-forward|rollout|scale|set|drain|cordon|uncordon|taint|label|annotate|adm|create|run|edit)\b",
        infra,
    ):
        ask(
            "Kubernetes cluster mutation.",
            (
                "Homelab hook: kubectl command may mutate cluster state. Confirm with the operator "
                "before proceeding, or use manifest edits + GitOps flow instead."
            ),
        )

    # --- Flux (cluster-facing; not ``flux build`` which is local compile) -----
    if re.search(r"^flux\s+", infra) and re.search(r"\b(reconcile|suspend|resume|delete|install)\b", infra):
        ask(
            "Flux reconciliation change.",
            "Homelab hook: flux command may affect GitOps reconciliation. Confirm operator approval.",
        )

    # --- Helm releases --------------------------------------------------------
    if re.search(r"^helm\s+", infra) and re.search(r"\b(upgrade|install|uninstall|rollback|test)\b", infra):
        ask(
            "Helm release change.",
            "Homelab hook: helm may mutate cluster releases. Confirm operator approval.",
        )

    # --- Talos node lifecycle -------------------------------------------------
    # Only verbs that change machine config or reboot—``talosctl get`` stays allow.
    if re.search(r"^talosctl\s+", infra) and re.search(
        r"\b(apply-config|bootstrap|patch|reboot|reset|shutdown|upgrade|image|rollback)\b",
        infra,
    ):
        ask(
            "Talos node/bootstrap change.",
            "Homelab hook: talosctl may mutate Talos machine state. Confirm operator approval.",
        )

    # --- OpenTofu / Terraform apply -------------------------------------------
    if re.search(r"^(tofu|terraform)\s+apply\b", infra):
        ask(
            "Infrastructure apply (tofu/terraform).",
            "Homelab hook: tofu/terraform apply can mutate infrastructure. Confirm operator approval.",
        )

    # --- Broad shell risk (network, disk, sudo, git, …) -----------------------
    for pattern, user_msg, agent_msg in UNSAFE_CHECKS:
        if pattern.search(cmd):
            ask(user_msg, agent_msg)

    print(json.dumps(ALLOW))
    sys.exit(0)


if __name__ == "__main__":
    main()
