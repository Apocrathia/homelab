# `manifest-verifier`: local validation arbiter (persona)

`agent.md` charters the verifier role that runs after the
implementer↔reviewer pair returns pass: Prettier/yamllint, `helm template`,
secrets scan, and Trivy on changed paths. It produces evidence that a diff is
coherent before anyone applies or commits it.

> **Navigation**: [← Back to Personas README](../README.md)
