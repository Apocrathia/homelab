#!/usr/bin/env python3
"""Tests for sync_surfaces.py (Phase A skeleton + Phase B APPEND_SYSTEM)."""

import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from unittest import mock

import sync_surfaces

SIDECAR_DIRS = (
    (".agents", "rules"),
    (".agents", "agents"),
    (".agents", "skills"),
)

ALWAYS_ON = [
    "ambiguity-goes-back-to-source",
    "clarify-dont-guess",
    "general",
    "ground-before-asking",
    "ponytail",
    "protected-paths",
    "question-format",
    "response-shape",
    "security",
    "stop-loss",
    "subagents",
    "surgical-edits",
    "worktrees",
]


def _disabled_sidecar(**extra):
    data = {
        "note": "test fixture",
        "mirrors": {
            "cursor": {"enabled": False},
            "claude": {"enabled": False},
            "codex": {"enabled": False},
            "prime-agent": {"enabled": False},
        },
    }
    data.update(extra)
    return data


def _write_sidecars(root, rules=None, agents=None, skills=None):
    for parts in SIDECAR_DIRS:
        os.makedirs(os.path.join(root, *parts), exist_ok=True)
    mapping = {
        ("rules",): rules if rules is not None else _disabled_sidecar(),
        ("agents",): agents if agents is not None else _disabled_sidecar(),
        ("skills",): skills if skills is not None else _disabled_sidecar(),
    }
    for (name,), data in mapping.items():
        path = os.path.join(root, ".agents", name, "_harnesses.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh)


def _write_rule(root, stem, body, *, always_apply=True):
    rules_dir = os.path.join(root, ".agents", "rules")
    os.makedirs(rules_dir, exist_ok=True)
    flag = "true" if always_apply else "false"
    text = f"---\nalwaysApply: {flag}\ndescription: fixture {stem}\n---\n\n{body}"
    with open(os.path.join(rules_dir, f"{stem}.md"), "w", encoding="utf-8") as fh:
        fh.write(text)


def _append_cfg(
    rules=None, always_on=None, enabled=True, path=".prime/agent/APPEND_SYSTEM.md"
):
    return {
        "enabled": enabled,
        "path": path,
        "rules": list(rules if rules is not None else ALWAYS_ON),
        "always_on": list(always_on if always_on is not None else ALWAYS_ON),
    }


def _agents_md_for(stems, *, include_voice=True):
    lines = ["# AGENTS.md\n", "## Always in force\n", "\n"]
    if include_voice:
        lines.append("- voice: [voice](./.agents/context/voice.md)\n")
    for stem in stems:
        if stem == "general":
            continue
        lines.append(
            f"- see [`.agents/rules/{stem}.md`](./.agents/rules/{stem}.md)\n"
        )
    lines.append("\n## Routing\n\n- later\n")
    return "".join(lines)


class _ScriptMixin:
    def run_script(self, root, *args):
        old_root = sync_surfaces.ROOT
        old_argv = sys.argv
        output = io.StringIO()
        try:
            sync_surfaces.ROOT = os.path.realpath(root)
            sys.argv = ["sync_surfaces.py", *args]
            with contextlib.redirect_stdout(output):
                status = sync_surfaces.main()
            return status, output.getvalue()
        finally:
            sync_surfaces.ROOT = old_root
            sys.argv = old_argv


class SyncSurfacesTest(_ScriptMixin, unittest.TestCase):
    def test_check_default_is_noop_success_when_nothing_owned(self):
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(root)
            status, output = self.run_script(root)
            self.assertEqual(0, status, output)
            self.assertEqual("Harness surfaces are in sync.\n", output)

    def test_write_is_noop_success_when_nothing_owned(self):
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(root)
            status, output = self.run_script(root, "--write")
            self.assertEqual(0, status, output)
            self.assertEqual("Harness surfaces written.\n", output)

    def test_check_and_write_are_mutually_exclusive(self):
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(root)
            status, output = self.run_script(root, "--check", "--write")
            self.assertEqual(2, status)
            self.assertIn("mutually exclusive", output)

    def test_missing_sidecar_fails_closed(self):
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, ".agents", "rules"), exist_ok=True)
            os.makedirs(os.path.join(root, ".agents", "agents"), exist_ok=True)
            os.makedirs(os.path.join(root, ".agents", "skills"), exist_ok=True)
            with open(
                os.path.join(root, ".agents", "rules", "_harnesses.json"),
                "w",
                encoding="utf-8",
            ) as fh:
                json.dump(_disabled_sidecar(), fh)
            with open(
                os.path.join(root, ".agents", "agents", "_harnesses.json"),
                "w",
                encoding="utf-8",
            ) as fh:
                json.dump(_disabled_sidecar(), fh)

            status, output = self.run_script(root, "--check")

            self.assertEqual(1, status)
            self.assertIn("MISSING", output)
            self.assertIn(".agents/skills/_harnesses.json", output)

    def test_drift_lists_stale_owned_paths_only(self):
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(root)
            owned_dir = os.path.join(root, "generated")
            os.makedirs(owned_dir)
            stale = os.path.join(owned_dir, "stale.md")
            with open(stale, "w", encoding="utf-8") as fh:
                fh.write("wrong content that must not be dumped\n")
            expected = {
                "generated/stale.md": "correct\n",
                "generated/missing.md": "also correct\n",
            }
            with mock.patch.object(
                sync_surfaces, "plan_transforms", return_value=expected
            ):
                status, output = self.run_script(root, "--check")

            self.assertEqual(1, status)
            self.assertIn("STALE generated/stale.md", output)
            self.assertIn("STALE generated/missing.md", output)
            self.assertNotIn("wrong content", output)
            self.assertNotIn("also correct", output)
            self.assertIn("2 stale path(s)", output)

    def test_unowned_paths_are_ignored_on_check(self):
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(root)
            noise = os.path.join(root, "noise.md")
            with open(noise, "w", encoding="utf-8") as fh:
                fh.write("irrelevant\n")
            status, output = self.run_script(root, "--check")
            self.assertEqual(0, status, output)
            self.assertNotIn("noise.md", output)

    def test_write_updates_only_owned_expected_paths(self):
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(root)
            noise = os.path.join(root, "noise.md")
            with open(noise, "w", encoding="utf-8") as fh:
                fh.write("keep me\n")
            expected = {"owned/out.md": "generated body\n"}
            with mock.patch.object(
                sync_surfaces, "plan_transforms", return_value=expected
            ):
                status, output = self.run_script(root, "--write")

            self.assertEqual(0, status, output)
            out_path = os.path.join(root, "owned", "out.md")
            with open(out_path, encoding="utf-8") as fh:
                self.assertEqual("generated body\n", fh.read())
            with open(noise, encoding="utf-8") as fh:
                self.assertEqual("keep me\n", fh.read())

    def test_append_system_enabled_without_path_fails_closed(self):
        with tempfile.TemporaryDirectory() as root:
            rules = _disabled_sidecar(
                append_system={
                    "enabled": True,
                    "rules": ["general"],
                    "always_on": ["general"],
                }
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("append_system", output)
            self.assertIn("path", output)

    def test_append_system_enabled_generates_content(self):
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha", "beta"]
            for stem in stems:
                _write_rule(root, stem, f"# {stem}\n\nbody of {stem}\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems)
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--write")
            self.assertEqual(0, status, output)
            out = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md")
            marker = out + ".generated"
            self.assertTrue(os.path.isfile(out))
            self.assertTrue(os.path.isfile(marker))
            with open(out, encoding="utf-8") as fh:
                text = fh.read()
            self.assertTrue(text.startswith(sync_surfaces.GENERATED_COMMENT), text[:80])
            self.assertIn("body of alpha", text)
            self.assertIn("body of beta", text)
            self.assertTrue(text.endswith("\n"))
            with open(marker, encoding="utf-8") as fh:
                self.assertEqual(sync_surfaces.MARKER_FILE_CONTENT, fh.read())
            status2, output2 = self.run_script(root, "--check")
            self.assertEqual(0, status2, output2)

    def test_enabled_mirror_without_generator_fails_closed(self):
        with tempfile.TemporaryDirectory() as root:
            rules = _disabled_sidecar()
            rules["mirrors"]["cursor"] = {
                "enabled": True,
                "path": ".cursor/rules",
                "note": "would own .md generation in Phase C",
            }
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("UNIMPLEMENTED rules.mirrors.cursor", output)
            self.assertIn("not implemented", output)

    def test_plan_transforms_empty_when_all_disabled(self):
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(root)
            sidecars = sync_surfaces.load_sidecars(os.path.realpath(root))
            self.assertEqual(
                {}, sync_surfaces.plan_transforms(sidecars, os.path.realpath(root))
            )

    def test_invalid_sidecar_root_prints_diagnostic(self):
        with tempfile.TemporaryDirectory() as root:
            for parts in SIDECAR_DIRS:
                os.makedirs(os.path.join(root, *parts), exist_ok=True)
            with open(
                os.path.join(root, ".agents", "rules", "_harnesses.json"),
                "w",
                encoding="utf-8",
            ) as fh:
                json.dump([], fh)
            with open(
                os.path.join(root, ".agents", "agents", "_harnesses.json"),
                "w",
                encoding="utf-8",
            ) as fh:
                json.dump(_disabled_sidecar(), fh)
            with open(
                os.path.join(root, ".agents", "skills", "_harnesses.json"),
                "w",
                encoding="utf-8",
            ) as fh:
                json.dump(_disabled_sidecar(), fh)
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("INVALID", output)
            self.assertIn("JSON object", output)

    def test_non_object_mirror_entry_fails_closed(self):
        with tempfile.TemporaryDirectory() as root:
            rules = _disabled_sidecar()
            rules["mirrors"]["cursor"] = True
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("INVALID rules.mirrors.cursor", output)
            self.assertIn("JSON object", output)


class AppendSystemTransformTest(_ScriptMixin, unittest.TestCase):
    def test_concat_order_follows_sidecar_rules(self):
        with tempfile.TemporaryDirectory() as root:
            order = ["zeta", "alpha", "mu"]
            for stem in order:
                _write_rule(root, stem, f"# {stem}\n\nCONTENT-{stem}\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(order))
            expected = sync_surfaces.build_append_system(
                root,
                _append_cfg(rules=order, always_on=order),
            )
            text = expected[".prime/agent/APPEND_SYSTEM.md"]
            positions = [text.index(f"CONTENT-{stem}") for stem in order]
            self.assertEqual(positions, sorted(positions))
            # Separators mention stems in sidecar order.
            rule_markers = [
                m.start()
                for m in __import__("re").finditer(r"<!-- rule: (\w+) -->", text)
            ]
            names = __import__("re").findall(r"<!-- rule: (\w+) -->", text)
            self.assertEqual(order, names)
            self.assertEqual(rule_markers, sorted(rule_markers))

    def test_strip_yaml_frontmatter(self):
        raw = "---\nalwaysApply: true\ndescription: x\n---\n\n# Body\n\nhello\n"
        self.assertEqual(
            "\n# Body\n\nhello\n", sync_surfaces.strip_yaml_frontmatter(raw)
        )
        self.assertEqual(
            "no front\n", sync_surfaces.strip_yaml_frontmatter("no front\n")
        )
        # Full process strips leading/trailing whitespace around the body.
        processed = sync_surfaces.process_rule_body(
            raw, ".agents/rules", ".prime/agent"
        )
        self.assertTrue(processed.startswith("# Body\n"), processed)

    def test_strip_cursor_only_regions(self):
        raw = (
            "# Keep\n\n"
            f"{sync_surfaces.CURSOR_ONLY_START}\n"
            "ci-investigator and .cursor/hooks.json leak bait\n"
            f"{sync_surfaces.CURSOR_ONLY_END}\n"
            "\n# After\n"
        )
        out = sync_surfaces.strip_cursor_only(raw)
        self.assertIn("# Keep", out)
        self.assertIn("# After", out)
        self.assertNotIn("ci-investigator", out)
        self.assertNotIn(".cursor/hooks.json", out)
        self.assertNotIn(sync_surfaces.CURSOR_ONLY_START, out)
        self.assertNotIn(sync_surfaces.CURSOR_ONLY_END, out)

    def test_unclosed_cursor_only_fails_closed(self):
        raw = (
            "# Keep\n\n"
            f"{sync_surfaces.CURSOR_ONLY_START}\n"
            "portable text that must not be silently dropped\n"
        )
        with self.assertRaises(SystemExit) as ctx:
            sync_surfaces.strip_cursor_only(raw, rule_stem="subagents")
        self.assertEqual(1, ctx.exception.code)
        # Through build_append_system / --write: nonzero and no truncated file.
        with tempfile.TemporaryDirectory() as root:
            _write_rule(root, "subagents", "---\nalwaysApply: true\n---\n\n" + raw)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(["subagents"]))
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=["subagents"], always_on=["subagents"])
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn("unclosed", output)
            self.assertIn("subagents.md", output)
            out = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md")
            self.assertFalse(
                os.path.isfile(out), "must not write truncated APPEND_SYSTEM"
            )

    def test_unmatched_cursor_only_end_fails_closed(self):
        raw = (
            "# Keep\n\n"
            "ci-investigator leak bait\n"
            f"{sync_surfaces.CURSOR_ONLY_END}\n"
            "\n# After\n"
        )
        with self.assertRaises(SystemExit) as ctx:
            sync_surfaces.strip_cursor_only(raw, rule_stem="subagents")
        self.assertEqual(1, ctx.exception.code)
        with tempfile.TemporaryDirectory() as root:
            _write_rule(root, "subagents", "---\nalwaysApply: true\n---\n\n" + raw)
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(["subagents"]))
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=["subagents"], always_on=["subagents"])
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn("unmatched", output)
            self.assertIn("subagents.md", output)
            out = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md")
            self.assertFalse(os.path.isfile(out))

    def test_unmarked_cursor_lines_would_leak_without_audit(self):
        """Document that unmarked Cursor-only prose appears unless wrapped."""
        unmarked = (
            "# Subagents\n\n"
            "| One failing PR check | `ci-investigator` |\n"
            "- `.cursor/hooks.json`, `.cursor/hooks/**`\n"
        )
        processed = sync_surfaces.process_rule_body(
            "---\nalwaysApply: true\n---\n\n" + unmarked,
            ".agents/rules",
            ".prime/agent",
        )
        self.assertIn("ci-investigator", processed)
        self.assertIn(".cursor/hooks.json", processed)

        marked = (
            "# Subagents\n\n"
            f"{sync_surfaces.CURSOR_ONLY_START}\n"
            "| One failing PR check | `ci-investigator` |\n"
            "- `.cursor/hooks.json`, `.cursor/hooks/**`\n"
            f"{sync_surfaces.CURSOR_ONLY_END}\n"
            "\nportable text\n"
        )
        cleaned = sync_surfaces.process_rule_body(
            "---\nalwaysApply: true\n---\n\n" + marked,
            ".agents/rules",
            ".prime/agent",
        )
        self.assertNotIn("ci-investigator", cleaned)
        self.assertNotIn(".cursor/hooks.json", cleaned)
        self.assertIn("portable text", cleaned)

    def test_destination_aware_relative_link_rewrite(self):
        body = (
            "See [`response-shape.md`](./response-shape.md) and "
            "[alignment](../skills/alignment/SKILL.md) and "
            "[style](../../.agents/context/voice.md#x).\n"
        )
        out = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("](../../.agents/rules/response-shape.md)", out)
        self.assertIn("](../../.agents/skills/alignment/SKILL.md)", out)
        self.assertIn("](../../.agents/context/voice.md#x)", out)
        self.assertNotIn("/workspace/", out)
        self.assertNotRegex(out, r"\]\(/\.agents/")

    def test_owned_paths_are_append_system_and_marker_only(self):
        with tempfile.TemporaryDirectory() as root:
            stems = ["only"]
            _write_rule(root, "only", "# Only\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            # Unrelated file under .prime/agent must not become owned.
            noise_dir = os.path.join(root, ".prime", "agent", "extensions")
            os.makedirs(noise_dir)
            with open(os.path.join(noise_dir, "local.ts"), "w", encoding="utf-8") as fh:
                fh.write("// local\n")
            expected = sync_surfaces.build_append_system(
                root, _append_cfg(rules=stems, always_on=stems)
            )
            self.assertEqual(
                {
                    ".prime/agent/APPEND_SYSTEM.md",
                    ".prime/agent/APPEND_SYSTEM.md.generated",
                },
                set(expected),
            )
            # Drift on owned paths is STALE; noise is ignored.
            os.makedirs(os.path.join(root, ".prime", "agent"), exist_ok=True)
            with open(
                os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md"),
                "w",
                encoding="utf-8",
            ) as fh:
                fh.write("wrong\n")
            with open(
                os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md.generated"),
                "w",
                encoding="utf-8",
            ) as fh:
                fh.write("wrong marker\n")
            stale = sync_surfaces.collect_stale(root, expected)
            self.assertEqual(
                [
                    ".prime/agent/APPEND_SYSTEM.md",
                    ".prime/agent/APPEND_SYSTEM.md.generated",
                ],
                stale,
            )
            self.assertNotIn("extensions", "".join(stale))

    def test_always_on_remove_one_rule_fails_check(self):
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha", "beta"]
            for stem in stems:
                _write_rule(root, stem, f"# {stem}\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            # always_on omits beta while disk still has alwaysApply for both.
            broken = _append_cfg(rules=["alpha"], always_on=["alpha"])
            rules = _disabled_sidecar(append_system=broken)
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("STALE", output)
            self.assertIn("always_on", output)
            self.assertIn("beta", output)
            # One-line reasons only: no full file dumps.
            self.assertNotIn("body of", output)
            self.assertNotIn("# alpha", output)

    def test_rules_set_must_match_always_on(self):
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha", "beta"]
            for stem in stems:
                _write_rule(root, stem, f"# {stem}\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            cfg = _append_cfg(rules=["alpha"], always_on=stems)
            reasons = sync_surfaces.check_always_on_consistency(root, cfg)
            self.assertTrue(
                any("rules" in r and "always_on" in r for r in reasons), reasons
            )

    def test_agents_voice_vs_general_is_allowed(self):
        with tempfile.TemporaryDirectory() as root:
            stems = ["general", "worktrees"]
            for stem in stems:
                _write_rule(root, stem, f"# {stem}\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                # Links worktrees + voice; omits general intentionally.
                fh.write(_agents_md_for(stems, include_voice=True))
            cfg = _append_cfg(rules=stems, always_on=stems)
            reasons = sync_surfaces.check_always_on_consistency(root, cfg)
            self.assertEqual([], reasons, reasons)

    def test_general_omission_requires_voice_link(self):
        """An allowed omission (general) must fail when voice.md is gone."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["general", "worktrees"]
            for stem in stems:
                _write_rule(root, stem, f"# {stem}\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                # Links worktrees but NOT voice.md.
                fh.write(_agents_md_for(stems, include_voice=False))
            cfg = _append_cfg(rules=stems, always_on=stems)
            reasons = sync_surfaces.check_always_on_consistency(root, cfg)
            self.assertTrue(any("voice" in r for r in reasons), reasons)

    def test_rewrite_balanced_parens_in_links(self):
        """Links with balanced parens in the path should be rewritten correctly."""
        body = "See [API](docs/API_(v2).md) for details.\n"
        out = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("](../../.agents/rules/docs/API_(v2).md)", out)
        self.assertNotIn(".md)", out.replace("API_(v2).md)", ""))

    def test_rewrite_angle_bracket_relative_links(self):
        """Angle-bracket relative paths should be rewritten, not left unchanged."""
        body = "See [guide](<../skills/alignment/SKILL.md>) for details.\n"
        out = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("](<../../.agents/skills/alignment/SKILL.md>)", out)
        self.assertNotIn("../skills", out)

    def test_rewrite_preserves_non_http_uri_schemes(self):
        """ftp:// and other URI schemes must not be treated as relative paths."""
        body = (
            "See [ftp](ftp://example/a) and "
            "[custom](myapp://do-thing) and "
            "[http](http://example/b).\n"
        )
        out = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("](ftp://example/a)", out)
        self.assertIn("](myapp://do-thing)", out)
        self.assertIn("](http://example/b)", out)
        self.assertNotIn("ftp:/", out.replace("ftp://", ""))

    def test_duplicate_always_on_stems_fail(self):
        with tempfile.TemporaryDirectory() as root:
            cfg = _append_cfg(
                rules=["alpha", "alpha"],
                always_on=["alpha", "alpha"],
            )
            reasons = sync_surfaces.check_always_on_consistency(root, cfg)
            self.assertTrue(any("duplicate" in r for r in reasons), reasons)

    def test_duplicate_rules_stems_fail(self):
        with tempfile.TemporaryDirectory() as root:
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(["alpha"]))
            cfg = _append_cfg(
                rules=["alpha", "alpha"],
                always_on=["alpha"],
            )
            reasons = sync_surfaces.check_always_on_consistency(root, cfg)
            self.assertTrue(any("duplicate" in r for r in reasons), reasons)

    def test_path_outside_repo_fails_closed(self):
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(
                root,
                rules=_disabled_sidecar(
                    append_system={
                        "enabled": True,
                        "path": "../outside.md",
                        "rules": ["general"],
                        "always_on": ["general"],
                    }
                ),
            )
            _write_rule(root, "general", "# general\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(["general"], include_voice=True))
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn("must be under .prime/agent/", output)

    def test_absolute_path_fails_closed(self):
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(
                root,
                rules=_disabled_sidecar(
                    append_system={
                        "enabled": True,
                        "path": "/etc/passwd",
                        "rules": ["general"],
                        "always_on": ["general"],
                    }
                ),
            )
            _write_rule(root, "general", "# general\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(["general"], include_voice=True))
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn("must be under .prime/agent/", output)

    def test_disabled_append_system_detects_orphan_files(self):
        """When disabled, previously generated files should be reported as stale."""
        with tempfile.TemporaryDirectory() as root:
            # First: generate with enabled=true
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems)
            )
            _write_sidecars(root, rules=rules)
            status, _ = self.run_script(root, "--write")
            self.assertEqual(0, status)
            # Now: disable
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems, enabled=False)
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("STALE .prime/agent/APPEND_SYSTEM.md", output)
            self.assertIn("STALE .prime/agent/APPEND_SYSTEM.md.generated", output)

    def test_disabled_append_system_write_removes_orphan_files(self):
        """When disabled, --write should remove orphaned generated files."""
        with tempfile.TemporaryDirectory() as root:
            # First: generate with enabled=true
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems)
            )
            _write_sidecars(root, rules=rules)
            self.run_script(root, "--write")
            out = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md")
            marker = out + ".generated"
            self.assertTrue(os.path.isfile(out))
            self.assertTrue(os.path.isfile(marker))
            # Now: disable and --write
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems, enabled=False)
            )
            _write_sidecars(root, rules=rules)
            status, _ = self.run_script(root, "--write")
            self.assertEqual(0, status)
            self.assertFalse(os.path.isfile(out))
            self.assertFalse(os.path.isfile(marker))
            # --check should now pass (orphans gone)
            status, _ = self.run_script(root, "--check")
            self.assertEqual(0, status)

    def test_retargeted_path_detects_old_output_as_orphan(self):
        """When the path changes, the old generated output should be detected as orphan."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            # Generate at original path
            rules = _disabled_sidecar(
                append_system=_append_cfg(
                    rules=stems, always_on=stems, path=".prime/agent/APPEND_SYSTEM.md"
                )
            )
            _write_sidecars(root, rules=rules)
            self.run_script(root, "--write")
            old_out = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md")
            old_marker = old_out + ".generated"
            self.assertTrue(os.path.isfile(old_out))
            self.assertTrue(os.path.isfile(old_marker))
            # Retarget to a new path
            rules = _disabled_sidecar(
                append_system=_append_cfg(
                    rules=stems,
                    always_on=stems,
                    path=".prime/agent/APPEND_SYSTEM_v2.md",
                )
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            # Old path should be reported as stale
            self.assertEqual(1, status)
            self.assertIn("STALE .prime/agent/APPEND_SYSTEM.md", output)
            self.assertIn("STALE .prime/agent/APPEND_SYSTEM.md.generated", output)
            # --write cleans up old and creates new
            status, _ = self.run_script(root, "--write")
            self.assertEqual(0, status)
            self.assertFalse(os.path.isfile(old_out))
            self.assertFalse(os.path.isfile(old_marker))
            new_out = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM_v2.md")
            self.assertTrue(os.path.isfile(new_out))

    def test_wrong_subdir_path_rejected(self):
        """A path under a non-Prime directory should be rejected."""
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(
                root,
                rules=_disabled_sidecar(
                    append_system={
                        "enabled": True,
                        "path": "src/outside.md",
                        "rules": ["general"],
                        "always_on": ["general"],
                    }
                ),
            )
            _write_rule(root, "general", "# general\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(["general"], include_voice=True))
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn("must be under .prime/agent/", output)


class CursorOnlyNestedTest(_ScriptMixin, unittest.TestCase):
    def test_nested_cursor_only_start_fails_closed(self):
        """A second start marker inside a cursor-only region must be rejected."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(
                root,
                "alpha",
                "# alpha\n\nbody\n\n<!-- cursor-only start -->\n"
                "secret\n<!-- cursor-only start -->\nmore\n"
                "<!-- cursor-only end -->\n",
            )
            _write_sidecars(
                root,
                rules=_disabled_sidecar(
                    append_system=_append_cfg(rules=stems, always_on=stems)
                ),
            )
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("nested", output)


