#!/usr/bin/env python3
"""Check that intra-repo markdown links and #anchors in the context surface
resolve. Exit 0 if all good, 1 if any are broken. Safe to run from a hook.

Default surface: AGENTS.md, .agents/README.md, and every markdown file under
.agents/. Discovery symlinks under .cursor/ / .claude/ are not re-checked in
default mode (the .agents SoT already covers that content). Pass --all to
check every tracked markdown file in the repo instead.
"""

import os
import re
import stat
import subprocess
import sys


def _find_root(start):
    d = os.path.dirname(os.path.abspath(start))
    while True:
        if os.path.isdir(os.path.join(d, ".git")) or os.path.exists(
            os.path.join(d, "AGENTS.md")
        ):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            raise SystemExit(
                "could not locate repo root (no .git or AGENTS.md found above script)"
            )
        d = parent


# Canonicalize the root so escape checks compare like with like: link and file
# paths get realpath'd below, so a symlink anywhere in the repo path (e.g. macOS
# /tmp -> /private/tmp) would otherwise make in-repo paths look like they escape.
ROOT = os.path.realpath(_find_root(__file__))
LINK = re.compile(r"\]\((\.{1,2}/[^)\s]+)\)")
HEADING = re.compile(r"^#{1,6}\s+(.*)")
MAX_MARKDOWN_BYTES = 1_000_000


def is_markdown_target(path: str) -> bool:
    """True when path (no fragment) points at a Markdown file."""
    return path.rstrip("/\\").lower().endswith(".md")


def slug(heading: str) -> str:
    """GitHub-style anchor slug. Does NOT collapse repeated hyphens."""
    s = heading.strip().lower()
    s = re.sub(r"\{#([^}]+)\}", "", s).strip()
    s = re.sub(r"[^\w\s-]", "", s)
    return s.replace(" ", "-").strip("-")


def _md_paths_from_git():
    """Return (paths, seen_realpaths) from git ls-files. Raises OSError/CalledProcessError."""
    proc = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    # git ls-files reports slash-separated names on every platform; split and
    # rejoin so the paths use the OS separator. Without this, surface() matching
    # on os.sep would miss .agents/context files on Windows.
    paths = []
    seen = set()
    for path in proc.stdout.split(b"\0"):
        if not path:
            continue
        name = path.decode("utf-8", errors="surrogateescape")
        if is_markdown_target(name):
            full = os.path.join(ROOT, *name.split("/"))
            paths.append(full)
            seen.add(os.path.realpath(full))
    return paths, seen


def _md_paths_from_walk():
    """Fallback when git is unavailable (e.g. rootless CI images without apk)."""
    skip_dirs = {
        ".git",
        ".worktrees",
        "node_modules",
        "__pycache__",
        ".venv",
        "vendor",
    }
    paths = []
    seen = set()
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for name in filenames:
            if not is_markdown_target(name):
                continue
            full = os.path.join(dirpath, name)
            real = os.path.realpath(full)
            if real not in seen:
                paths.append(full)
                seen.add(real)
    return paths, seen


def tracked_md():
    try:
        paths, seen = _md_paths_from_git()
    except (OSError, subprocess.CalledProcessError):
        # Rootless runners often ship python images without git and without
        # permission to apk/apt install it. Walk the checkout instead.
        paths, seen = _md_paths_from_walk()
    # Include untracked portable + adapter markdown so reconcile works before
    # the first commit of those trees. Same for agent backlog / research ledgers
    # under docs/ (issues, plans, research).
    for rel in (".agents", ".claude", "docs/issues", "docs/plans", "docs/research"):
        extra_root = os.path.join(ROOT, rel)
        if not os.path.isdir(extra_root):
            continue
        for dirpath, _, filenames in os.walk(extra_root):
            for name in filenames:
                if not is_markdown_target(name):
                    continue
                full = os.path.join(dirpath, name)
                real = os.path.realpath(full)
                if real not in seen:
                    paths.append(full)
                    seen.add(real)
    for rel in ("CLAUDE.md",):
        full = os.path.join(ROOT, rel)
        if not os.path.lexists(full):
            continue
        # Always register the adapter path itself (may share a realpath with
        # AGENTS.md when CLAUDE.md is a symlink).
        paths.append(full)
        seen.add(os.path.realpath(full))
    return paths


