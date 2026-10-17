---
title: "Executor"
description: "Understand how Tenzir compiles TQL into an execution plan and runs operators with fused handoffs, channels, subpipelines, and parallel jobs."
canonical: https://tenzir.com/docs/explanations/executor
source: https://tenzir.com/docs/explanations/executor.md
section: "Docs"
---

# Executor

> Understand how Tenzir compiles TQL into an execution plan and runs operators with fused handoffs, channels, subpipelines, and parallel jobs.

The **pipeline executor** turns a TQL program into a running dataflow. It does not interpret the source one statement at a time. Instead, it parses the whole program, builds and optimizes an intermediate representation, and plans a graph of operator instances. Within a fused group, operators hand batches directly to each other. Bounded channels connect jobs across unfused boundaries.

This page follows a pipeline through those representations. It is intended for advanced users who want to explain a plan, locate a bottleneck, or predict how parallelism and subpipelines affect execution. For the data model that the executor implements, start with our explanation of [pipelines](pipeline.md).

## From source text to a plan

A pipeline passes through these representations before it runs:

| Step     | Representation                                 | What happens                                                                                                           |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Parse    | Tokens and an abstract syntax tree (AST)       | Tenzir validates the source and recognizes statements, expressions, and nested pipelines.                              |
| Compile  | Intermediate representation (IR)               | Operator plugins compile syntax into typed logical operators. User-defined operators expand into their bodies.         |
| Optimize | Rewritten IR                                   | Operators pass predicates, field projections, limits, and ordering requirements toward sources that can act on them.   |
| Plan     | A directed acyclic graph (DAG)                 | The planner assigns operator degrees, adds branches and exchanges, and chooses the channels between operators.         |
| Spawn    | Operator instances, fused groups, and channels | The executor creates the planned operator instances and starts moving bytes, events, and control signals through them. |

The separation matters when you debug a pipeline. The source describes your intent, the optimized IR describes the logical work that remains, and the plan describes the physical graph that runs. Our guide on [inspecting the compilation output](../guides/troubleshooting/inspect-compilation-output.md) shows how to print each representation.

### Parsing and compilation

The parser turns source text into an AST. The AST preserves language constructs such as assignments, `let` declarations, conditionals, and nested pipelines, but it does not contain executable operator instances.

Compilation resolves names and asks each operator plugin to produce an **IR operator**. The IR is still logical: it records operations and nested pipelines without deciding how many instances to run or how to connect them. Some subpipeline values become known only at runtime. For example, the `group` operator binds each group key when it creates that group’s subpipeline.

The compiler also checks the element types between adjacent operators. An edge carries one of three kinds of data:

* Encoded bytes.
* Typed event batches.
* No data, for control-only connections.

A parser changes bytes into events, a printer changes events into bytes, and event transformations keep the stream in the event domain. A mismatched pair cannot produce a valid plan.

### Optimization

The optimizer pushes filters, limits, and field projections toward the source as far as possible without changing the pipeline’s results. This reduces how much data Tenzir reads, transfers, and processes. A storage source may even turn these operations into a remote query. When a source cannot apply an optimization, the original operator still performs the work in Tenzir.

