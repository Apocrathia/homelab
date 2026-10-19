---
title: "Pipeline"
canonical: https://tenzir.com/docs/explanations/pipeline
source: https://tenzir.com/docs/explanations/pipeline.md
section: "Docs"
---

# Pipeline

> A Tenzir pipeline is a chain of operators that represents a dataflow. Operators are the atomic building blocks that produce, transform, or consume data. Think of them as Unix or Powershell commands where the result from one command is feeding into the next:

A Tenzir **pipeline** is a chain of **operators** that represents a dataflow. Operators are the atomic building blocks that produce, transform, or consume data. Think of them as Unix or Powershell commands where the result from one command is feeding into the next:

Pipeline Chaining

Our pipelines have 3 types of operators: **inputs** that produce data, **outputs** that consume data, and **transformations** that do both:

Pipeline Structure

You write pipelines in the [Tenzir Query Language (TQL)](language.md), a language that we developed from the ground up to concisely describe such dataflows. Our explanation of the [pipeline executor](executor.md) covers how Tenzir runs them, including operator fusion and parallel execution.

Learn TQL

Head over to our [language documentation](language.md) for an in-depth explanation of how TQL works. We’re continuing here with high-level architectural aspects of the pipeline execution model.

## Typed Operators

Tenzir pipelines operate both ond unstructured stream of bytes and typed event streams. The execution model ensures type safety while maintaining high performance through batching and parallel processing.

An operator has an **upstream** and **downstream** type:

Upstream and Downstream Types

This typing ensures pipelines are well-formed. Adjacent operators must have matching types: the downstream type of one operator must match the upstream type of the next, i.e., upstream/downstream types of adjacent operators have to match. Otherwise the pipeline is malformed.

With these operators as building blocks, you can create all kinds of pipelines, as long as they follow the two principal rules of (1) sequencing inputs, transformations, and outputs, and (2) ensuring that operator upstream/downstream types match. Here are examples of other valid pipeline variations:

Operator Composition Examples

## Multi-Schema Dataflows

Pipelines transport both bytes and events. Events travel in batches that store many events column by column, allowing operators to process many values in one loop.

A single pipeline, and even a single batch, can hold events with multiple schemas. Database tables and data frames typically require a fixed schema; in Tenzir, schemas can change from one event to the next. You write transformations for individual events, as in a document-oriented engine, while Tenzir executes them over columnar batches:

<!--?xml version="1.0" standalone="no"?-->Structured vs document-oriented engines

The schema variance begins early in the data flow, where parsers emit events with changing fields, and the same field may hold an IP address in one event and a hostname in the next. Tenzir keeps such events together in one batch. Every event keeps its own fields in their original order, and a field with values of different types stores them side by side. Neither a new field nor a changed type forces a new batch, so even a stream in which every event has a different schema than its predecessor flows in large batches and in its original order. Our explanation of the [data model](data-model.md) describes how batches achieve this.

