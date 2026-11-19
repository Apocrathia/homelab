# platforms: per-platform Fleet assets

Reusable GitOps assets grouped by platform: `all/` for cross-platform
content, then `ios/`, `ipados/`, `linux/`, `macos/`, and `windows/`. Fleet
YAML files reference them by path (for example the
`paths: ../platforms/**/policies/**/*.yml` glob in `fleets/home.yml`).

> **Navigation**: [← Back to Fleet README](../README.md)
