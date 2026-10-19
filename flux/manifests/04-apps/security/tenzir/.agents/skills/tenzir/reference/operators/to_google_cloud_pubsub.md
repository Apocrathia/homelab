---
title: "to_google_cloud_pubsub"
canonical: https://tenzir.com/docs/reference/operators/to_google_cloud_pubsub
source: https://tenzir.com/docs/reference/operators/to_google_cloud_pubsub.md
section: "Docs"
---

# to_google_cloud_pubsub

> Publishes events to a Google Cloud Pub/Sub topic.

Publishes events to a Google Cloud Pub/Sub topic.

```tql
to_google_cloud_pubsub project_id=string, topic_id=string, message=string
```

Authentication

The connector tries to retrieve the appropriate credentials using Google’s [Application Default Credentials](https://google.aip.dev/auth/4110).

## Description

The operator publishes one Pub/Sub message per input event. The message content comes from the `message` expression, which must evaluate to a `string`.

### `project_id = string`

The project to connect to. This must be the project ID, not the display name.

### `topic_id = string`

The Pub/Sub topic to publish to.

### `message = string`

A string to publish as the message.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_google_cloud_pubsub` publishes through its own connection. The operator sets no ordering keys, so Pub/Sub delivers messages without an ordering guarantee either way, and replicating the operator changes nothing for subscribers.

## Examples

### Send alert text to a topic

Publish the `alert_text` field of every event to `alerts-topic`:

```tql
export
where @name == "suricata.alert"
to_google_cloud_pubsub project_id="amazing-project-123456", topic_id="alerts-topic", message=alert_text
```

## See Also

* [`from_google_cloud_pubsub`](https://tenzir.com/docs/reference/operators/from_google_cloud_pubsub.md)
* [Google Cloud Pub/Sub](../../integrations/google/cloud-pubsub.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
