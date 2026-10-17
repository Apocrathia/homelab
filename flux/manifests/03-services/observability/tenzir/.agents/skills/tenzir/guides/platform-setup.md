---
title: "Overview"
canonical: https://tenzir.com/docs/guides/platform-setup
source: https://tenzir.com/docs/guides/platform-setup.md
section: "Docs"
---

# Overview

> The Tenzir Platform acts as a fleet management control plane for Tenzir Nodes. Use its web interface to explore data, create pipelines, and build dashboards.

The **Tenzir Platform** acts as a fleet management control plane for Tenzir Nodes. Use its web interface to explore data, create pipelines, and build dashboards.

Sovereign Edition required

This guide shows you how to set up the platform on your own premises with the [Sovereign Edition](https://tenzir.com/pricing.md). We also offer a hosted cloud version of the platform at [app.tenzir.com](https://app.tenzir.com).

## Services

The platform integrates three types of services, as the diagram below illustrates:

Platform Services

1. **Internal**: Tenzir provides the (gray) internal services. They are core to the platform’s operation.
2. **External**: You provide the (blue) external services. We do not ship these, so you must bring your own.
3. **Configurable**: You can use our bundled (yellow) configurable services or provide your own.

## Deployment options

There exist two ways to deploy the platform:

1. **Cloud**: Deploy the platform on a cloud provider.
2. **On-premises**: Deploy the platform on your own infrastructure.

### Get started in the cloud

For Amazon, read our [AWS deployment guide](platform-setup/deploy-on-aws.md) for an integrated approach to deploying the platform services in your own account using a **CloudFormation** template.

For Azure and GCP, we are still working on providing turnkey deployment setups.

### Get started on your own premises

Follow these steps to set up the platform on your own premises:

1. [Choose a scenario](platform-setup/choose-a-scenario.md): we package several deployment options that match common deployments.

2. Configure the services: you must set up the external API endpoints so nodes and browsers can interact with the platform.

   * [Configure reverse proxy](platform-setup/configure-reverse-proxy.md)
   * [Configure internal services](platform-setup/configure-internal-services.md)
   * [Configure identity provider](platform-setup/configure-identity-provider.md)
   * [Configure database](platform-setup/configure-database.md)
   * [Configure blob storage](platform-setup/configure-blob-storage.md)

   You may skip some steps depending on your chosen scenario.

3. [Run the platform](platform-setup/run-the-platform.md): After you create a configuration, start the platform.

Usage guides

The above guides cover platform deployment. For platform management, see our user-centric guides:

1. [Configure workspaces](platform-management/configure-workspaces.md)
2. [Configure dashboards](platform-management/configure-dashboards.md)
3. [Use ephemeral nodes](platform-management/use-ephemeral-nodes.md)