class ReferenceLinkRewriteTest(unittest.TestCase):
    def test_reference_style_link_definition_rewritten(self):
        """Reference-style [label]: url definitions should be rewritten."""
        body = "[g]: ../skills/alignment/SKILL.md\n"
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("../../.agents/skills/alignment/SKILL.md", result)
        self.assertNotIn("../skills/alignment/SKILL.md", result)


class BackslashEscapeTest(unittest.TestCase):
    def test_backslash_escapes_preserved_in_destinations(self):
        """Markdown backslash escapes in destinations should be unescaped, not treated as separators."""
        body = "[guide](docs/API_\\(v2\\).md)"
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("API_(v2).md", result)
        self.assertNotIn("API_/", result)


class TopLevelOrphanScanTest(_ScriptMixin, unittest.TestCase):
    def test_nested_orphan_marker_not_detected(self):
        """A .generated marker in a subdirectory should NOT be treated as a rule
        orphan — subdirectories may belong to other transforms."""
        with tempfile.TemporaryDirectory() as root:
            nested_dir = os.path.join(root, ".prime", "agent", "prompts")
            os.makedirs(nested_dir)
            marker_path = os.path.join(nested_dir, "APPEND_SYSTEM.md.generated")
            with open(marker_path, "w", encoding="utf-8") as fh:
                fh.write(sync_surfaces.MARKER_FILE_CONTENT)
            out_path = os.path.join(nested_dir, "APPEND_SYSTEM.md")
            with open(out_path, "w", encoding="utf-8") as fh:
                fh.write("persona content\n")
            _write_sidecars(root)
            status, output = self.run_script(root, "--check")
            # Should NOT report the nested files as stale
            self.assertEqual(0, status, output)