def exact_path_key(path):
    return os.path.abspath(path)


def folded_path_key(path):
    return os.path.abspath(path).casefold()


def tracked_markdown_lookup(path, exact, folded):
    return exact.get(exact_path_key(path)) or folded.get(folded_path_key(path))


def within_root(path):
    # commonpath raises ValueError when the paths share no base — e.g. they sit
    # on different Windows drives. That target is outside the repo, so treat the
    # error the same as any other escape rather than letting it crash the hook.
    try:
        return os.path.commonpath([ROOT, path]) == ROOT
    except ValueError:
        return False


def safe_markdown_path(path):
    real = os.path.realpath(path)
    if not within_root(real):
        return False, "escapes repo"
    try:
        st = os.lstat(path)
    except OSError as exc:
        return False, f"cannot stat file: {exc}"
    if stat.S_ISLNK(st.st_mode):
        # Discovery symlinks (`.cursor/skills` → `.agents/skills`) are fine when
        # they resolve to a regular in-repo markdown file.
        try:
            rst = os.stat(real)
        except OSError as exc:
            return False, f"cannot stat symlink target: {exc}"
        if not stat.S_ISREG(rst.st_mode):
            return False, "symlink target not a regular file"
        if rst.st_size > MAX_MARKDOWN_BYTES:
            return False, f"larger than {MAX_MARKDOWN_BYTES} bytes"
        return True, ""
    if not stat.S_ISREG(st.st_mode):
        return False, "not a regular file"
    if st.st_size > MAX_MARKDOWN_BYTES:
        return False, f"larger than {MAX_MARKDOWN_BYTES} bytes"
    return True, ""


def read_markdown(path):
    ok, why = safe_markdown_path(path)
    if not ok:
        return None, why
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read(), ""
    except OSError as exc:
        return None, f"cannot read file: {exc}"


def anchor_map(md_files):
    m = {}
    bad = []
    for f in md_files:
        text, why = read_markdown(f)
        if text is None:
            bad.append((f, os.path.relpath(f, ROOT), why))
            continue
        anchors = set()
        for h in (HEADING.match(line) for line in text.splitlines()):
            if not h:
                continue
            heading = h.group(1)
            anchors.add(slug(heading))
            explicit = re.search(r"\{#([^}]+)\}", heading)
            if explicit:
                anchors.add(explicit.group(1))
        m[os.path.realpath(f)] = anchors
    return m, bad


def surface(check_all, md_files):
    if check_all:
        return md_files
    # Default: portable agent surface only. Cursor discovery trees are often
    # symlinks; checking the .agents SoT covers the same content.
    # Match relative to ROOT so a parent directory literally named `.agents`
    # (e.g. /tmp/.agents/repo) does not pull unrelated docs into the surface.
    files = [
        os.path.join(ROOT, "AGENTS.md"),
        os.path.join(ROOT, ".agents", "README.md"),
    ]
    for f in md_files:
        try:
            rel = os.path.relpath(f, ROOT)
        except ValueError:
            continue
        if rel == ".agents" or rel.startswith(".agents" + os.sep):
            files.append(f)
    seen = set()
    out = []
    for f in files:
        if f not in seen and os.path.lexists(f):
            seen.add(f)
            out.append(f)
    return out


def tracked_lookup(md_files):
    exact = {}
    folded = {}
    for path in md_files:
        real = os.path.realpath(path)
        # Prefer the real regular file so symlink discovery paths (`.cursor/…`)
        # do not fail safe_markdown_path's symlink rejection.
        value = real if within_root(real) and os.path.isfile(real) else path
        for key_path in (path, real):
            exact[exact_path_key(key_path)] = value
            folded[folded_path_key(key_path)] = value
    return exact, folded


