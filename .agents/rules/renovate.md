---
description: Renovate configuration
globs: renovate.json
alwaysApply: false
---

# Renovate configuration

Renovate bot and dependency configuration for this project. Configuration
docs: https://docs.renovatebot.com/self-hosted-configuration.

A regex manager manages helm release versions; every helm release in the
repository must use it. Format (matching the chart's source, directly above the `version:` line it tracks):

```
# HTTP chart repository
# renovate: datasource=helm registryUrl=https://my-registry.com depName=my-release

# OCI chart registry (e.g. the project's own generic-app chart)
# renovate: datasource=docker depName=registry.gitlab.com/apocrathia/homelab/generic-app
```

When editing this file, fix the issues at hand and leave the configuration
better than you found it.