class DisabledMarkerCheckTest(_ScriptMixin, unittest.TestCase):
    def test_disabled_does_not_delete_hand_authored_file(self):
        """When disabled, a hand-authored file without a valid marker must not be deleted."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            # First generate with enabled
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems)
            )
            _write_sidecars(root, rules=rules)
            self.run_script(root, "--write")
            out = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md")
            marker = out + ".generated"
            self.assertTrue(os.path.isfile(out))
            self.assertTrue(os.path.isfile(marker))
            # Remove the marker but keep the file (simulates hand-authored content)
            os.remove(marker)
            # Now disable append_system
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems, enabled=False)
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            # Should NOT report the hand-authored file as stale
            self.assertNotIn("STALE .prime/agent/APPEND_SYSTEM.md", output)
            self.assertEqual(0, status, output)


class HandAuthoredOverwriteTest(_ScriptMixin, unittest.TestCase):
    def test_unmarked_existing_append_system_refused_on_write(self):
        """Existing APPEND_SYSTEM without a marker must not be overwritten."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            agent_dir = os.path.join(root, ".prime", "agent")
            os.makedirs(agent_dir, exist_ok=True)
            out = os.path.join(agent_dir, "APPEND_SYSTEM.md")
            with open(out, "w", encoding="utf-8") as fh:
                fh.write("hand authored prompt\n")
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems)
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn("REFUSING", output)
            self.assertIn("no valid", output)
            with open(out, encoding="utf-8") as fh:
                self.assertEqual("hand authored prompt\n", fh.read())
            self.assertFalse(os.path.isfile(out + ".generated"))


