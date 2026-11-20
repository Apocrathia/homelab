# `module-regression`: cross-module regression ledger (skill)

`SKILL.md` defines the per-module `REGRESSION.md` ledger audit: each module
records downstream consumers, an executable acceptance command, and a
propagation rule; after a change, run the changed module plus every affected
downstream command and gate delivery on exit codes. `templates/` holds the
example ledger.

> **Navigation**: [← Back to Skills README](../README.md)
