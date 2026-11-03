---
name: integrate-upstream
description: >-
  Pull changes from the shared agent core into a consuming project's existing
  .agents/ tree — diff shared rules, skills, and scripts, reconcile layer 1 and
  2 changes, and preserve project-specific content. Use when the user says sync
  upstream, integrate upstream changes, pull updates from the core, or update
  .agents/ from the shared core.
disable-model-invocation: true
---

# Integrate upstream

A consuming project has `.agents/` built from this core. The core evolves — new
rules, improved skills, better scripts, new templates. This skill pulls those
upstream changes in while preserving the project's domain-specific content
(layer 3).

Three layers, same as
the inventory (`.agents/context/inventory.md` in the core repo):

| Layer                | What                                          | How this skill handles it                               |
| -------------------- | --------------------------------------------- | ------------------------------------------------------- |
| 1 — Generic          | Rules, byte-identical skills, scripts         | Direct diff; copy or reconcile                          |
| 2 — Templatized      | Skills with `{{project_name}}` tokens         | Diff after token normalization; reconcile               |
| 3 — Project-specific | Context modules, agent personas, routing rows | **Do not overwrite.** Check templates structurally only |

See the adoption guide (`.agents/context/adoption-guide.md` in the core repo) for the
manual procedure this skill automates.

## When to run

- The operator says sync upstream, update from the core, pull shared-core
  changes, or integrate upstream.
- After the core ships a new release or a consuming project wants to align.
- Before a `reconcile-context` pass when the project's shared files may be stale
  against the core.

## What you need from the operator

- **Upstream core path** — local clone, git remote URL, or submodule path. If a
  local clone, give the absolute path. If a remote, the skill clones to a temp
  directory. If a submodule, the path under the consuming repo.
- **Project name** — used to normalize `{{project_name}}` tokens in templatized
  skills. If the operator does not provide it, derive it from the consuming
  project's `AGENTS.md` title or ask.