class SymlinkOutputTest(_ScriptMixin, unittest.TestCase):
    def test_symlink_output_refused_on_write(self):
        """Writing to a path that is a symlink must be refused."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            # Create a symlink at the output path
            os.makedirs(os.path.join(root, ".prime", "agent"), exist_ok=True)
            target = os.path.join(root, "external_target.md")
            with open(target, "w", encoding="utf-8") as fh:
                fh.write("external\n")
            link_path = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md")
            os.symlink(target, link_path)
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems)
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn("REFUSING", output)
            self.assertIn("symlink", output)

    def test_directory_destination_refused_before_any_write(self):
        """A directory at a write destination must fail closed before mutation."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            agent_dir = os.path.join(root, ".prime", "agent")
            os.makedirs(agent_dir, exist_ok=True)
            out = os.path.join(agent_dir, "APPEND_SYSTEM.md")
            # Marker path is a directory (not a regular file). Leave content
            # absent so the ownership check does not fire first.
            os.makedirs(out + ".generated", exist_ok=True)
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems)
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn("REFUSING", output)
            self.assertIn("not a regular file", output)
            self.assertFalse(os.path.isfile(out))

    def test_disabled_removes_dangling_generated_symlink(self):
        """When disabled with a valid marker, dangling content symlink is deleted."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems)
            )
            _write_sidecars(root, rules=rules)
            self.run_script(root, "--write")
            out = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md")
            marker = out + ".generated"
            self.assertTrue(os.path.isfile(out))
            self.assertTrue(os.path.isfile(marker))
            os.remove(out)
            os.symlink("/nonexistent/append-system-target", out)
            self.assertTrue(os.path.islink(out))
            self.assertFalse(os.path.isfile(out))
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems, enabled=False)
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("STALE .prime/agent/APPEND_SYSTEM.md", output)
            self.assertIn("STALE .prime/agent/APPEND_SYSTEM.md.generated", output)
            status, _ = self.run_script(root, "--write")
            self.assertEqual(0, status)
            self.assertFalse(os.path.lexists(out))
            self.assertFalse(os.path.isfile(marker))


class AngleBracketTitleTest(unittest.TestCase):
    def test_angle_bracket_link_with_title_rewritten(self):
        """Angle-bracket destination with a title should rewrite the URL and preserve the title."""
        body = '[guide](<../skills/alignment/SKILL.md> "Alignment")'
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("../../.agents/skills/alignment/SKILL.md", result)
        self.assertIn('"Alignment"', result)
        self.assertNotIn("<../skills", result)


class EnabledBooleanValidationTest(_ScriptMixin, unittest.TestCase):
    def test_string_enabled_value_fails_closed(self):
        """A string 'false' for enabled must be rejected, not treated as truthy."""
        with tempfile.TemporaryDirectory() as root:
            _write_sidecars(
                root,
                rules=_disabled_sidecar(
                    append_system={
                        "enabled": "false",
                        "path": ".prime/agent/APPEND_SYSTEM.md",
                        "rules": ["general"],
                        "always_on": ["general"],
                    }
                ),
            )
            _write_rule(root, "general", "# general\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(["general"], include_voice=True))
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("enabled must be a boolean", output)


class AlwaysApplyCommentTest(unittest.TestCase):
    def test_always_apply_true_with_inline_comment_detected(self):
        """alwaysApply: true # comment should be detected as always-apply."""
        rule_text = (
            "---\nalwaysApply: true # every turn\ndescription: test\n---\n\nbody\n"
        )
        front = rule_text[4 : rule_text.find("\n---\n", 4)]
        self.assertTrue(sync_surfaces._ALWAYS_APPLY_TRUE_RE.search(front))

    def test_always_apply_capitalized_key_not_detected(self):
        """AlwaysApply (capitalized key) should NOT be detected — YAML keys are case-sensitive."""
        rule_text = "---\nAlwaysApply: true\ndescription: test\n---\n\nbody\n"
        front = rule_text[4 : rule_text.find("\n---\n", 4)]
        self.assertFalse(sync_surfaces._ALWAYS_APPLY_TRUE_RE.search(front))


