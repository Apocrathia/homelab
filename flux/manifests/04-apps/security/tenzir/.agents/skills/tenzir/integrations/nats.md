---
title: "NATS integration"
description: "NATS is a messaging system for services, edge deployments, and cloud-native applications. Tenzir integrates with NATS JetStream to consume messages from subjects and publish events back to subjects."
canonical: https://tenzir.com/integrations/nats
source: https://tenzir.com/integrations/nats.md
section: "Integrations"
---

# NATS integration

> NATS is a messaging system for services, edge deployments, and cloud-native applications. Tenzir integrates with NATS JetStream to consume messages from subjects and publish events back to subjects.

[NATS](https://nats.io/) is a messaging system for services, edge deployments, and cloud-native applications. Tenzir integrates with NATS JetStream to consume messages from subjects and publish events back to subjects.

Use [`from_nats`](https://tenzir.com/docs/reference/operators/from_nats.md) to consume JetStream messages and [`to_nats`](https://tenzir.com/docs/reference/operators/to_nats.md) to publish messages.

## Examples

### Consume JSON messages from a subject

```tql
from_nats "alerts", durable="tenzir-alerts"
this = string(message).parse_json()
```

The NATS server must have a JetStream stream that captures the subject you consume from.

### Publish events to a subject

```tql
subscribe "alerts"
to_nats "alerts"
```

By default, [`to_nats`](https://tenzir.com/docs/reference/operators/to_nats.md) serializes each event with `this.print_ndjson()`.

### Connect to a secured NATS server

```tql
from_nats "alerts",
  url="tls://nats.example.com:4222",
  auth={token: secret("NATS_TOKEN")},
  tls={}
this = string(message).parse_json()
```

## See Also

* [`from_nats`](https://tenzir.com/docs/reference/operators/from_nats.md)
* [`to_nats`](https://tenzir.com/docs/reference/operators/to_nats.md)
* [Read from message brokers](../guides/collect/read-from-message-brokers.md)
* [Send to destinations](../guides/route/send-to-destinations.md)