Work in a git worktree on the standard branch (see
[Branch and MR naming](#branch-and-mr-naming) below).
See [`.agents/rules/worktrees.md`](../../rules/worktrees.md). All
`.agents/**` paths are protected — surface the full change set before writing
(see [`.agents/rules/protected-paths.md`](../../rules/protected-paths.md)).

## Branch and MR naming

Every core integration — first-time scaffold or later sync — uses the
same branch pattern and the same MR title, so the work is greppable across
repos:

| Thing    | Value                                   |
| -------- | --------------------------------------- |
| Branch   | `chore/sync-agent-core-<YYYYMMDDHHMM>`  |
| MR title | `chore(agents): sync shared agent core` |

The title is the constant — that is what makes integrations findable. The UTC
timestamp is what stops a new integration from landing on a name some earlier
integration already used: `gh pr view` resolves such a branch to the old merged
PR, and `ship-work` then skips creating the new one — silently, which is why
the suffix is not optional. If two integrations somehow start in the same
minute, `git worktree add -b` refuses the duplicate branch; bump the timestamp
and rerun.

Derive the timestamp, do not copy it:

```bash
branch="chore/sync-agent-core-$(date -u +%Y%m%d%H%M)"   # e.g. chore/sync-agent-core-202608071432
```

One token, not `-2026-08-07-14-32` — the slug caps at 4 kebab words and
`sync-agent-core` already uses 3 (see `agent-branch-naming`).

## Workflow

Copy this checklist and work it in order:

```
- [ ] 1. Locate and load the upstream core
- [ ] 2. Inventory the consuming project's .agents/
- [ ] 3. Categorize files by layer
- [ ] 4. Diff each layer (with token normalization for layer 2)
- [ ] 5. Categorize changes (added, modified, removed, unchanged)
- [ ] 6. Reconcile modified files (3-way: upstream vs local vs project delta)
- [ ] 7. Surface the change set for operator confirmation
- [ ] 8. Apply changes after confirmation
- [ ] 9. Run the link check
- [ ] 10. Report
```

### 1. Locate and load the upstream core

Resolve the upstream core to a local directory you can read:

```bash
# Local clone — use as-is
upstream="/abs/path/to/agent-core"

# Git remote — unique dir under the consumer .scratch/ (not /tmp).
# $$ is reused across retries in the same shell, so mktemp the suffix.
consumer_root="$(git rev-parse --show-toplevel)"
mkdir -p "$consumer_root/.scratch"
upstream=$(mktemp -d "$consumer_root/.scratch/upstream-core.XXXXXX") || {
  echo "could not create scratch clone dir — stop" >&2
  exit 1
}
git clone <remote-url> "$upstream"
# Clone full history (not --depth 1) so step 6 can diff old vs new upstream revisions.

# Submodule — use the submodule path
upstream="<repo-root>/<submodule-path>"
```

Verify the upstream is this core by checking for `rules/`, `skills/`, and
`templates/` directories at the top level. If the structure does not match, stop
and ask the operator — it may be the wrong repo.

Record the **canonical** upstream revision for the 3-way merge in
step 6. Fetch and pin the canonical remote's `main`
(the canonical core repo the operator named), not whatever branch the local
clone happens to have checked out. A fork's `origin/main` can be
stale. A clean feature branch is not a release tip. `git fetch`
updates the remote-tracking ref only. Do **not** fast-forward a
supplied submodule or clone: analyze and copy from `$upstream_rev`
via `git show`, `git archive`, or a detached worktree.

```bash
canonical_repo="<owner>/<repo>"  # the operator names the canonical core repo per lap; do not guess or hardcode it
canonical_lc=$(printf '%s' "$canonical_repo" | tr '[:upper:]' '[:lower:]')
canonical_remote=""
fallback=""
while IFS= read -r remote; do
  [ -n "$remote" ] || continue
  url=$(git -C "$upstream" remote get-url "$remote")
  dest=$(printf '%s\n' "$url" | sed -E 's#^(git@|https://|ssh://git@)(ssh\.)?github\.com(:[0-9]+)?[:/]([^/]+/[^/.]+)(\.git)?$#\4#')
  dest=${dest%.git}
  dest_lc=$(printf '%s' "$dest" | tr '[:upper:]' '[:lower:]')
  if [ "$dest_lc" = "$canonical_lc" ]; then
    if [ "$remote" = upstream ]; then
      canonical_remote=$remote
      break
    fi
    [ -z "$fallback" ] && fallback=$remote
  fi
done < <(git -C "$upstream" remote)
canonical_remote=${canonical_remote:-$fallback}
if [ -z "$canonical_remote" ]; then
  echo "no remote points at $canonical_repo — stop" >&2
  exit 1
fi
git -C "$upstream" fetch "$canonical_remote" main || {
  echo "could not fetch $canonical_remote/main — stop; integrations pin the canonical tip" >&2
  exit 1
}
upstream_rev=$(git -C "$upstream" rev-parse "$canonical_remote/main") || {
  echo "could not resolve $canonical_remote/main — stop" >&2
  exit 1
}
# Do not move the supplied checkout. A submodule gitlink would dirty
# the consumer even if the operator later declines. Copy from
# $upstream_rev (git show / archive / detached worktree). A feature
# branch checkout is fine: inventory, diffs, copies, and the pin all
# use $upstream_rev, not HEAD.
echo "Upstream revision: $upstream_rev"
```

`$upstream_rev` is captured for the step-6 3-way. It is the pin only if
every file you later copy still comes from that object. At apply time
(step 8), copy from `$upstream_rev` (`git show` / archive / detached
worktree), not from `HEAD`. A behind submodule checkout is expected;
do not move it. If the local clone or submodule is dirty on shared
paths (`rules/`, `skills/`, `templates/`, `AGENTS.md`, `README.md`),
do not copy working-tree files. Dirtiness does not change `$upstream_rev`;
continue with object reads and still pin that SHA after a successful apply.

```bash
if ! status=$(git -C "$upstream" status --porcelain -- rules skills templates AGENTS.md README.md); then
  echo "git status failed — cannot tell if shared paths are clean; copy from $upstream_rev, not the working tree" >&2
elif [ -n "$status" ]; then
  echo "upstream shared paths are dirty — copy from $upstream_rev, not the working tree" >&2
  echo "diff and copy via a detached worktree or git archive at $upstream_rev" >&2
fi
```

A dirty tree is not a license to skip the pin. Stop and ask if you cannot
produce a tree that matches `$upstream_rev`.

Also determine the **baseline revision** — the upstream revision the consuming
project was last synced from:

1. If `.agents/upstream-ref` exists, read JSON `sha` and verify it is an object
   in `$upstream`. If only `version` is present, use tag `v${version}`.
2. If not recorded, ask the operator.
3. If the baseline still cannot be determined, **stop**. Do not 2-way.
   A consumer-vs-HEAD diff cannot tell a local customization from stale
   core text. Ask for the SHA.

```bash
# Map consumer bookkeeping → upstream commit-ish. Never pass a consumer SHA
# to git -C "$upstream". Fetch first: cat-file -e only sees local objects.
agents_dir="$(git rev-parse --show-toplevel)/.agents"
while IFS= read -r remote; do
  [ -n "$remote" ] || continue
  git -C "$upstream" fetch "$remote" --prune 2>/dev/null || true
done < <(git -C "$upstream" remote)
baseline_rev=""
ref="$agents_dir/upstream-ref"
if [ -f "$ref" ]; then
  pin_sha=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("sha") or "")' "$ref")
  pin_ver=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("version") or "")' "$ref")
  if [ -n "$pin_sha" ] && ! git -C "$upstream" cat-file -e "${pin_sha}^{commit}" 2>/dev/null; then
    while IFS= read -r remote; do
      [ -n "$remote" ] || continue
      git -C "$upstream" fetch "$remote" "$pin_sha" 2>/dev/null || true
      git -C "$upstream" cat-file -e "${pin_sha}^{commit}" 2>/dev/null && break
    done < <(git -C "$upstream" remote)
  fi
  if [ -n "$pin_sha" ] && git -C "$upstream" cat-file -e "${pin_sha}^{commit}" 2>/dev/null; then
    baseline_rev=$pin_sha
  elif [ -n "$pin_ver" ]; then
    if ! git -C "$upstream" rev-parse --verify "v${pin_ver}^{commit}" >/dev/null 2>&1; then
      while IFS= read -r remote; do
        [ -n "$remote" ] || continue
        git -C "$upstream" fetch "$remote" tag "v${pin_ver}" 2>/dev/null || true
        git -C "$upstream" rev-parse --verify "v${pin_ver}^{commit}" >/dev/null 2>&1 && break
      done < <(git -C "$upstream" remote)
    fi
    baseline_rev=$(git -C "$upstream" rev-parse --verify "v${pin_ver}^{commit}" 2>/dev/null || true)
  fi
fi
if [ -z "$baseline_rev" ]; then
  echo "No verifiable core baseline — ask for a SHA or tag; do not 2-way" >&2
  exit 1
fi
```

An object that exists in `$upstream` is not enough. A pin from a feature
branch, fork, or rewritten history can resolve and still be the wrong
common side. After `$baseline_rev` and `$upstream_rev` are both known
commits, require ancestry before step 6:

```bash
if [ -z "$baseline_rev" ] || [ -z "$upstream_rev" ]; then
  echo "baseline or upstream revision is unset — do not 3-way on a guessed ancestor" >&2
  exit 1
fi
if ! git -C "$upstream" merge-base --is-ancestor "$baseline_rev" "$upstream_rev"; then
  echo "baseline $baseline_rev is not an ancestor of $upstream_rev — correct the pin; do not 3-way" >&2
  exit 1
fi
```

After a successful apply (step 8) **and** a passing link check (step 9),
write `.agents/upstream-ref` with `$upstream_rev` (the step-1 capture)
after every copied file came from that revision. Skip it if any
selected layer-1/2 update was declined.

### 2. Inventory the consuming project's .agents/

Map what the consuming project has:

```bash
agents_dir="$(git rev-parse --show-toplevel)/.agents"
find "$agents_dir/rules" -name '*.md' 2>/dev/null | sort
find "$agents_dir/skills" -name 'SKILL.md' 2>/dev/null | sort
# Recurse the consumer skill tree so leftover auxiliaries
# (references/*.md, prototype/LOGIC.md, ...) are inventoried even
# after upstream dropped them.
find "$agents_dir/skills" -type f ! -name 'SKILL.md' ! -name '*.pyc' ! -path '*/__pycache__/*' 2>/dev/null | sort
find "$agents_dir/context" -name '*.md' 2>/dev/null | sort
find "$agents_dir/references" -type f 2>/dev/null | sort
find "$agents_dir/agents" -name '*.md' 2>/dev/null | sort
ls "$agents_dir/mcp.json" 2>/dev/null
```

Record the full file list, including agent personas (`.agents/agents/`).
Also read the consuming project's `AGENTS.md` title to derive the project name
for token normalization (step 3). Check that the consumer has personas for every
role the shared skills invoke (`/implementer`, `/reviewer`, `/verifier`,
`/project-manager`, `/project-explorer`, `/doc-writer`, `/context-steward`).

### 3. Categorize files by layer

Discover upstream files dynamically from `$upstream_rev` — do not hardcode
skill names and do not walk the working tree. A behind submodule or clone
is expected; `ls-tree` / `git show` against the pin see files that exist
only at the tip.

```bash
agents_dir="$(git rev-parse --show-toplevel)/.agents"
# Rules: pinned tip plus consumer leftovers that existed at the pin.
# Walk $upstream_rev, not the working tree — a behind checkout is expected.
if ! rules=$(git -C "$upstream" ls-tree -r --name-only "$upstream_rev" -- rules); then
  echo "upstream rule inventory failed — stop" >&2
  exit 1
fi
while IFS= read -r rel; do
  [ -z "$rel" ] && continue
  case "$rel" in
    *.md) echo "rule:$(basename "$rel")" ;;
  esac
done <<< "$rules"
for f in "$agents_dir"/rules/*.md; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  git -C "$upstream" cat-file -e "${upstream_rev}:rules/$name" 2>/dev/null && continue
  if git -C "$upstream" cat-file -e "${baseline_rev}:rules/$name" 2>/dev/null; then
    echo "removed-upstream:rule:$name"
  fi
done

# Skills: discover layer per skill. Templatized skills use {{project_name}}
# tokens that may appear in frontmatter or body. Use the scaffold's explicit
# classification rather than grep, which misclassifies skills that mention
# {{project_name}} in documentation.
# Recurse each skill dir so auxiliary files (scripts/*, references/*.md,
# prototype/LOGIC.md, ...) are inventoried too. SKILL.md stays the layer
# classifier; everything else under the skill is a layer-1 file pair.
# Live list from $upstream_rev:AGENTS.md, not a stale working-tree copy.
templatized_skills=$(git -C "$upstream" show "$upstream_rev:AGENTS.md" | python3 -c '
import re, sys
text = sys.stdin.read()
m = re.search(r"skills with `?\{\{project_name\}\}`? tokens \(([^)]+)\)", text)
print(" ".join(p.strip() for p in m.group(1).split(","))) if m else sys.exit(1)
') || {
  echo "could not read templatized-skill list from $upstream_rev:AGENTS.md — stop" >&2
  exit 1
}
# Layer 4: PI-internal visual skills. Opt-in only, and never byte-identical --
# each is a directory of scripts, rules and assets, not a lone SKILL.md.
# Absent locally → optional (skip). Present locally → optional-present (diff
# the whole directory; the opt-in has already happened).
optional_skills="prime-visual prime-slides render-prime-chart assess-chart"
# $agents_dir comes from step 2. Unset, the -d test below is silently false and
# every visual skill looks unadopted -- which is the misclassification this
# distinction exists to prevent, so fail loudly instead.
: "${agents_dir:?set agents_dir in step 2 before classifying}"
if ! skills=$(git -C "$upstream" ls-tree -d --name-only "$upstream_rev:skills"); then
  echo "skill inventory failed — stop" >&2
  exit 1
fi
while IFS= read -r name; do
  [ -n "$name" ] || continue
  git -C "$upstream" cat-file -e "$upstream_rev:skills/$name/SKILL.md" 2>/dev/null || continue
  if echo " $templatized_skills " | grep -q " $name "; then
    echo "templatized:$name"
  elif echo " $optional_skills " | grep -q " $name "; then
    if [ -d "$agents_dir/skills/$name" ]; then
      echo "optional-present:$name"
    else
      echo "optional:$name"
    fi
  else
    echo "byte-identical:$name"
  fi
  if ! aux=$(git -C "$upstream" ls-tree -r --name-only "$upstream_rev" -- "skills/$name"); then
    echo "skill inventory failed — stop" >&2
    exit 1
  fi
  printf '%s\n' "$aux" | grep -vE '/SKILL.md$|__pycache__/|\.pyc$' || true
  # Consumer remnants: leftover auxiliaries after upstream deletion.
  # Tip ls-tree only sees current core files; a leftover
  # references/*.md or prototype/LOGIC.md still has to classify as
  # removed-upstream.
  consumer_skill="$agents_dir/skills/$name"
  if [ -d "$consumer_skill" ]; then
    # Only leftover files that existed at the pin are removed-upstream.
    # A helper the consumer added after the pin never existed in core.
    while IFS= read -r rel; do
      [ -z "$rel" ] && continue
      git -C "$upstream" cat-file -e "${upstream_rev}:$rel" 2>/dev/null && continue
      git -C "$upstream" cat-file -e "${baseline_rev}:$rel" 2>/dev/null || continue
      printf 'removed-upstream:%s\n' "$rel"
    done < <(
      find "$consumer_skill" -type f ! -name 'SKILL.md' ! -name '*.pyc' ! -path '*/__pycache__/*' 2>/dev/null \
        | sed "s|^$consumer_skill/|skills/$name/|"
    )
  fi
done <<< "$skills"
# Whole skills removed upstream never enter the loop above. Union
# consumer names with the baseline/pinned-tip inventory so a deleted
# shared skill is removed-upstream, not project-specific.
for d in "$agents_dir"/skills/*/; do
  name=$(basename "$d")
  git -C "$upstream" cat-file -e "$upstream_rev:skills/$name/SKILL.md" 2>/dev/null && continue
  if git -C "$upstream" cat-file -e "${baseline_rev}:skills/$name/SKILL.md" 2>/dev/null; then
    echo "removed-upstream:$name"
    while IFS= read -r rel; do
      [ -z "$rel" ] && continue
      git -C "$upstream" cat-file -e "${baseline_rev}:$rel" 2>/dev/null || continue
      printf 'removed-upstream:%s\n' "$rel"
    done < <(
      find "$d" -type f ! -name '*.pyc' ! -path '*/__pycache__/*' 2>/dev/null \
        | sed "s|^$d|skills/$name/|"
    )
  fi
done
```

Categorize each file:

| Layer                       | Upstream source                                                     | Consume                                | Action                                                                                           |
| --------------------------- | ------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1 — Generic rules           | `rules/*.md`                                                        | `.agents/rules/*.md`                   | Direct diff                                                                                      |
| 1 — Byte-identical skills   | `skills/<name>/SKILL.md` (no `{{project_name}}`)                    | `.agents/skills/<name>/SKILL.md`       | Direct diff                                                                                      |
| 1 — Skill auxiliaries       | `skills/<name>/**` except `SKILL.md`                                | `.agents/skills/<name>/**`             | Direct diff (even when the skill itself is templatized)                                          |
| 2 — Templatized skills      | `skills/<name>/SKILL.md` (has `{{project_name}}`)                   | `.agents/skills/<name>/SKILL.md`       | Diff after replacing `{{project_name}}` in the upstream with the project name                    |
| 3 — Context templates       | `templates/context/*.tmpl`                                          | `.agents/context/*.md`                 | **Structural check only** — do not overwrite                                                     |
| 3 — Root templates          | `templates/AGENTS.md.tmpl`, `templates/agents-README.md.tmpl`, etc. | `AGENTS.md`, `.agents/README.md`, etc. | **Structural check only**                                                                        |
| 3 — Agent persona templates | `templates/agents/*.tmpl`                                           | `.agents/agents/*.md`                  | **Structural check only** — verify consuming project has personas for roles shared skills invoke |
| 3 — Reference templates     | `templates/references/*`                                            | `.agents/references/*`                 | **Structural check only**                                                                        |
| 4 — Optional visual skills  | `skills/<name>/` (whole directory)                                  | `.agents/skills/<name>/`               | **Opt-in only** — skip if absent; if present locally, diff the whole directory as layer 1        |

Project-specific files in the consuming project that have no upstream
counterpart (e.g. `rules/security.md`, `skills/helm-deployment/`, agent
personas, or a helper under a shared skill that never existed at
`$baseline_rev`) are layer 3. Leave them alone.

**Layer 4 — the visual skills.** `prime-visual`, `prime-slides`,
`render-prime-chart` and `assess-chart` are PI-internal and produce branded
output. They are not part of a sync:

- **Never copy them because they are new upstream.** A project that never
  asked for branded charts should not acquire four skills and a font
  dependency from a routine `integrate-upstream` run. Surface them as
  available and move on; copy only if the project says yes.
- **Never copy `SKILL.md` alone.** Unlike every layer-1 skill, these are
  directories — `scripts/`, `rules/`, `assets/`, `examples/`. A `SKILL.md`
  without them documents scripts that are not there. Copy the whole
  directory.
- **Never copy them into a public repository.** They reference a
  commercially licensed font family; see `assets/README.md` upstream. If the
  project is public, stop and say so.
- **The fonts are a separate step.** They are vendored once upstream at
  `assets/fonts/` and installed per skill. A copied skill with no fonts
  fails at render time with an actionable message, but it fails. See the
  install snippet in the upstream `scaffold-guide.md`.

If a project already has one of these skills, discovery emits
`optional-present:` and you diff the whole directory as layer 1 — the
opt-in has already happened. Do not reclassify as `byte-identical`: that
path only compares `SKILL.md`.

### 4. Diff each layer

Diff against `$upstream_rev`, not the files on disk under `$upstream`. A
behind submodule or clone can match the consumer by coincidence and hide
real upstream changes. Step 6 only reconciles files this step marks
modified, so a working-tree miss never reaches the 3-way.

For each file pair (upstream at `$upstream_rev`, local):

- **Layer 1 (generic, including skill auxiliaries):**
  `git -C "$upstream" show "$upstream_rev":<file>` vs the consumer file — any
  difference is a real change.
- **Layer 2 (templatized):** Replace `{{project_name}}` in the
  **`$upstream_rev`** version with the project name, then diff. If the only
  differences are the project name substitution, the skill is aligned — skip
  it. If there are other differences, those are real upstream changes.
- **Layer 3 (templates):** Do not diff content. Check structurally against
  `$upstream_rev`: does the consuming project's context module cover the same
  function as the template at that revision? If the template added a new
  section, surface it as a structural suggestion.
- **Layer 4 (`optional-present:`):** Recursively pair every file under
  `skills/<name>/` at `$upstream_rev` (`git ls-tree -r "$upstream_rev:skills/<name>"`)
  with `.agents/skills/<name>/` and diff as layer 1. Do not stop at
  `SKILL.md`. Exclude `assets/fonts/` (installed separately). Skip
  `optional:` (absent locally) in step 5.

  **Compare modes too.** Content comparison misses permission bits, so a copy
  of `prime-visual/scripts/fetch_catalog_image.sh` that lost its executable
  bit is byte-identical and classified unchanged — while the skill's own
  `SKILL.md` tells the agent to run it, and it fails with `Permission denied`.
  This is the only layer holding executables, which is why layer 1 never
  needed the check:

  ```bash
  # After the content diff. Iterate explicitly: written with a bare $name this
  # inherited whatever the discovery loop left behind, so it inspected one
  # unrelated skill and never looked at prime-visual at all.
  for name in $optional_skills; do
    [ -d "$agents_dir/skills/$name" ] || continue   # optional-present only
    git -C "$upstream" ls-tree -r "$upstream_rev:skills/$name" |
    while read -r mode _type _blob f; do
      up=$( [ "$mode" = 100755 ] && echo x || echo - )
      lo=$( [ -x "$agents_dir/skills/$name/$f" ] && echo x || echo - )
      [ "$up" = "$lo" ] || echo "mode differs: $name/$f (upstream=$up local=$lo)"
    done
  done
  ```

  Copy with `cp -Rp` when applying an update, so the bit survives.

### 5. Categorize changes

Group every diff result into:

| Category               | Meaning                                          | Default action                            |
| ---------------------- | ------------------------------------------------ | ----------------------------------------- |
| **unchanged**          | Files are identical (after token normalization)  | Skip                                      |
| **added upstream**     | File exists in core but not in consuming project | Copy (with token replacement for layer 2) |
| **modified**           | File exists in both but content differs          | Reconcile (step 6)                        |
| **removed upstream**   | File exists in consuming project but not in core | Surface for decision                      |
| **project-specific**   | No upstream counterpart                          | Skip (layer 3)                            |
| **optional (layer 4)** | Visual skill absent locally                      | Skip unless the project asked for it      |
| **optional-present**   | Visual skill already installed locally           | Diff the whole directory as layer 1       |

### 6. Reconcile modified files

For each modified file, do a 3-way comparison using the baseline recorded in
step 1. Step 1 already failed if `$baseline_rev` is empty — do not invent a
2-way fallback for a missing pin.

1. **What changed upstream** — `git -C "$upstream" diff <baseline_rev>..$upstream_rev -- <file>`
2. **What changed locally** — did the consuming project customize the file
   beyond the project name? Compare the local file against the upstream at the
   baseline revision: `git -C "$upstream" show <baseline_rev>:<file>`. If the
   only differences are project name substitution, the upstream change is a clean
   apply.
3. **Decide:**
   - **Clean apply** (no local customization): replace the local file with the
     new upstream version (with token replacement for layer 2).
   - **Conflict** (local has real customizations): merge manually. Take the
     upstream changes, then re-apply local customizations. Surface the conflict
     and your proposed resolution in the change set (step 7).
   - **Local improvement** (local is better than upstream): surface for
     decision — the local version may be worth contributing back (see
     the contributing guide (`.agents/context/contributing.md` in the core repo).

### 7. Surface the change set

Present the full change set before writing anything. All `.agents/**` paths are
protected — do not write until the operator confirms.

```markdown
## Upstream integration — proposed changes

**Upstream core:** <path or remote>
**Project name:** <name>
**Branch:** <the branch you created, e.g. `chore/sync-agent-core-202608071432`>

### Clean applies (replace)

- `.agents/rules/general.md` — upstream improved the voice section
- `.agents/skills/review-loop/SKILL.md` — new non-Cursor guidance

### Needs reconciliation (conflict)

- `.agents/skills/find-work/SKILL.md` — upstream reworked ranking logic; local
  has a custom scout. Proposed: take upstream ranking, re-apply local scout.
  **Review before applying.**

### New files (copy)

- `.agents/rules/subagents.md` — new shared rule
- `.agents/skills/integrate-upstream/SKILL.md` — this skill (new in core)

### Removed upstream

- `.agents/rules/old-rule.md` — upstream deleted. Remove locally?

### Structural suggestions (layer 3)

- `.agents/context/README.md` — upstream template added a "60-second model"
  section. Consider adding one if missing.
- `.agents/context/loading.md` — upstream template added a load/skip table.
  Consider adopting the structure.

### Skip (unchanged)

N files unchanged after token normalization.

### Bookkeeping

- `.agents/upstream-ref` — pin core SHA `<upstream_rev>`

### Local improvements (contribute back)

- `.agents/skills/reconcile-context/SKILL.md` — local version has a hook wiring
  section the upstream lacks. Run
  [`contribute-upstream`](../contribute-upstream/SKILL.md) to open a PR with it
  (see the core repo's `.agents/context/contributing.md`).
```

### 8. Apply changes

After operator confirmation, copy from the `$upstream_rev` captured in
step 1 (`git show` / archive / detached worktree). Do **not** move a
supplied submodule to make `HEAD` match. Recheck that `$upstream_rev`
is still a commit — the step-1 capture does not cover a fetch that
rewrote history during confirmation. If shared paths are dirty, still
copy from `$upstream_rev`, not the working tree.

```bash
if ! git -C "$upstream" cat-file -e "${upstream_rev}^{commit}"; then
  echo "captured $upstream_rev is gone — re-run step 1" >&2
  exit 2
fi
if ! status=$(git -C "$upstream" status --porcelain -- rules skills templates AGENTS.md README.md); then
  echo "git status failed — copy from $upstream_rev, not the working tree" >&2
elif [ -n "$status" ]; then
  echo "upstream shared paths are dirty — copy from $upstream_rev, not the working tree" >&2
  echo "diff and copy via a detached worktree or git archive at $upstream_rev" >&2
fi
```

1. Copy new files (with token replacement for layer 2).
2. Replace clean-apply files with upstream versions (with token replacement).
3. Apply reconciled merges for conflict files.
4. Handle removed files per operator decision.
5. Do **not** overwrite layer 3 content. Structural suggestions are notes only.
6. Do **not** write `.agents/upstream-ref` yet. A declined layer-1/2 file
   or a failed link check must not advance the pin — `contribute-upstream`
   would then treat unapplied upstream text as a consumer-local improvement.
   If the operator declined any layer-1/2 path, set `declined_layer12=1`.

### 9. Run the link check

Run `check_links.py` before writing the pin. It is a layer 1 script:
copy it in step 8 only if it was in the confirmed change set. Do not
copy it here if the operator declined that addition.

Fail only on `BROKEN` lines the pre-apply `HEAD` does not already
report, after dropping consumer-layout false positives (same rule
as `contribute-upstream`). Pre-existing consumer noise does not
block the pin. A missing checker is not a pass and does not abort
after step 8: leave the pin unchanged and continue to the report.

```bash
checker=".agents/skills/reconcile-context/scripts/check_links.py"
consumer_root="$(git rev-parse --show-toplevel)"
mkdir -p "$consumer_root/.scratch"
git add -- <every confirmed applied path> || {
  echo "failed to stage applied paths — check_links.py only sees git ls-files" >&2
  exit 1
}
if [ ! -f "$checker" ]; then
  echo "check_links.py is missing — copy it only if the operator confirmed that layer-1 addition" >&2
  echo "leave .agents/upstream-ref unchanged; continue to the report" >&2
else
  links_base="$consumer_root/.scratch/integrate-links-base-$$"
  git -C "$consumer_root" worktree remove --force "$links_base" 2>/dev/null || true
  git -C "$consumer_root" worktree prune
  if [ -e "$links_base" ]; then
    if git -C "$consumer_root" worktree list --porcelain | grep -Fqx "worktree $links_base"; then
      echo "could not remove leftover baseline worktree at $links_base" >&2
      exit 1
    fi
    rm -rf "$links_base"
  fi
  head_rc=0
  python3 "$checker" \
    > "$consumer_root/.scratch/integrate-links-head.txt" 2>&1 || head_rc=$?
  if ! grep -qx "CHECK_LINKS_DONE" "$consumer_root/.scratch/integrate-links-head.txt"; then
    cat "$consumer_root/.scratch/integrate-links-head.txt" >&2
    echo "check_links.py did not finish on the applied tree (exit $head_rc)" >&2
    exit 1
  fi
  git -C "$consumer_root" worktree add --detach "$links_base" HEAD || {
    echo "failed to add detached HEAD worktree at $links_base" >&2
    exit 1
  }
  mkdir -p "$links_base/.agents/skills/reconcile-context/scripts" || {
    git -C "$consumer_root" worktree remove --force "$links_base" 2>/dev/null || true
    echo "failed to create baseline scripts dir — stop" >&2
    exit 1
  }
  if ! cp -R "$(pwd)/.agents/skills/reconcile-context/scripts/." \
    "$links_base/.agents/skills/reconcile-context/scripts/"; then
    git -C "$consumer_root" worktree remove --force "$links_base" 2>/dev/null || true
    echo "failed to copy checker into the HEAD snapshot — stop" >&2
    exit 1
  fi
  base_rc=0
  python3 "$links_base/.agents/skills/reconcile-context/scripts/check_links.py" \
    > "$consumer_root/.scratch/integrate-links-base.txt" 2>&1 || base_rc=$?
  if ! grep -qx "CHECK_LINKS_DONE" "$consumer_root/.scratch/integrate-links-base.txt"; then
    cat "$consumer_root/.scratch/integrate-links-base.txt" >&2
    git -C "$consumer_root" worktree remove --force "$links_base" 2>/dev/null || true
    echo "check_links.py did not finish on HEAD (exit $base_rc)" >&2
    exit 1
  fi
  grep "^BROKEN" "$consumer_root/.scratch/integrate-links-base.txt" | sort -u \
    > "$consumer_root/.scratch/integrate-links-base-broken.txt" || true
  grep "^BROKEN" "$consumer_root/.scratch/integrate-links-head.txt" | sort -u \
    > "$consumer_root/.scratch/integrate-links-head-broken.txt" || true
  if ! new_breaks=$(comm -13 \
    "$consumer_root/.scratch/integrate-links-base-broken.txt" \
    "$consumer_root/.scratch/integrate-links-head-broken.txt"); then
    git -C "$consumer_root" worktree remove --force "$links_base" 2>/dev/null || true
    echo "failed to compare link-check BROKEN sets — stop" >&2
    exit 1
  fi
  git -C "$consumer_root" worktree remove --force "$links_base"
  rm -f "$consumer_root/.scratch/integrate-links-head.txt" \
    "$consumer_root/.scratch/integrate-links-base.txt" \
    "$consumer_root/.scratch/integrate-links-base-broken.txt" \
    "$consumer_root/.scratch/integrate-links-head-broken.txt"
  # Drop only `missing file` / escape layout false positives when the
  # target exists under the consumer layout. Keep missing-anchor and
  # other whys. Fail closed if the filter itself errors — an empty
  # capture must not look like a clean delta. A missing filter script
  # is a skip (the consumer may have declined contribute-upstream).
  if [ -n "$new_breaks" ]; then
    filter=".agents/skills/contribute-upstream/scripts/check_consumer_links.py"
    if [ ! -f "$filter" ]; then
      filter_shown="$consumer_root/.scratch/check_consumer_links-$$.py"
      if git -C "$upstream" show \
        "$upstream_rev:skills/contribute-upstream/scripts/check_consumer_links.py" \
        > "$filter_shown" 2>/dev/null; then
        filter="$filter_shown"
      else
        rm -f "$filter_shown"
        filter=""
      fi
    fi
    if [ -n "$filter" ] && [ -f "$filter" ]; then
      filter_rc=0
      new_breaks=$(printf '%s\n' "$new_breaks" | CONSUMER_ROOT="$consumer_root" \
        python3 "$filter" filter-layout) || filter_rc=$?
      if [ "$filter_rc" -ne 0 ]; then
        echo "consumer-layout filter failed (exit $filter_rc)" >&2
        exit 1
      fi
    fi
  fi
  if [ -n "$new_breaks" ]; then
    echo "$new_breaks" >&2
    echo "new link-check breakage — fix or revert; do not pin" >&2
    exit 1
  fi
  link_check_rc=0
fi
```

If the link check passed (no new breakage) and no layer-1/2 file was declined, write the pin
for `$upstream_rev` (the confirmed step-1 SHA the files were copied from).
Do not require `HEAD` to equal that SHA. A behind submodule is expected.

```bash
if [ "${declined_layer12:-0}" -ne 0 ]; then
  echo "layer 1/2 files were declined — leave .agents/upstream-ref unchanged" >&2
elif [ -z "${link_check_rc+x}" ]; then
  echo "link check was not run — leave .agents/upstream-ref unchanged" >&2
elif [ "$link_check_rc" -ne 0 ]; then
  echo "link check failed — leave .agents/upstream-ref unchanged" >&2
elif ! git -C "$upstream" cat-file -e "${upstream_rev}^{commit}"; then
  echo "upstream revision is not a commit — skip writing .agents/upstream-ref" >&2
else
  synced_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  version=$(git -C "$upstream" show "$upstream_rev:VERSION" 2>/dev/null | tr -d "\n" || true)
  python3 -c '
import json, os, sys, tempfile
sha, path, synced_at, version = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
obj = {"sha": sha, "synced_at": synced_at}
if version:
    obj["version"] = version
d = os.path.dirname(path) or "."
fd, tmp = tempfile.mkstemp(prefix="upstream-ref.", dir=d)
try:
    with os.fdopen(fd, "w") as f:
        json.dump(obj, f, indent=2)
        f.write("\n")
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
except Exception:
    try:
        os.unlink(tmp)
    except OSError:
        pass
    raise
' "$upstream_rev" "$agents_dir/upstream-ref" "$synced_at" "$version" || {
    echo "failed to write .agents/upstream-ref — stop" >&2
    exit 1
  }
  git add "$agents_dir/upstream-ref" || {
    echo "failed to stage .agents/upstream-ref — stop" >&2
    exit 1
  }
fi
```

If `$upstream/VERSION` exists, add `"version"` to the same object. Skip the
write if `$upstream_rev` is not an object, any selected
layer-1/2 update was declined, or the link check was skipped (missing
checker) or found new breakage.
Do **not** skip because `HEAD` differs from `$upstream_rev` or because
shared paths are dirty. The pin is `$upstream_rev`, not `HEAD`. A behind
submodule is expected.

### 10. Report

List `.agents/upstream-ref` as pinned only if step 9 wrote it. If the
write was skipped, say it was left unchanged and include the skip
reason — do not report a pin that was not recorded.
`contribute-upstream` treats the pin as the 3-way baseline.

```markdown
## Upstream integration

**Upstream core:** <path or remote>
**Branch:** <the branch you created, e.g. `chore/sync-agent-core-202608071432`>
**Result:** <N files changed | N clean applies, N reconciled, N new, N removed>

### Changes applied

- <file> — <what changed>
- `.agents/upstream-ref` — <pinned `<upstream_rev>` | left unchanged — <skip reason>>
- ...

### Structural suggestions (not applied)

- <file> — <suggestion>
- ...

### Local improvements to contribute back

- <file> — <what local does better>
- ...

### Link check: <pass | N new | skipped — missing checker>

### Next

- If the link check found new breakage, this skill already stopped — do not ship.
- Otherwise commit and ship via ship-work — MR title `chore(agents): sync shared agent core`
- Contribute local improvements back to the core (see contributing.md)
```

A clean pass with nothing to change is a valid outcome. Say so and stop.

## Do not

- Overwrite project-specific content (context modules, agent personas, routing
  rows, project-specific skills and rules).
- Apply changes without operator confirmation — all `.agents/**` are protected.
- Edit in the workspace root checkout — work in a worktree.
- Skip the link check after changes.
- Assume the upstream is this core without verifying the directory structure.
- Reconcile a modified file by blindly taking either side — surface the
  conflict and your proposed resolution.
