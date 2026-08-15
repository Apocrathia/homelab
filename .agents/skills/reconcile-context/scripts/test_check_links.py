#!/usr/bin/env python3
"""Regression tests for check_links.py (homelab: discovery symlinks allowed)."""

from __future__ import annotations

import contextlib
import io
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import check_links


class CheckLinksTest(unittest.TestCase):
    def run_checker(self, root: str, *args: str) -> tuple[int, str]:
        old_root = check_links.ROOT
        old_argv = sys.argv
        output = io.StringIO()
        try:
            # Match check_links.ROOT (realpath): macOS /var → /private/var.
            check_links.ROOT = os.path.realpath(root)
            sys.argv = ["check_links.py", *args]
            with contextlib.redirect_stdout(output):
                status = check_links.main()
            return status, output.getvalue()
        finally:
            check_links.ROOT = old_root
            sys.argv = old_argv

    def test_untracked_markdown_target_with_existing_anchor_is_missing_file(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("[Target](./untracked.md#present-heading)\n")
            with open(os.path.join(root, "untracked.md"), "w", encoding="utf-8") as fh:
                fh.write("# Present Heading\n")
            subprocess.run(["git", "add", "AGENTS.md"], cwd=root, check=True)

            status, output = self.run_checker(root)

            self.assertEqual(1, status)
            self.assertIn(
                "BROKEN [missing file] AGENTS.md -> ./untracked.md#present-heading",
                output,
            )
            self.assertNotIn("missing anchor", output)

    def test_tracked_symlink_registers_realpath_target(self):
        """A tracked symlink's realpath is a valid link target even if untracked."""
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("[Direct](./untracked.md)\n")
            with open(os.path.join(root, "untracked.md"), "w", encoding="utf-8") as fh:
                fh.write("# Present\n")
            os.symlink("untracked.md", os.path.join(root, "alias.md"))
            subprocess.run(
                ["git", "add", "AGENTS.md", "alias.md"], cwd=root, check=True
            )

            status, output = self.run_checker(root)

            self.assertEqual(0, status, output)
            self.assertIn("All context links and anchors resolve.", output)

    def test_tracked_symlink_to_in_repo_markdown_is_allowed(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            os.makedirs(os.path.join(root, "docs"), exist_ok=True)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("[Alias](./docs/alias.md#real)\n")
            with open(
                os.path.join(root, "docs", "real.md"), "w", encoding="utf-8"
            ) as fh:
                fh.write("# Real\n")
            os.symlink("real.md", os.path.join(root, "docs", "alias.md"))
            subprocess.run(
                ["git", "add", "AGENTS.md", "docs/alias.md", "docs/real.md"],
                cwd=root,
                check=True,
            )

            status, output = self.run_checker(root)

            self.assertEqual(0, status, output)
            self.assertIn("All context links and anchors resolve.", output)

    def test_tracked_markdown_target_allows_case_insensitive_path_match(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            os.makedirs(os.path.join(root, "docs"), exist_ok=True)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("[Real](./docs/real.md#real)\n")
            with open(
                os.path.join(root, "docs", "Real.md"), "w", encoding="utf-8"
            ) as fh:
                fh.write("# Real\n")
            subprocess.run(
                ["git", "add", "AGENTS.md", "docs/Real.md"], cwd=root, check=True
            )

            status, output = self.run_checker(root)

            self.assertEqual(0, status, output)
            self.assertIn("All context links and anchors resolve.", output)

    def test_anchor_link_to_oversized_tracked_target_reports_read_failure(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            os.makedirs(os.path.join(root, "docs"), exist_ok=True)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("[Huge](./docs/huge.md#heading)\n")
            with open(os.path.join(root, "docs", "huge.md"), "wb") as fh:
                fh.write(b"# Heading\n")
                fh.write(b"x" * (check_links.MAX_MARKDOWN_BYTES + 1))
            subprocess.run(
                ["git", "add", "AGENTS.md", "docs/huge.md"],
                cwd=root,
                check=True,
            )

            status, output = self.run_checker(root)

            self.assertEqual(1, status)
            self.assertIn("BROKEN [larger than", output)
            self.assertIn("AGENTS.md -> ./docs/huge.md#heading", output)
            self.assertNotIn("missing anchor", output)

    def test_broken_context_symlink_reports_stat_failure(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            os.makedirs(os.path.join(root, ".agents", "context"), exist_ok=True)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("# Agents\n")
            os.symlink("missing.md", os.path.join(root, ".agents", "context", "old.md"))
            subprocess.run(
                ["git", "add", "AGENTS.md", ".agents/context/old.md"],
                cwd=root,
                check=True,
            )

            status, output = self.run_checker(root)

            self.assertEqual(1, status)
            self.assertIn("cannot stat symlink target", output)
            self.assertIn(".agents/context/old.md", output)

    def test_broken_skill_link_is_reported_in_default_mode(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            skill_dir = os.path.join(root, ".agents", "skills", "example")
            os.makedirs(skill_dir, exist_ok=True)
            with open(os.path.join(skill_dir, "SKILL.md"), "w", encoding="utf-8") as fh:
                fh.write("[Missing](./missing.md)\n")
            subprocess.run(
                ["git", "add", ".agents/skills/example/SKILL.md"],
                cwd=root,
                check=True,
            )

            status, output = self.run_checker(root)

            self.assertEqual(1, status)
            self.assertIn(
                "BROKEN [missing file] .agents/skills/example/SKILL.md -> ./missing.md",
                output,
            )

    def test_agents_directory_above_root_does_not_expand_default_surface(self):
        with tempfile.TemporaryDirectory() as parent:
            root = os.path.join(parent, ".agents", "repo")
            docs_dir = os.path.join(root, "docs")
            os.makedirs(docs_dir)
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            with open(os.path.join(docs_dir, "page.md"), "w", encoding="utf-8") as fh:
                fh.write("[Missing](./missing.md)\n")
            subprocess.run(["git", "add", "docs/page.md"], cwd=root, check=True)

            status, output = self.run_checker(root)

            self.assertEqual(0, status, output)

    def test_discovery_symlink_resolves_relative_links_from_realpath(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            agent_dir = os.path.join(root, ".agents", "agents", "example")
            ctx = os.path.join(root, ".agents", "context")
            cursor_agents = os.path.join(root, ".cursor", "agents")
            os.makedirs(agent_dir)
            os.makedirs(ctx)
            os.makedirs(cursor_agents)
            with open(os.path.join(agent_dir, "agent.md"), "w", encoding="utf-8") as fh:
                fh.write("[Constraints](../../context/constraints.md)\n")
            with open(os.path.join(ctx, "constraints.md"), "w", encoding="utf-8") as fh:
                fh.write("# Constraints\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("# Agents\n")
            os.symlink(
                os.path.join("..", "..", ".agents", "agents", "example", "agent.md"),
                os.path.join(cursor_agents, "example.md"),
            )
            subprocess.run(
                [
                    "git",
                    "add",
                    "AGENTS.md",
                    ".agents/agents/example/agent.md",
                    ".agents/context/constraints.md",
                    ".cursor/agents/example.md",
                ],
                cwd=root,
                check=True,
            )

            status, output = self.run_checker(root)

            self.assertEqual(0, status, output)

    def test_inline_code_links_are_ignored(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            os.makedirs(os.path.join(root, ".agents", "context"), exist_ok=True)
            with open(
                os.path.join(root, ".agents", "context", "tools.md"),
                "w",
                encoding="utf-8",
            ) as fh:
                fh.write("See `` `[text](./missing.md)` `` in the table.\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("# Agents\n")
            subprocess.run(
                ["git", "add", "AGENTS.md", ".agents/context/tools.md"],
                cwd=root,
                check=True,
            )

            status, output = self.run_checker(root)

            self.assertEqual(0, status, output)

    def test_untracked_agents_markdown_is_included(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            os.makedirs(os.path.join(root, ".agents", "context"), exist_ok=True)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("# Agents\n")
            with open(
                os.path.join(root, ".agents", "context", "new.md"),
                "w",
                encoding="utf-8",
            ) as fh:
                fh.write("[Missing](./gone.md)\n")
            subprocess.run(["git", "add", "AGENTS.md"], cwd=root, check=True)

            status, output = self.run_checker(root)

            self.assertEqual(1, status)
            self.assertIn(
                "BROKEN [missing file] .agents/context/new.md -> ./gone.md",
                output,
            )

    def test_is_markdown_target_accepts_case_and_trailing_slash(self):
        self.assertTrue(check_links.is_markdown_target("./docs/page.MD"))
        self.assertTrue(check_links.is_markdown_target("./docs/page.md/"))
        self.assertFalse(check_links.is_markdown_target("./docs/page.txt"))
        self.assertFalse(check_links.is_markdown_target("./docs/page.md.bak"))

    def test_unreadable_tracked_target_reports_read_failure_not_missing_anchor(self):
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(
                    "[Frag](./docs/secret.md#heading)\n[Plain](./docs/secret.md)\n"
                )
            os.makedirs(os.path.join(root, "docs"), exist_ok=True)
            secret = os.path.join(root, "docs", "secret.md")
            with open(secret, "w", encoding="utf-8") as fh:
                fh.write("# Heading\n")
            subprocess.run(
                ["git", "add", "AGENTS.md", "docs/secret.md"],
                cwd=root,
                check=True,
            )

            real_open = open
            secret_real = os.path.realpath(secret)

            def fake_open(file, *args, **kwargs):
                if (
                    isinstance(file, (str, bytes, os.PathLike))
                    and os.path.realpath(file) == secret_real
                ):
                    raise PermissionError(13, "Permission denied")
                return real_open(file, *args, **kwargs)

            with mock.patch("builtins.open", side_effect=fake_open):
                status, output = self.run_checker(root)

            self.assertEqual(1, status)
            self.assertIn("cannot read file", output)
            self.assertIn("AGENTS.md -> ./docs/secret.md#heading", output)
            self.assertIn("AGENTS.md -> ./docs/secret.md\n", output)
            self.assertNotIn("missing anchor", output)

    def test_symlink_then_dotdot_link_target_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = os.path.join(tmp, "repo")
            outside = os.path.join(tmp, "outside")
            os.makedirs(root)
            os.makedirs(outside)
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            os.symlink(outside, os.path.join(root, "link"))
            with open(os.path.join(root, "escape.md"), "w", encoding="utf-8") as fh:
                fh.write("# Escape\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("[Escape](./link/../escape.md)\n")
            subprocess.run(
                ["git", "add", "AGENTS.md", "escape.md"],
                cwd=root,
                check=True,
            )

            status, output = self.run_checker(os.path.realpath(root))

            self.assertEqual(1, status)
            self.assertIn(
                "BROKEN [target escapes repo] AGENTS.md -> ./link/../escape.md",
                output,
            )

    def test_tracked_md_preserves_non_utf8_filenames(self):
        with tempfile.TemporaryDirectory() as root:
            old_root = check_links.ROOT
            proc = subprocess.CompletedProcess(
                ["git", "ls-files", "-z"],
                0,
                stdout=b"docs/bad_\xff.md\0docs/ignored_\xff.txt\0",
                stderr=b"",
            )
            try:
                check_links.ROOT = root
                with mock.patch.object(
                    check_links.subprocess, "run", return_value=proc
                ):
                    paths = check_links.tracked_md()
            finally:
                check_links.ROOT = old_root

            self.assertEqual([os.path.join(root, "docs", "bad_\udcff.md")], paths)

    def test_alias_to_tracked_file_outside_surface_is_kept(self):
        """Off-surface alias stays on the default surface and is scanned.

        drop_internal_symlinks must not drop a `.agents/` symlink whose target
        is tracked under `docs/` (not on the default surface). Homelab allows
        reading through in-repo markdown symlinks, so the target's broken link
        is reported rather than a `[symlink]` rejection.
        """
        with tempfile.TemporaryDirectory() as root:
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            os.makedirs(os.path.join(root, ".agents", "context"), exist_ok=True)
            os.makedirs(os.path.join(root, "docs"), exist_ok=True)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write("# Agents\n")
            with open(os.path.join(root, "docs", "real.md"), "w", encoding="utf-8") as fh:
                fh.write("[Missing](./gone.md)\n")
            os.symlink(
                os.path.join("..", "..", "docs", "real.md"),
                os.path.join(root, ".agents", "context", "alias.md"),
            )
            subprocess.run(
                ["git", "add", "AGENTS.md", "docs/real.md", ".agents/context/alias.md"],
                cwd=root,
                check=True,
            )

            status, output = self.run_checker(root)

            self.assertEqual(1, status)
            self.assertIn(".agents/context/alias.md", output)
            self.assertIn("missing file", output)


if __name__ == "__main__":
    unittest.main()
