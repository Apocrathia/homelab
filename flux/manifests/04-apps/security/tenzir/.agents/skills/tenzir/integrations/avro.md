---
title: "Apache Avro integration"
description: "Decode schema-driven Apache Avro binary data from streams, files, and message brokers."
canonical: https://tenzir.com/integrations/avro
source: https://tenzir.com/integrations/avro.md
section: "Integrations"
---

# Apache Avro integration

> Decode schema-driven Apache Avro binary data from streams, files, and message brokers.

[Apache Avro](https://avro.apache.org) is an open data serialization system with a compact binary encoding and a JSON schema format. Tenzir decodes Avro binary datums into typed events with [`read_avro`](https://tenzir.com/docs/reference/operators/read_avro.md) and [`parse_avro`](https://tenzir.com/docs/reference/functions/parse_avro.md), and decodes Kafka values through [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md) with a schema registry.

Object Container Files embed their writer schema, which [`read_avro`](https://tenzir.com/docs/reference/operators/read_avro.md) uses automatically. Raw binary datums do not embed a schema, so supply the same schema that the producer used to encode them. For Kafka messages with registry schema identifiers, [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md) fetches the writer schema automatically when `schema_registry` is set.

## Choose a decoding path

| Input shape                                               | Tenzir interface                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Kafka values with Confluent-compatible schema identifiers | [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md) with `schema_registry` |
| An Avro Object Container File                             | [`read_avro`](https://tenzir.com/docs/reference/operators/read_avro.md) without `schema`         |
| A byte stream containing consecutive Avro datums          | [`read_avro`](https://tenzir.com/docs/reference/operators/read_avro.md)                          |
| One Avro datum in each `blob` or `string` value           | [`parse_avro`](https://tenzir.com/docs/reference/functions/parse_avro.md)                        |

Use [`parse_avro`](https://tenzir.com/docs/reference/functions/parse_avro.md) for bare datums in message-oriented sources, where each source event preserves one message boundary. Use [`read_avro`](https://tenzir.com/docs/reference/operators/read_avro.md) for a stream or file whose chunk boundaries may split a datum or contain several datums.

Our [message broker guide](../guides/collect/read-from-message-brokers.md#decode-avro-messages) shows how to ingest Kafka messages with a schema registry. The [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md) reference covers registry authentication, TLS, and error handling.

The [`read_avro`](https://tenzir.com/docs/reference/operators/read_avro.md) reference provides file examples, type mappings, and supported codecs. For individual bare datums, the [`parse_avro`](https://tenzir.com/docs/reference/functions/parse_avro.md) reference includes an example using Kafka’s `message` field.

## See Also

* [Kafka](kafka.md)
* [File](file.md)
* [Read from message brokers](../guides/collect/read-from-message-brokers.md)
