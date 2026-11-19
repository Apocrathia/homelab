#!/usr/bin/env python3
"""Self-test for mr_change_summary_prompt.py — stdlib only, no framework.

Run from the repo root:

    python3 .gitlab/scripts/mr_change_summary_prompt_test.py

Exercises the version-pin hunk filter (pure function) plus the env-driven
CLI: prompt rendering, numstat section, filtered-diff sidecar, byte cap.
"""

from __future__ import annotations

import contextlib
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import mr_change_summary_prompt as builder


SYNTHETIC_PIN_PROSE_DIFF = """\
diff --git a/flux/manifests/03-services/observability/grafana/helmrelease.yaml b/flux/manifests/03-services/observability/grafana/helmrelease.yaml
index 1a2b3c4..5d6e7f8 100644
--- a/flux/manifests/03-services/observability/grafana/helmrelease.yaml
+++ b/flux/manifests/03-services/observability/grafana/helmrelease.yaml
@@ -20,7 +20,7 @@ spec:
   chart:
     spec:
       chart: grafana
-      version: 8.0.0
+      version: 8.1.0
+      # renovate: datasource=helm registryUrl=https://grafana.github.io/helm-charts
       sourceRef:
         kind: HelmRepository
@@ -60,7 +60,7 @@ spec:
   values:
     image:
-      tag: 11.0.0
+      tag: 11.1.0
       repository: grafana/grafana
@@ -90,7 +90,7 @@ spec:
     ingress:
       enabled: true
-      # Old prose note explaining the hostname choice.
+      # New prose note explaining the hostname choice.
       host: grafana.example.com
"""

RENOVATE_CONFIG_DIFF = """\
diff --git a/renovate.json b/renovate.json
index 9f8e7d6..c5b4a32 100644
--- a/renovate.json
+++ b/renovate.json
@@ -12,7 +12,7 @@
   "timezone": "America/New_York",
-  "schedule": ["before 5am"],
+  "schedule": ["before 6am"],
   "prHourlyLimit": 0,
diff --git a/config/.renovaterc.json5 b/config/.renovaterc.json5
index 1111111..2222222 100644
--- a/config/.renovaterc.json5
+++ b/config/.renovaterc.json5
@@ -3,5 +3,5 @@
 {
-  "enabled": true
+  "enabled": false
diff --git a/docs/other-config.json b/docs/other-config.json
index 3333333..4444444 100644
--- a/docs/other-config.json
+++ b/docs/other-config.json
@@ -1,3 +1,3 @@
 {
-  "schedule": "daily"
+  "schedule": "weekly"
"""

SHA256_DIGEST_DIFF = """\
diff --git a/flux/manifests/04-apps/tools/kustomization.yaml b/flux/manifests/04-apps/tools/kustomization.yaml
index abcd123..efed456 100644
--- a/flux/manifests/04-apps/tools/kustomization.yaml
+++ b/flux/manifests/04-apps/tools/kustomization.yaml
@@ -40,7 +40,7 @@ spec:
      containers:
        - name: app
-          image: registry.example.com/app@sha256:1111111111111111111111111111111111111111111111111111111111111111
+          image: registry.example.com/app@sha256:2222222222222222222222222222222222222222222222222222222222222222
          ports:
            - containerPort: 8080
"""

PROSE_ONLY_DIFF = """\
diff --git a/docs/some-guide.md b/docs/some-guide.md
index 1234567..89abcde 100644
--- a/docs/some-guide.md
+++ b/docs/some-guide.md
@@ -1,4 +1,4 @@
 # Some Guide

-Old intro paragraph with plenty of words.
+New intro paragraph with even more words.

 Use it wisely.
"""

