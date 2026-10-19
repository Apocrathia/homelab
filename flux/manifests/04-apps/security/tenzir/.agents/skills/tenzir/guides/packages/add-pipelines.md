---
title: "Add pipelines"
canonical: https://tenzir.com/docs/guides/packages/add-pipelines
source: https://tenzir.com/docs/guides/packages/add-pipelines.md
section: "Docs"
---

# Add pipelines

> This guide shows you how to add deployable pipelines to your package. You’ll learn what belongs in a packaged pipeline and which frontmatter options control how it runs. Our guide on creating a package compares the two kinds of capability, which is the choice that comes first.

This guide shows you how to add deployable pipelines to your package. You’ll learn what belongs in a packaged pipeline and which frontmatter options control how it runs. Our guide on [creating a package](create-a-package.md#operators-versus-pipelines) compares the two kinds of capability, which is the choice that comes first.

Prefer operators

Ship reusable [user-defined operators](add-operators.md) and let users write the pipelines around them. A packaged pipeline hard-codes one deployment’s sources, destinations, and schedule, which users then have to configure through installation inputs instead of operator arguments. Add a pipeline when the package must own a running workflow, such as keeping a context current.

## Create a pipeline

The `pipelines` directory contains fully deployable TQL pipelines. Unlike [user-defined operators (UDOs)](add-operators.md), pipelines are complete units that must begin with an input operator and end with an output operator.

A packaged pipeline commits one fixed end-to-end use case: a source, the package’s transformation, and a destination.

pipelines/api-to-ocsf.tql

```tql
every 1h {
  from_http "https://api.example.com/events" {
    read_json
  }
}
vendor::ocsf::map
publish "ocsf"
```

The source and the destination belong to the deployment, so they use builtins, and the package contributes `vendor::ocsf::map`. Because that operator stays callable on its own, a user whose deployment differs writes their own pipeline around it instead of copying this file.

When you install the package, the node automatically runs any enabled pipelines. Which operator does the transforming depends on what collection produces, which our tutorial on [onboarding a data source](../../tutorials/onboard-a-data-source.md#fit-it-into-the-data-lifecycle) works through.

Use enabled pipelines only when the package should take action as soon as it is installed. Ship optional operational workflows as disabled templates unless automatic execution is the package’s core behavior.

## Configure pipeline behavior

Configure pipelines using YAML frontmatter at the beginning of the TQL file. The following options are available:

### `name` and `description`

Add metadata to identify the pipeline in the UI:

pipelines/update-context.tql

```tql
---
name: Update Threat Intel
description: >
  Collects threat intelligence hourly and updates the lookup table.
---


every 1h {
  from_http "https://feeds.example.com/iocs.json" {
    read_json
  }
}
context_update "threat-intel", key=indicator
```

### `restart-on-error`

Configure automatic restart behavior when the pipeline encounters an error. By default, pipelines stop running and show an error state.

pipelines/resilient-collect.tql

```tql
---
restart-on-error: 5m  # Restart after 5 minutes on failure
---


every 1h {
  from_http "https://api.example.com/data"
}
publish "raw-data"
```

Options:

* Omit the option, or set it to `null` or `false` to disable automatic restarts
* Set it to `true` to enable restarts with a default delay of 1 minute
* Set it to a valid duration (for example, `5m`, `1h`) to enable restarts with a custom delay

### `disabled`

Set to `true` to disable the pipeline. Disabled pipelines don’t run when the package is installed, but users can enable them manually.

pipelines/notify-webhook.tql

```tql
---
name: Notify Webhook
description: >
  Sends selected security events to a webhook. Enable manually if needed.
disabled: true
---


subscribe "security-events"
where severity_id >= 3
to_http "https://hooks.example.com/security-events"
```

Ship disabled by default

For opt-in operation, add `disabled: true` to pipeline frontmatter. This ships the pipeline as a template that users must explicitly enable, combining the convenience of ready-made pipelines with predictable installation behavior.

### `unstoppable`

Set to `true` to make the pipeline run automatically and indefinitely. You cannot pause or stop unstoppable pipelines manually. If they complete, they end up in a failed state. If you enable `restart-on-error`, they restart after the specified duration.

pipelines/critical-router.tql

```tql
---
unstoppable: true
restart-on-error: 1m
---


from_kafka "critical-events"
publish "critical-events"
```

### Complete example

Combine multiple options:

pipelines/publish-as-ocsf.tql

```tql
---
name: Publish as OCSF
description: >
  Collects threat intel hourly and publishes OCSF events to the `ocsf` topic.
disabled: true
restart-on-error: 5m
---


every 1h {
  from_http "https://api.example.com/events" {
    read_lines
  }
}
vendor::ocsf::normalize line
publish "ocsf"
```

## See also

* [Create a package](create-a-package.md)
* [Add operators](add-operators.md)
* [Add contexts](add-contexts.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
* [Packages](../../explanations/packages.md)
