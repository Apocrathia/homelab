# authentik-app — shared Authentik integration module

Root module (no wrapper — import blocks are root-only) with three provider
modes: proxy, oidc, and library. The generic-app chart composes the standard
surface from its authentik values; per-app varmaps merge adoption ids on top.
`imports.tf` holds the in-place adoption recipe for blueprint-era objects.

> **Navigation**: [← Back to modules — shared OpenTofu modules](../README.md)