_ENV_KEYS = (
    "PROMPT_OUTPUT_PATH",
    "DIFF_PATH",
    "CHANGED_FILES_PATH",
    "NUMSTAT_PATH",
    "FILTERED_DIFF_OUTPUT_PATH",
    "DIFF_MAX_BYTES",
    "CHANGED_FILES_MAX_LINES",
    "DESC_MAX_CHARS",
    "CI_PROJECT_PATH",
    "CI_PROJECT_ID",
    "CI_MERGE_REQUEST_IID",
    "CI_MERGE_REQUEST_SOURCE_BRANCH_NAME",
    "CI_MERGE_REQUEST_TARGET_BRANCH_NAME",
    "CI_MERGE_REQUEST_PROJECT_URL",
    "CI_MERGE_REQUEST_TITLE",
    "CI_MERGE_REQUEST_DESCRIPTION",
)


@contextlib.contextmanager
def _patched_env(overrides: dict[str, str]):
    """Temporarily replace the builder-relevant env with overrides."""
    saved = {key: os.environ.pop(key, None) for key in _ENV_KEYS}
    os.environ.update(overrides)
    try:
        yield
    finally:
        for key, value in saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def _run_builder(
    tmp: Path,
    *,
    diff: str,
    files: str,
    numstat: str | None = None,
    write_filtered: bool = False,
    diff_max_bytes: str | None = None,
) -> tuple[str, str | None]:
    """Run builder.main() against temp files. Returns (prompt, sidecar)."""
    (tmp / "diff.patch").write_text(diff, encoding="utf-8")
    (tmp / "changed-files.txt").write_text(files, encoding="utf-8")
    if numstat is not None:
        (tmp / "numstat.txt").write_text(numstat, encoding="utf-8")
    overrides: dict[str, str] = {
        "PROMPT_OUTPUT_PATH": str(tmp / "prompt.md"),
        "DIFF_PATH": str(tmp / "diff.patch"),
        "CHANGED_FILES_PATH": str(tmp / "changed-files.txt"),
        "CI_PROJECT_PATH": "apocrathia/homelab",
        "CI_PROJECT_ID": "12345",
        "CI_MERGE_REQUEST_IID": "42",
        "CI_MERGE_REQUEST_SOURCE_BRANCH_NAME": "renovate/grafana-8.x",
        "CI_MERGE_REQUEST_TARGET_BRANCH_NAME": "main",
        "CI_MERGE_REQUEST_PROJECT_URL": "https://gitlab.com/apocrathia/homelab",
        "CI_MERGE_REQUEST_TITLE": "chore(deps): update grafana",
    }
    if numstat is not None:
        overrides["NUMSTAT_PATH"] = str(tmp / "numstat.txt")
    if write_filtered:
        overrides["FILTERED_DIFF_OUTPUT_PATH"] = str(tmp / "filtered.diff")
    if diff_max_bytes is not None:
        overrides["DIFF_MAX_BYTES"] = diff_max_bytes
    with _patched_env(overrides):
        rc = builder.main()
    assert rc == 0, f"builder main() exited {rc}"
    prompt = (tmp / "prompt.md").read_text(encoding="utf-8")
    sidecar = (
        (tmp / "filtered.diff").read_text(encoding="utf-8") if write_filtered else None
    )
    return (prompt, sidecar)


def test_pin_hunk_kept_prose_hunk_dropped() -> None:
    filtered, stats = builder.filter_version_pin_hunks(SYNTHETIC_PIN_PROSE_DIFF)
    assert "version: 8.1.0" in filtered
    assert "tag: 11.1.0" in filtered
    assert "# renovate: datasource=helm" in filtered
    assert "New prose note" not in filtered
    assert "Old prose note" not in filtered
    # File header survives for files with kept hunks.
    assert (
        "diff --git a/flux/manifests/03-services/observability/grafana/helmrelease.yaml"
        in filtered
    )
    assert stats.hunks_in == 3
    assert stats.hunks_out == 2
    assert stats.bytes_out < stats.bytes_in


