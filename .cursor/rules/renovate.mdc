---
description: Renovate configuration
globs: renovate.json
alwaysApply: false
---

# Renovate configuration

This is the Renovate configuration file for the project. It is used to configure the Renovate bot and the dependencies it will manage.

The documentation for the configuration can be found at https://docs.renovatebot.com/self-hosted-configuration.

We are using a regex manager to manage the versions of helm releases. This is a vital part of the configuration and you must strive to get every helm release in the repository to use the regex manager.

To leverage the regex manager, you must use the following format:

```
# renovate: datasource=helm registryUrl=https://my-registry.com depName=my-release
```

Your goal is to update the configuration to fix the issues and improve the configuration.
