# Traps

Front-loaded mistakes this lab keeps making agents repeat. Read before
non-trivial work.

## GitOps / Flux

- Local edits do nothing until applied or pushed. Flux will not see unpushed
  commits. The usual loop here is: edit → validate → apply to observe → operator
  commits when happy.
- Do not fight Flux. A direct apply that differs from Git is temporary — the
  next reconciliation reasserts repository state. Commit and push validated
  desired state before expecting it to persist.
- Suspending only a child Kustomization may not hold: a parent that manages
  that object can restore it and reapply Git. Preserve uncommitted desired
  state via commit/push, not repeated apply/suspend.
- Do not put resource limits, image tags, or volume sizes in README prose;
  they drift. Manifests win.
- Bootstrap and CRD order under `flux/manifests/01-bootstrap/` is sacred.

## Charts and apps

- `helm/generic-app` is shared. A silent change breaks many workloads.
- New apps usually follow [`helm-deployment`](../skills/helm-deployment/SKILL.md).
- MCP servers under AI apps follow [`mcp-deployment`](../skills/mcp-deployment/SKILL.md).

## Storage and databases

- Longhorn vs SMB vs CNPG have different restore paths. Pick the skill that
  matches the failure mode; do not invent a hybrid.
- CNPG instance PVCs are not `generic-app` `storage.longhorn.volumes`. See the
  CNPG logical restore skill.

## kubectl / allowlists

- Prefer `kubectl get …` / `kubectl describe …` with the resource verb
  immediately after `kubectl`. Putting `-n` first can trip local allowlists and
  demand unnecessary approvals.

## Agent context

- Skills and personas live under `.agents/`. `.cursor/` and `.claude/` hold
  discovery symlinks for those harnesses; edit the `.agents/` copy.
- Leave `<!-- drift: … -->` notes if you spot stale context links and cannot fix them now.

## Worktrees / parallel agents

- Agents edit under `.worktrees/<type>/<slug>`, not the workspace root. See
  [`worktrees.md`](../rules/worktrees.md). Root checkout fights are how you get
  dirty indexes and "already checked out" errors.
- Git allows one checkout per branch. Always create with `-b type/slug`; never
  reuse the branch the human has checked out in root.
- After merge, `git worktree remove` — never `rm -rf` a worktree path.
