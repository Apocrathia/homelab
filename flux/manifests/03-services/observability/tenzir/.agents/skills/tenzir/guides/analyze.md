---
title: "Overview"
description: "Summarize event streams and compare current activity with prior behavior."
canonical: https://tenzir.com/docs/guides/analyze
source: https://tenzir.com/docs/guides/analyze.md
section: "Docs"
---

# Overview

> Summarize event streams and compare current activity with prior behavior.

Analysis turns telemetry into statements about activity. It includes [aggregation](https://docs.tenzir.com/guides/aggregate-event-streams), which reduces events into counts and other statistics, as well as comparisons that preserve or score individual events. The result can feed a dashboard, annotate an event, or become evidence for a detection.

Choose the guide that matches your task:

* [Aggregate event streams](https://docs.tenzir.com/guides/aggregate-event-streams) to group events and calculate one or more aggregate values.
* [Shape aggregation results](https://docs.tenzir.com/guides/shape-aggregation-results) to control which records leave an aggregation.
* [Window event streams](https://docs.tenzir.com/guides/window-event-streams) to calculate over bounded time or event-count ranges.
* [Calculate aggregate statistics](https://docs.tenzir.com/guides/calculate-aggregate-statistics) to choose functions for counts, distributions, and reusable statistical models.
* [Find unseen and rare values](https://docs.tenzir.com/guides/find-unseen-and-rare-values) when one categorical or numeric value may be unusual.
* [Set adaptive thresholds from a baseline](https://docs.tenzir.com/guides/set-adaptive-thresholds-from-a-baseline) when one fixed threshold does not fit every agent, operation, or workload.
* [Identify distribution drift](https://docs.tenzir.com/guides/identify-distribution-drift) when individual values remain plausible but the population has changed.
* [Find cardinality spikes](https://docs.tenzir.com/guides/find-cardinality-spikes) when the number of distinct sessions or other entities changes sharply.

The statistical examples use coding-agent telemetry normalized to [OCSF](https://schema.ocsf.io/) with our Codex and Claude Code packages. They draw on [Authorize Session](https://schema.ocsf.io/classes/authorize_session), [API Activity](https://schema.ocsf.io/classes/api_activity), [Application Lifecycle](https://schema.ocsf.io/classes/application_lifecycle), and [Script Activity](https://schema.ocsf.io/classes/script_activity) events. The [AI Operation profile](https://schema.ocsf.io/profiles/ai_operation) provides the common `ai_agent` object.

## Create a finding when needed

Each guide produces evidence about current activity. Your detection policy decides whether that evidence warrants analyst review. When it does, continue with our guide on [creating an OCSF Detection Finding](detect/model-detections-in-ocsf.md#create-a-detection-finding). It covers stable finding identity, source-event references, evidence, triage, and lifecycle fields.