class ReferenceAngleBracketDestTest(unittest.TestCase):
    def test_ref_def_with_spaces_keeps_angle_brackets(self):
        """Reference definitions with spaces in the destination should retain angle brackets."""
        body = "[guide]: <../docs/my guide.md>\n"
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("<", result)
        self.assertIn(">", result)
        self.assertIn("my guide.md", result)


class CodeSpanLinkSkipTest(unittest.TestCase):
    def test_link_in_inline_code_not_rewritten(self):
        """Links inside inline code spans should not be rewritten."""
        body = "See `[x](../sample.md)` for details."
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("../sample.md", result)
        self.assertNotIn("../../.agents/sample.md", result)

    def test_link_in_fenced_block_not_rewritten(self):
        """Links inside fenced code blocks should not be rewritten."""
        body = "```\n[x](../sample.md)\n```\n"
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("../sample.md", result)
        self.assertNotIn("../../.agents/sample.md", result)

    def test_link_in_longer_outer_fence_not_rewritten(self):
        """A 4-backtick fence wrapping a triple-backtick example keeps links."""
        body = "````markdown\n```\n[x](../sample.md)\n```\n````\n"
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("../sample.md", result)
        self.assertNotIn("../../.agents/sample.md", result)

    def test_normal_link_outside_code_still_rewritten(self):
        """Normal links outside code spans should still be rewritten."""
        body = "See [x](../sample.md) and `[y](../other.md)`."
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("../../.agents/sample.md", result)
        self.assertIn("../other.md", result)


