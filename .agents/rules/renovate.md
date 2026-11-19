---
description: Renovate configuration
globs: renovate.json
alwaysApply: false
---

# Renovate configuration

Renovate bot and dependency configuration for this project. Configuration
docs: https://docs.renovatebot.com/self-hosted-configuration.

A regex manager manages helm release versions; every helm release in the
repository must use it. Format:

```
# renovate: datasource=helm registryUrl=https://my-registry.com depName=my-release
```

When editing this file, fix the issues at hand and leave the configuration
better than you found it.
