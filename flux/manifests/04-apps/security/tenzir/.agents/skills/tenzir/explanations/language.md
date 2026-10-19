---
title: "Language"
description: "Understand TQL's dataflow model, streaming and batch semantics, and support for events with different schemas."
canonical: https://tenzir.com/docs/explanations/language
source: https://tenzir.com/docs/explanations/language.md
section: "Docs"
---

# Language

> Understand TQL's dataflow model, streaming and batch semantics, and support for events with different schemas.

The **Tenzir Query Language (TQL)** is a dataflow language for processing unstructured byte streams and structured events. A TQL program describes [pipelines](pipeline.md) that collect, parse, transform, and route data without requiring you to manage threads or buffers.

TQL sits between the execution engine and the reusable integrations and packages that build on it:

Four layers from bottom to top: a streaming execution engine with a DAG executor and custom data model; TQL operators and functions; native integrations; and packages for deployable use cases.

The [streaming executor](executor.md) plans a directed acyclic graph (DAG) and processes typed events in columnar batches. TQL supplies the operators, functions, and expressions that describe the work. Our [integrations](https://tenzir.com/product/integrations.md) connect those pipelines to systems such as Syslog, Kafka, S3, Google Cloud, and Azure. Our [packages](packages.md) bundle reusable components for data sources, threat intelligence, and OCSF mappings into deployable use cases.

A sequence of operators in the source does not imply one thread per operator. The executor decides how to group operators, where to create parallel instances, and how data moves between them. Operators in a fused group hand batches directly to each other; bounded channels connect jobs across unfused boundaries. These execution choices are separate from the language constructs you use to express a pipeline.

## Why TQL?

Security data often needs several steps before it can support a detection or investigation: decode a payload, extract fields, normalize types, enrich records, and send the result to another system. TQL expresses those steps in dataflow order.

Its pipeline composition is familiar if you’ve used Unix pipes, Splunk SPL, or Kusto Query Language. Unlike shell pipelines that primarily exchange text, TQL operators can exchange either bytes or typed events. Functions transform nested records and lists as well as scalar values.

The pipeline model supports several ways to develop and maintain that work:

* Build a pipeline incrementally, adding a transformation after checking its input.
* Inspect intermediate results by removing or commenting out downstream operators, as our guide on [debugging field values](../guides/troubleshooting/debug-field-values.md#inspect-the-pipeline-step-by-step) demonstrates.
* Reuse transformations in user-defined operators and packages instead of repeating them across pipelines.

SQL remains useful for querying tables. TQL focuses on composing dataflows that can collect bytes, parse events, enrich records, and deliver results in one program. This is a difference in focus, not a requirement to give up the SQL systems that produce or consume your data.

## Core concepts

Two properties shape how you write TQL: the same operators can process finite and ongoing inputs, and one pipeline can carry events with different schemas.

### Unified streaming and batch processing

TQL uses the same downstream operators for archived data and live streams. For example, a Parquet archive with a typed `timestamp` field can feed a filter directly:

```tql
from_file "s3://bucket/logs/2026-01/*.parquet" { read_parquet }
where timestamp >= 2026-01-15T00:00:00Z
```

The [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md) source instead produces a `message` string by default. For JSON messages, parse the payload and convert its timestamp string before applying the same filter:

```tql
from_kafka "logs"
this = message.parse_json()
timestamp = timestamp.time()
where timestamp >= 2026-01-15T00:00:00Z
```

A finite source ends when it exhausts its input; a live source can wait for future events. Streaming input does not make every operation incremental. For example, [`sort`](https://tenzir.com/docs/reference/operators/sort.md) buffers its input and needs it to end before it can emit a globally sorted result.

### Multi-schema philosophy

A pipeline can carry **heterogeneous data**: firewall logs, DNS queries, and authentication events with different fields and types. Each event still has a schema. TQL does not require all events in a pipeline to share one schema.

Operators resolve fields per event. This pipeline filters two kinds of events without requiring both to contain the same fields:

```tql
from {kind: "network", src_ip: 192.0.2.10, severity: "high"},
     {kind: "auth", username: "alice", risk_score: 0.9}
where severity? == "high" or risk_score? > 0.8
select kind, src_ip?, username?
```

```tql
{kind: "network", src_ip: 192.0.2.10, username: null}
{kind: "auth", src_ip: null, username: "alice"}
```

The optional field access `?` suppresses a warning when a field is absent and returns `null`. It does not convert incompatible values: a numeric comparison still requires a suitable type. Our [type system reference](../reference/types.md) describes the available types, and our [guide on transforming values](../guides/shape/transform-values.md) shows how to convert them.

This model lets you apply common transformations while retaining source-specific fields. Schema changes can still require pipeline changes when a field’s type or meaning changes.

## Language structure

Our language reference separates the building blocks from complete programs:

* [Types](../reference/types.md) define values, including domain-specific types for security and network data.
* [Expressions](../reference/expressions.md) compute values, from literals and field access to function calls.
* [Statements](../reference/statements.md) bind names, invoke operators, and control dataflow.
* [Programs](../reference/programs.md) combine statements into complete TQL programs.

Our [tutorial on learning idiomatic TQL](../tutorials/learn-idiomatic-tql.md) puts these building blocks together with runnable examples. Our [executor explanation](executor.md) describes how a program becomes a running dataflow.
