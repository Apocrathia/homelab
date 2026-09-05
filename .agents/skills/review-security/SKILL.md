---
name: review-security
description: >-
  Read-only security lens for a branch diff, uncommitted changes, or named
  Artifact. Use when review-loop spawns the security pass, or when asked for a
  security review, threat check, or vuln scan on a diff (without named CLIs).
disable-model-invocation: true
---

# Review security

Read-only lens: security and abuse risk in the Artifact. Return `pass` or
numbered findings. Do not edit files, commit, push, or invoke named review CLIs.

Called by [`review-loop`](../review-loop/SKILL.md) or standalone. Isolation uses
**task folders** when the parent needs a sandbox; do not require worktrees.

Judge proportionately: severity matches actual exploitability and blast
radius, not CVE hype. Prefer enablement over gatekeeping. When the project
has [`.agents/rules/security.md`](../../rules/security.md) (or
an equivalent charter), load it.

## Soft model slot

**Mid, security-weighted.** Prefer a model slot tuned for security reasoning,
distinct from the correctness and fit lenses. Do not default-inherit the parent
model when the harness exposes a separate slot.

## Persona

Load [`.agents/agents/reviewer/agent.md`](../../agents/reviewer/agent.md) when present.

**Fallback (inline):** Judge only. Ground each finding in reachable code paths
and data the Artifact can access. Severity matches actual exploitability and
blast radius, not CVE hype. No edits, no fixes, no self-grade.

## Bar

**Security:** no actionable security defects in scope. Actionable means a
concrete weakness an attacker or abusive user could plausibly reach: broken
authn/authz, injection, unsafe deserialization, secret exposure, SSRF, path
traversal, trust-boundary violations, crypto misuse, or unsafe defaults on
security-sensitive surfaces touched by the diff.

Out of scope: correctness-only bugs (see `review-correctness`), design fit
(see `review-fit`), dependency bumps without a linked vuln in changed usage,
and pre-existing issues untouched by the Artifact.

## Artifact

Parent or operator supplies:

| Field      | Meaning                                                      |
| ---------- | ------------------------------------------------------------ |
| Repository | Absolute repo root                                           |
| Scope      | Branch diff (default), uncommitted only, or named paths      |
| Base       | Merge base branch when scope is branch diff                  |
| Slice      | Optional label (e.g. `review-loop/2`) for fresh Task context |

Read the diff and cited files. Trace trust boundaries: who can trigger the
code, with what input, and what data or privileges are at stake.

## What to judge

- Authn/authz gaps on new or changed endpoints, handlers, or jobs
- Injection (SQL, command, template, prompt) and unsafe interpolation
- Secrets, tokens, or PII in logs, errors, client payloads, or repo files
- SSRF, open redirects, and unsafe URL or path handling
- Deserialization, pickle/eval, and dynamic code execution on untrusted input
- Missing validation on security-sensitive inputs the diff introduces
- Crypto: weak algorithms, static IVs, homegrown schemes, key material handling
- Least privilege: new permissions, broad IAM, or cross-tenant data access

## Task prompt (when parent spawns)

Use the contract in [`.agents/rules/subagents.md`](../../rules/subagents.md):

```text
Slice: <slice or review-security>
Role: reviewer
Goal: Judge the Artifact against the security Bar. Return findings only.
Bar: security; no actionable security defects in scope
Artifact: <repository>; scope <branch diff | uncommitted | named paths>
Repository: <absolute path>
Worktree: <absolute worktree path>
Scope: <branch diff against base | uncommitted | paths>
Base: <base branch if branch diff>
Task folder: <absolute task folder path when parent binds one>
Report path: <task-folder>/iter-<N>-security.md

Constraints:
- Read-only. Do not edit files (except writing the named report).
- Do not run named review CLIs.
- Load persona from .agents/agents/reviewer/agent.md when present.
- Proportionate, evidence-based findings (load security-values when present).
- Write the full report to Report path; return short status + report_path.
- Redact secrets/PII in findings, reports, and chat (see Return).

Return (short):
## Security
result: pass | gap
report_path: <absolute path>
findings: numbered list (path, line/area, severity, summary)  # full body in report
errors: … (if blocked)
```

## Return

Write the long report to the parent-named task-folder path
(`iter-<N>-security.md` when following review-loop). Return a short status plus
`report_path`; do not paste the full report into chat.

**Pass:** `result: pass`, `report_path`, and a one-line confirmation.

**Gap:** numbered findings in the report. Each finding includes:

1. **Path** and **line/area**
2. **Severity:** critical | high | medium | low
3. **Summary:** one line
4. **Full body:** threat, reachable path, impact, and proportionate fix hint

**Secrets / PII:** cite with redaction only: path, line, secret class (e.g.
API key, password, token, email), and a short fingerprint prefix (first few
chars). Never paste full tokens, passwords, private keys, or raw PII into
findings, task-folder reports, or chat.

Parent triages valid / wrong / unsure. This lens does not fix or re-run itself.

## Do not

- Edit, format, or commit in this skill
- Invoke named review CLIs or substitute them for reading the Artifact
- File correctness or architecture findings (other lenses own those Bars)
- Require worktrees; task folders are enough when isolation is needed
- Echo full secret or PII values into findings, reports, or chat
