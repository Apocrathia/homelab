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
   not only a generic ``sudo`` hit from ``UNSAFE_SHELL``.
2. Read-only kubectl exits **before** the broad ``UNSAFE_SHELL`` regex, so
   ``sudo kubectl get …`` allows without a redundant sudo prompt.
3. ``UNSAFE_SHELL`` runs on the **original** command string so we still see
   ``sudo`` when it is load-bearing (e.g. ``sudo curl``).
"""

from __future__ import annotations

import json
import re
import sys

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


def ask(user: str, agent: str) -> None:
    """Emit ask + exit 0; non-zero exits are fail-open unless failClosed."""
    print(
        json.dumps(
            {
                "permission": "ask",
                "user_message": user,
                # Docs say both are surfaced; several Cursor builds ignore them in the
                # approval sheet anyway — still emit for when the client fixes this.
                "agent_message": f"{user}\n\n{agent}",
            }
        ),
        flush=True,
    )
    # Approval UI often omits hook messages (known product gap). Stderr is copied to
    # the Hooks output channel so operators can read the rationale there.
    print(f"[homelab-shell-guard] {user}", file=sys.stderr, flush=True)
    sys.exit(0)


# --- Broad unsafe patterns (see hooks README) -------------------------------
# Single compiled regex for speed: every shell command hits this hook (no matcher
# in hooks.json), so we want one scan, not a chain of dozens of separate passes.
# (?ix) = case-insensitive, verbose (whitespace ignored in pattern—here we still
# concatenate fragments for readability).
#
# Intentionally **not** matched: generic ``docker ps`` / ``git pull`` / ``npm install``
# (too noisy or ambiguous); extend this regex when your workflow needs more coverage.
UNSAFE_SHELL = re.compile(
    r"(?ix)"
    # Exfil / supply chain: fetch arbitrary bytes or run downloaders.
    r"\bcurl\b|\bwget\b|\baria2c\b|"
    # Remote execution or bulk copy off-box.
    r"\bssh\b|\bscp\b|\brsync\b|\bsftp\b|"
    # Local destructive / permission changes. ``\brm\b`` does not match ``chmod``
    # (no standalone ``rm`` token inside ``chmod``).
    r"\brm\b|\bmv\b|\bchmod\b|\bchown\b|\bdd\b|"
    # Classic bind-shell helpers; require nc/ncat/netcat followed by space or EOS
    # to reduce junk matches inside longer tokens.
    r"\b(nc|ncat|netcat)(\s|$)|"
    # Privilege boundary—almost always worth a human glance in agent context.
    r"\bsudo\b|"
    # Container mutations (subset: day-to-day dangerous verbs only).
    r"\bdocker(\s+compose)?\s+(up|down|run|exec|rm|rmi|stop|kill|pull|push|prune|build)\b|"
    r"\bpodman\s+(up|down|run|exec|rm|stop|kill|pull|push|prune|build)\b|"
    # Obfuscation / indirect execution.
    r"\beval\s|"
    # Git: align with repo AGENTS (no agent commits); push/merge/rebase/clean are
    # high blast-radius even when the human intends them.
    r"\b(git|gh)\s+push\b|\bgit\s+(commit|reset|merge|rebase|clean)\b|\bgit\s+stash\s+(pop|apply)\b"
)


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

    lower = cmd.lower()
    # Infra classification uses ``infra``; broad unsafe uses full ``cmd``/``lower``
    # as described in the module docstring.
    infra = strip_leading_sudo(lower)

    # --- Safe planning paths (tofu/terraform) ---------------------------------
    # Dry-run and read-only plan operations should not nag—operators use these
    # constantly in GitOps review.
    if re.search(r"--dry-run|dry-run=(client|server)", infra):
        print(json.dumps(ALLOW))
        sys.exit(0)
    if re.search(r"\b(plan|validate|fmt|show|output|graph)\b", infra) and re.search(r"\b(tofu|terraform)\s+", infra):
        print(json.dumps(ALLOW))
        sys.exit(0)

    # --- Kubernetes read path (exit before UNSAFE_SHELL) ----------------------
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
            "This shell command may change the Kubernetes cluster. Approve only if you intend to run it.",
            (
                "Homelab hook: kubectl command may mutate cluster state. Confirm with the operator "
                "before proceeding, or use manifest edits + GitOps flow instead."
            ),
        )

    # --- Flux (cluster-facing; not ``flux build`` which is local compile) -----
    if re.search(r"^flux\s+", infra) and re.search(r"\b(reconcile|suspend|resume|delete|install)\b", infra):
        ask(
            "This flux command may change reconciliation or cluster state. Approve if intentional.",
            "Homelab hook: flux command may affect GitOps reconciliation. Confirm operator approval.",
        )

    # --- Helm releases --------------------------------------------------------
    if re.search(r"^helm\s+", infra) and re.search(r"\b(upgrade|install|uninstall|rollback|test)\b", infra):
        ask(
            "This helm command may change releases on the cluster. Approve if intentional.",
            "Homelab hook: helm may mutate cluster releases. Confirm operator approval.",
        )

    # --- Talos node lifecycle -------------------------------------------------
    # Only verbs that change machine config or reboot—``talosctl get`` stays allow.
    if re.search(r"^talosctl\s+", infra) and re.search(
        r"\b(apply-config|bootstrap|patch|reboot|reset|shutdown|upgrade|image|rollback)\b",
        infra,
    ):
        ask(
            "This talosctl command may change Talos nodes or bootstrap state. Approve if intentional.",
            "Homelab hook: talosctl may mutate Talos machine state. Confirm operator approval.",
        )

    # --- OpenTofu / Terraform apply -------------------------------------------
    if re.search(r"^(tofu|terraform)\s+apply\b", infra):
        ask(
            "Infrastructure apply may change real resources. Approve if intentional.",
            "Homelab hook: tofu/terraform apply can mutate infrastructure. Confirm operator approval.",
        )

    # --- Broad shell risk (network, disk, sudo, git, …) -----------------------
    # Uses ``cmd`` (not ``infra``) so ``sudo`` still triggers when the rest of the
    # line was already allow-listed via kubectl read path above.
    if UNSAFE_SHELL.search(cmd):
        ask(
            "This shell command looks like network fetch, remote access, privilege escalation, "
            "destructive filesystem work, container changes, or a sensitive git operation. "
            "Approve only if you intend to run it.",
            (
                "Homelab hook: command matched risky shell patterns (e.g. curl/wget, ssh, rm, sudo, "
                "docker/podman mutations, git push/commit/reset). Confirm operator approval."
            ),
        )

    print(json.dumps(ALLOW))
    sys.exit(0)


if __name__ == "__main__":
    main()
