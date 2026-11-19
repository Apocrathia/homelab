# dependency-review source

Python source for the hourly dependency-review sweep. `invoke.py` lists
Renovate MRs, `facts.py` collects upstream facts, then hard gates and an
A2A judgment turn decide MR notes, labels, and approval. Merge stays with
the operator. `selfcheck.py` runs the built-in checks.

> **Navigation**: [← Back to dependency-review-sweep README](../README.md)
