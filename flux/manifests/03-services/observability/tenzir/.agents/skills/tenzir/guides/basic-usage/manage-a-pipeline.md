---
title: "Manage a pipeline"
canonical: https://tenzir.com/docs/guides/basic-usage/manage-a-pipeline
source: https://tenzir.com/docs/guides/basic-usage/manage-a-pipeline.md
section: "Docs"
---

# Manage a pipeline

> This guide shows you how to control pipeline lifecycles through the app or API. A pipeline transitions through the following states:

This guide shows you how to control pipeline lifecycles through the app or API. A pipeline transitions through the following states:

* **Created**: the pipeline has just been deployed.
* **Running**: the pipeline is actively processing data.
* **Completed**: there is no more data to process.
* **Failed**: an error occurred.
* **Paused**: the user interrupted execution, keeping in-memory state.
* **Stopped**: the user interrupted execution, resetting all in-memory state.

The [app](https://app.tenzir.com/) or [API](../../reference/operators/openapi.md) allow you to manage the pipeline lifecycles.

## Change the state of a pipeline

In the [app](https://app.tenzir.com/overview), an icon visualizes the current pipeline state. Change a state as follows:

1. Click the checkbox on the left next to the pipeline, or the checkbox in the column header to select all pipelines.
2. Click the button corresponding to the desired action, i.e., *Start*, *Pause*, *Stop*, or *Delete*.
3. Confirm your selection.

For the [API](../../reference/operators/openapi.md), use the following endpoints based on the desired actions:

* Start, pause, and stop: `/pipeline/update`
* Delete: `/pipeline/delete`

## Understand pipeline state transitions

The diagram below illustrates the various states, where circles correspond to states and arrows to state transitions:

Pipeline States

The grey buttons indicate the actions you, as a user, can take to transition into a different state. The orange arrows are transitions that take place automatically based on system events.
