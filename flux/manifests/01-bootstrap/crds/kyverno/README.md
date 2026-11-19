# Kyverno CRDs

Pulls the core, report, and policy-report CRDs from pinned Kyverno GitHub
releases (Renovate comments track the tags). Not applied: the entry in the
parent `kustomization.yaml` is commented out with a "managed by Helm chart"
note, so the Kyverno chart owns its CRDs.

> **Navigation**: [← Back to CRDs README](../README.md)