INLINE_CODE = re.compile(r"`[^`]*`")


def link_targets(text):
    """Yield relative link targets, skipping fenced blocks and inline code.

    Example markdown in tables (`` `[text](../README.md)` ``) and fenced samples
    must not fail reconcile; only live prose links are checked.
    """
    in_fence = False
    for line in text.splitlines():
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        stripped = INLINE_CODE.sub("", line)
        for target in LINK.findall(stripped):
            yield target


def main():
    check_all = "--all" in sys.argv[1:]
    md_files = tracked_md()
    tracked_markdown, folded_tracked_markdown = tracked_lookup(md_files)
    anchors, read_bad = anchor_map(md_files)
    # anchor_map drops files it can't read from the anchor index but records why
    # in read_bad. Key those reasons by realpath so the link loop below can blame
    # the real cause (e.g. "cannot read file") instead of a bogus "missing anchor"
    # when a link points at a tracked-but-unreadable Markdown file.
    read_failures = {os.path.realpath(f): why for f, _, why in read_bad}
    surface_files = surface(check_all, md_files)
    # anchor_map records read failures for every tracked file because the anchor
    # index has to cover any link target. A read failure only fails the run if
    # that file is on the surface, which is every tracked file under --all but
    # just AGENTS.md/CLAUDE.md/.agents/context in default mode. Otherwise a symlink or
    # unreadable Markdown under docs/ that nothing links to would break the
    # default hook.
    surface_set = set(surface_files)
    bad = [entry for entry in read_bad if entry[0] in surface_set]
    already_bad = {f for f, _, _ in bad}
    for f in surface_files:
        # Resolve relative links from the real file, not a discovery symlink
        # path (.cursor/agents/foo.md → .agents/agents/foo/agent.md). Otherwise
        # ../../context/constraints.md looks for repo-root context/ and fails.
        base = os.path.dirname(os.path.realpath(f))
        text, why = read_markdown(f)
        if text is None:
            if f not in already_bad:
                bad.append((f, os.path.relpath(f, ROOT), why))
            continue
        for target in link_targets(text):
            path, _, anc = target.partition("#")
            joined = os.path.join(base, path)
            linked = os.path.normpath(joined)
            # realpath the raw join, not the normpath'd path: normpath collapses
            # `link/..` lexically, dropping a symlink component before the OS gets
            # to resolve it. A link like ./link/../x.md (link -> /outside) would
            # then look in-repo even though it escapes. Resolve from the raw path
            # so the escape check sees where the symlinks actually point; the
            # normpath'd `linked` is still what the tracked-file lookup keys on.
            rp = os.path.realpath(joined)
            if not within_root(rp):
                bad.append((f, target, "target escapes repo"))
            elif is_markdown_target(path):
                tracked = tracked_markdown_lookup(
                    linked,
                    tracked_markdown,
                    folded_tracked_markdown,
                )
                if tracked is None:
                    bad.append((f, target, "missing file"))
                    continue
                ok, why = safe_markdown_path(tracked)
                if not ok:
                    bad.append((f, target, why))
                    continue
                anchor_key = os.path.realpath(tracked)
                if anchor_key not in anchors:
                    # safe_markdown_path only stats; a file can pass that yet still
                    # fail to read (e.g. no read permission). Report the real
                    # reason for both plain and #fragment links instead of letting
                    # plain links pass silently or fragment links say "missing
                    # anchor".
                    bad.append(
                        (f, target, read_failures.get(anchor_key, "cannot read file"))
                    )
                elif anc and anc not in anchors[anchor_key]:
                    bad.append((f, target, "missing anchor"))
            elif not os.path.exists(rp):
                bad.append((f, target, "missing file"))
    for f, target, why in bad:
        print(f"BROKEN [{why}] {os.path.relpath(f, ROOT)} -> {target}")
    if bad:
        print(f"\n{len(bad)} broken link(s).")
        return 1
    print("All context links and anchors resolve.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