class SymlinkParentTest(_ScriptMixin, unittest.TestCase):
    def test_nested_path_rejected_by_validator(self):
        """A nested path under .prime/agent/ must be rejected (top-level only)."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            rules = _disabled_sidecar(
                append_system=_append_cfg(
                    rules=stems,
                    always_on=stems,
                    path=".prime/agent/sub/APPEND_SYSTEM.md",
                )
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn("top-level", output)

    def test_generated_suffix_rejected(self):
        """A path ending in .generated must be rejected."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            rules = _disabled_sidecar(
                append_system=_append_cfg(
                    rules=stems,
                    always_on=stems,
                    path=".prime/agent/APPEND_SYSTEM.md.generated",
                )
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn(".generated", output)


class MissingEnabledKeyTest(_ScriptMixin, unittest.TestCase):
    def test_missing_enabled_key_fails_closed(self):
        """An append_system without an enabled key must fail closed."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            rules = _disabled_sidecar(
                append_system={
                    "path": ".prime/agent/APPEND_SYSTEM.md",
                    "rules": stems,
                    "always_on": stems,
                }
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("enabled key is required", output)


class RefDefParenthesizedTitleTest(unittest.TestCase):
    def test_ref_def_with_parenthesized_title(self):
        """Reference definitions with parenthesized titles should be rewritten."""
        body = "[guide]: ../skills/alignment/SKILL.md (Alignment)\n"
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("../../.agents/skills/alignment/SKILL.md", result)
        self.assertIn("(Alignment)", result)


class AgentsCommentLinkTest(unittest.TestCase):
    def test_links_in_html_comments_not_counted(self):
        """Links inside HTML comments in AGENTS.md should not be counted as active."""
        with tempfile.TemporaryDirectory() as root:
            ag_path = os.path.join(root, "AGENTS.md")
            with open(ag_path, "w", encoding="utf-8") as fh:
                fh.write(
                    "# AGENTS.md\n## Always in force\n\n"
                    "<!-- [rule](./.agents/rules/dummy.md) -->\n"
                    "- see [.agents/rules/alpha.md](./.agents/rules/alpha.md)\n"
                    "\n## Routing\n\n- later\n"
                )
            links = sync_surfaces.parse_agents_always_on_rule_links(root)
            self.assertIn("alpha", links)
            self.assertNotIn("dummy", links)


class TildeFenceLinkSkipTest(unittest.TestCase):
    def test_link_in_tilde_fenced_block_not_rewritten(self):
        """Links inside tilde-fenced code blocks should not be rewritten."""
        body = "~~~\n[x](../sample.md)\n~~~\n"
        result = sync_surfaces.rewrite_relative_links(
            body, ".agents/rules", ".prime/agent"
        )
        self.assertIn("../sample.md", result)
        self.assertNotIn("../../.agents/sample.md", result)


class NonMarkdownOutputTest(_ScriptMixin, unittest.TestCase):
    def test_non_md_output_rejected(self):
        """A non-.md output path should be rejected."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            rules = _disabled_sidecar(
                append_system=_append_cfg(
                    rules=stems,
                    always_on=stems,
                    path=".prime/agent/settings.json",
                )
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--write")
            self.assertEqual(1, status)
            self.assertIn(".md", output)


class SymlinkCheckStaleTest(_ScriptMixin, unittest.TestCase):
    def test_symlinked_output_reported_stale_on_check(self):
        """A symlinked output should be reported as stale by --check."""
        with tempfile.TemporaryDirectory() as root:
            stems = ["alpha"]
            _write_rule(root, "alpha", "# alpha\n\nbody\n")
            with open(os.path.join(root, "AGENTS.md"), "w", encoding="utf-8") as fh:
                fh.write(_agents_md_for(stems))
            os.makedirs(os.path.join(root, ".prime", "agent"), exist_ok=True)
            target = os.path.join(root, "target.md")
            with open(target, "w", encoding="utf-8") as fh:
                fh.write("content\n")
            link = os.path.join(root, ".prime", "agent", "APPEND_SYSTEM.md")
            os.symlink(target, link)
            rules = _disabled_sidecar(
                append_system=_append_cfg(rules=stems, always_on=stems)
            )
            _write_sidecars(root, rules=rules)
            status, output = self.run_script(root, "--check")
            self.assertEqual(1, status)
            self.assertIn("STALE", output)


if __name__ == "__main__":
    unittest.main()
