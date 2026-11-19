# `review-loop` — local verify before ship (skill)

`SKILL.md` defines the local verify loop before `draft-commit`: format,
lint, link and discovery checks, `helm`/`kustomize` renders, and Trivy on
changed paths, capped at about five iterations. Non-trivial manifests hand
off to the `manifest-verifier` persona.

> **Navigation**: [← Back to Skills README](../README.md)