def test_prompt_includes_pin_hunk_excludes_prose_hunk() -> None:
    with tempfile.TemporaryDirectory() as td:
        prompt, _ = _run_builder(
            tmp=Path(td),
            diff=SYNTHETIC_PIN_PROSE_DIFF,
            files="M\tflux/manifests/03-services/observability/grafana/helmrelease.yaml\n",
        )
    assert "## Filtered diff" in prompt
    assert "version: 8.1.0" in prompt
    assert "tag: 11.1.0" in prompt
    assert "New prose note" not in prompt


def test_renovate_config_hunks_always_kept() -> None:
    filtered, stats = builder.filter_version_pin_hunks(RENOVATE_CONFIG_DIFF)
    assert '"schedule": ["before 6am"]' in filtered
    assert '"enabled": false' in filtered
    # Same-shaped hunk in a non-Renovate JSON file still drops.
    assert '"schedule": "weekly"' not in filtered
    assert stats.hunks_in == 3
    assert stats.hunks_out == 2


def test_sha256_digest_pin_hunk_kept() -> None:
    filtered, stats = builder.filter_version_pin_hunks(SHA256_DIGEST_DIFF)
    assert "sha256:2222" in filtered
    assert stats.hunks_in == 1
    assert stats.hunks_out == 1


def test_prose_only_mr_keeps_lists_zero_hunks() -> None:
    with tempfile.TemporaryDirectory() as td:
        prompt, _ = _run_builder(
            tmp=Path(td),
            diff=PROSE_ONLY_DIFF,
            files="M\tdocs/some-guide.md\n",
            numstat="1\t1\tdocs/some-guide.md\n",
        )
    assert "## Changed files" in prompt
    assert "docs/some-guide.md" in prompt
    assert "## Change volume (additions/deletions per file)" in prompt
    assert "1\t1\tdocs/some-guide.md" in prompt
    assert "## Filtered diff" in prompt
    assert "@@" not in prompt  # zero diff hunks survive
    assert "New intro paragraph" not in prompt  # prose content excluded


def test_numstat_section_omitted_when_unset() -> None:
    with tempfile.TemporaryDirectory() as td:
        prompt, _ = _run_builder(
            tmp=Path(td),
            diff=PROSE_ONLY_DIFF,
            files="M\tdocs/some-guide.md\n",
        )
    assert "## Change volume" not in prompt
    assert "## Changed files" in prompt


def test_filtered_diff_output_path_written() -> None:
    with tempfile.TemporaryDirectory() as td:
        _, sidecar = _run_builder(
            tmp=Path(td),
            diff=SYNTHETIC_PIN_PROSE_DIFF,
            files="M\tflux/manifests/03-services/observability/grafana/helmrelease.yaml\n",
            write_filtered=True,
        )
    expected, _stats = builder.filter_version_pin_hunks(SYNTHETIC_PIN_PROSE_DIFF)
    assert sidecar == expected
    assert "version: 8.1.0" in sidecar
    assert "New prose note" not in sidecar


def test_diff_max_bytes_caps_filtered_output() -> None:
    with tempfile.TemporaryDirectory() as td:
        prompt, _ = _run_builder(
            tmp=Path(td),
            diff=SYNTHETIC_PIN_PROSE_DIFF,
            files="M\tflux/manifests/03-services/observability/grafana/helmrelease.yaml\n",
            diff_max_bytes="64",
        )
    assert "truncated=True" in prompt
    assert "original_bytes=" in prompt
    assert "filtered_bytes=" in prompt


def main() -> int:
    tests = [
        test_pin_hunk_kept_prose_hunk_dropped,
        test_prompt_includes_pin_hunk_excludes_prose_hunk,
        test_renovate_config_hunks_always_kept,
        test_sha256_digest_pin_hunk_kept,
        test_prose_only_mr_keeps_lists_zero_hunks,
        test_numstat_section_omitted_when_unset,
        test_filtered_diff_output_path_written,
        test_diff_max_bytes_caps_filtered_output,
    ]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"{len(tests)} tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
