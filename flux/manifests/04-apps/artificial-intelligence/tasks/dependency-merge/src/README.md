# dependency-merge source

Python source for the merge and triage sweep. `invoke.py` merges Renovate
MRs already labeled `agent-review:pass` (hard gates: reviewed sha match,
green pipeline, mergeable, no major/infra flags) and posts a daily digest
note on the dependency dashboard for everything skipped. `selfcheck.py`
runs the built-in checks.

> **Navigation**: [← Back to dependency-merge-sweep README](../README.md)