The optimizer also tracks whether downstream operators depend on event order. When order does not matter, eligible operators may take faster code paths that reorder events, for example a parser that splits its input across several jobs. This improves throughput while preserving the pipeline’s semantics. Our [pipeline optimization explanation](pipeline.md#optimization) shows a complete pushdown example.

### Planning

The planner turns the optimized IR into an executable directed acyclic graph (DAG). A linear pipeline remains a chain of operators, while static subpipelines become branches in the same graph. The plan therefore reflects the actual paths that events can take rather than the nesting of the TQL source.

Conditionals such as [`if`](https://tenzir.com/docs/reference/statements.md#if) and [`match`](https://tenzir.com/docs/reference/statements.md#match) route each event through one branch. The [`fork`](https://tenzir.com/docs/reference/operators/fork.md) operator copies events into a side pipeline, while [`merge`](https://tenzir.com/docs/reference/operators/merge.md) adds events from another source. The [`fork_merge`](https://tenzir.com/docs/reference/operators/fork_merge.md) operator copies events across several branches and combines their results, and [`parallel`](https://tenzir.com/docs/reference/operators/parallel.md) lets eligible operators run in multiple parallel copies.

The IR shows one pipeline with nested subpipelines in merge, if, and fork. A hatched arrow points to the plan DAG, where merge adds a second source, if branches and rejoins, and fork splits off a sink.

The resulting plan determines where streams split and rejoin, which operators can run concurrently, and where event order may change. Some subpipelines cannot be included in the initial plan: for example, `group` creates them as new keys arrive, so the executor plans those child graphs at runtime. The [Subpipelines](executor.md#subpipelines) section explains this distinction.

## Jobs and channels

A **job** is one running instance of a planned operator. An operator with degree one creates one job. A parallel operator with degree four creates four jobs that share the same logical operator identity, which lets Tenzir aggregate their metrics under one operator.

Unfused jobs connected by channels can run concurrently: while one job processes a batch, downstream jobs can process earlier batches. This pipeline concurrency is possible even when every operator has degree one, but it does not apply within a [fused group](executor.md#operator-fusion).

Channels connect jobs across unfused boundaries. A channel carries event batches, byte chunks, or control signals such as end-of-data. The executor uses bounded channels, so a fast producer eventually waits when a downstream consumer cannot keep up. This **back pressure** propagates toward the source instead of allowing an unbounded in-memory queue to grow.

## Operator fusion

By default, Tenzir fuses adjacent operators in a lane into a single group, even in pipelines that do not opt into parallelism. Operators inside a fused group hand batches directly to each other, with no channel or buffer between them. The group carries one batch through all of its operators before consuming the next, rather than overlapping their work.

Two versions of the same five-operator chain side by side: on the left every pair of operators is separated by a channel, on the right the middle three operators sit inside one group box that keeps only the channels leading into and out of it

Our performance guide explains [operator fusion and its trade-offs](../guides/node-setup/tune-performance.md#fusing).

## Parallel execution

Pipeline parallelism changes the degree of eligible planned operators. The planner replicates operators that can process independent work and leaves sequential operators at degree one.

A sequential pipeline on the left and the same pipeline parallelized into three lanes on the right

For stateless transformations, the executor scatters batches across available jobs. For a stateful operation whose result depends on a key, the planner adds a shuffle: it evaluates the partition key and sends equal keys to the same job. This preserves per-key semantics for operations such as grouped aggregation and deduplication.

Events routed across three parallel lanes so that every event with the same key reaches the same summarize instance

A parallel file source can assign files to jobs with a stable hash of each file path, so different instances do not read the same file. This source-level assignment differs from downstream exchanges, which partition data that already flows through channels.

Kafka uses broker-managed assignment instead. Every [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md#parallelism) instance joins the same consumer group, and the broker assigns and rebalances partitions among those instances. A partition can move between jobs and replay messages whose offsets have not yet been committed, so delivery remains at-least-once.

Parallel jobs do not preserve one global event order. A gather receives output as jobs make progress, and a keyed shuffle intentionally separates the stream. If order affects the result, keep the relevant part sequential or restore order explicitly. Our guide on [tuning performance](../guides/node-setup/tune-performance.md#parallelism) explains how to enable parallelism and choose its degree.

## Subpipelines

A **subpipeline** is a nested pipeline owned by an outer construct. The executor handles two forms differently.

**Static subpipelines** become part of the parent plan. Conditional branches and fan-out constructs lower their nested operators into the same DAG as the outer pipeline. They use the regular planner rules for typing, parallelism, channels, and metrics.

**Dynamic subpipelines** are planned and spawned while the parent job runs. An operator owns each child plan and exchanges input, output, and completion signals with it. This supports cases where the number or arguments of children are not known during initial planning. For example, `group` can create one child for each new key, and an input connector can run a parsing child over bytes that arrive later.

Dynamic ownership keeps the runtime graph tree-shaped: every dynamic child has one owning operator, although the static plan around that operator can be a DAG. The owner can feed the child, consume its output, and react when it finishes. The guide on [fanning out with subpipelines](../guides/route/fan-out-with-subpipelines.md) shows the user-facing semantics of keyed and per-event children.

## Checkpointing

A **checkpoint** captures enough operator state to resume a pipeline from a consistent point. In a streaming graph, saving every operator independently is not sufficient because records can be in flight between snapshots.

The executor’s checkpoint design uses a barrier that travels through the graph. When a job receives the barrier, it stops accepting new input, flushes state that should not be serialized, saves the remaining mutable state, coordinates its dynamic children, and forwards the barrier only after its snapshot is durable. Channels provide the boundary between data before and after the checkpoint.

Dynamic subpipelines make this coordination recursive. An owner must send the barrier into every active child and wait for those children before it can pass the barrier downstream. Completion messages from children also need ordering so that a restored execution observes them on the correct side of the checkpoint.

Current limitation

Persistent pipeline recovery from checkpoints is not generally available. The executor and several operators contain checkpointing infrastructure, but a node does not currently save and restore complete execution graphs after a process restart. Pausing a managed pipeline retains its in-memory state; stopping it or restarting the process resets that state.

## See also

* [Pipeline](pipeline.md)
* [Node](node.md)
* [Tune performance](../guides/node-setup/tune-performance.md)
* [Inspect the compilation output](../guides/troubleshooting/inspect-compilation-output.md)
* [Investigate slow pipelines](../guides/troubleshooting/investigate-slow-pipelines.md)