Some operators only work with exactly one schema at a time, such as the CSV printer [`write_csv`](https://tenzir.com/docs/reference/operators/write_csv.md), which first writes a header and then all subsequent rows have to adhere to the emitted schema. Such operators cannot handle events with changing schemas.

Most transformations only need field names, for example `where id.orig_h in 10.0.0.0/8` or `select src_ip, dest_ip, proto`. Schemas are inferred automatically in parsers, but you can also seed a parser with a schema that you define explicitly.

## Optimization

Before a pipeline runs, the **optimizer** rewrites it so that the source reads, transfers, and decodes only what the rest of the pipeline needs. It walks the pipeline from its last operator to its first and hands every operator a request from its downstream neighbor. The request captures four things:

* **Predicates** from [`where`](https://tenzir.com/docs/reference/operators/where.md) that filter the operator’s output.
* An **ordering** requirement: whether downstream depends on the event order.
* A **limit** from [`head`](https://tenzir.com/docs/reference/operators/head.md): how many events downstream needs at most.
* A **projection** from [`select`](https://tenzir.com/docs/reference/operators/select.md): the fields downstream reads.

An operator that does not affect a requirement passes it on. One that does, adjusts or stops it: [`set`](https://tenzir.com/docs/reference/operators/set.md) rewrites a predicate over the fields it assigns, [`sort`](https://tenzir.com/docs/reference/operators/sort.md) stops a limit because it needs all of its input, and any reference to `this` widens a projection to all fields. The source at the start receives what survived and acts on the parts it understands.

The rewrite through [`set`](https://tenzir.com/docs/reference/operators/set.md) lets a filter pass field renames, constants, record literals, and whole-event assignments such as `this = move this.ocsf`. For example, `y = x | where y == 42` turns into `where x == 42 | y = x`. A field that `move` or [`drop`](https://tenzir.com/docs/reference/operators/drop.md) removes reads as `null`. When a predicate reads a field without an exact equivalent in the input, for example one assigned from `now()`, the predicate stays after the assignment. This is how a filter on OCSF fields reaches the source through a normalization operator.

The operands of a top-level `and` move independently, because `where a and b` keeps the same events as `where a | where b`. After `t = now()`, the predicate `x == 1 and t > 2024-01-01` splits: `x == 1` moves in front of the assignment, and `t > 2024-01-01` stays after it. An `and` inside `or` or `not` stays whole. An operand runs only on the events that the operands before it keep. So when the left operand is `null`, the right one no longer runs, and its warnings and errors disappear. An operand that moves ahead can also warn for events that an operand left behind drops.

On the way, the optimizer simplifies every predicate. It evaluates the parts that do not depend on the event and removes the branches of `and` and `or` that cannot change the result. After `class_uid = 3002`, the predicate `class_uid == 3002 and src_ip == 1.2.3.4` becomes `src_ip == 1.2.3.4`, and `class_uid == 4001` becomes `false`. The optimizer does not evaluate a part that would emit a warning at runtime, such as `1 / 0`. Removing a branch can still drop its warnings: `x == 1 / 0 or true` becomes `true` and no longer warns.

A filter also moves in front of `if` and `match`. Every event takes exactly one branch, so the optimizer rewrites the predicate through each branch and combines the results with the conditions that send an event to that branch. For example, `if x == 1 { y = a } else { y = b } | where y == 42` turns into `where a == 42 if x == 1 else b == 42` in front of the `if`. Branches that can’t keep an event drop out of the predicate. Behind a `match` on the event ID whose arms assign different OCSF classes, `where class_uid == 3002` becomes a predicate on the event IDs of the arms that assign `3002`. A branch that ends in a sink still receives all of its events. The filter stays inside the branches if the optimizer can’t repeat the routing in a predicate, for example when the condition calls `random()`, or when a `match` pattern is a list or a record.

Take this pipeline:

```tql
from_clickhouse table="logs.events"
where severity > 3 or source == "fw"
select id, message
head 100
```

Read literally, it fetches every row and column, then discards most of them. Instead, [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) sends a single query that does all of that on the server:

```sql
SELECT id, message, severity, source
FROM logs.events
WHERE (severity > 3 OR source = 'fw')
LIMIT 100
```

Every rewrite preserves results. The `where`, `select`, and `head` stay in the pipeline, so a source that acts on a hint only partially, or not at all, still produces the same output. When only part of a predicate translates, for example because it calls a function the backend does not have, the source pushes what it can and evaluates the rest itself.

Which hints a source acts on depends on its backend. [Optimizations](../reference/optimizations.md) lists the operators that act on hints and states, for each database, which predicates go into the query and which stay in Tenzir. When downstream does not depend on event order, operators may take faster code paths that reorder events, for example a parser that splits its input across several jobs.

Federated Search

These optimizations reach any source, including operators that query remote storage, databases, or SIEMs, which is what makes **federated search** across distributed systems a transparent capability of the engine rather than a feature you configure.
