---
title: "Glossary"
canonical: https://tenzir.com/docs/explanations/glossary
source: https://tenzir.com/docs/explanations/glossary.md
section: "Docs"
---

# Glossary

> This page defines the terms that name things you work with in Tenzir: the components, the entities a pipeline manipulates, and the units we ship. For the names of the transformations themselves, see Learn the data lifecycle.

This page defines the terms that name things you work with in Tenzir: the components, the entities a pipeline manipulates, and the units we ship. For the names of the transformations themselves, see [Learn the data lifecycle](../tutorials/learn-the-data-lifecycle.md).

Missing term?

If you are missing a term, please open a [GitHub Discussion](https://github.com/orgs/tenzir/discussions/new?category=questions-answers) or ping us in our [Discord server](https://discord.tenzir.com).

## App

The web interface to the [platform](glossary.md#platform), at [app.tenzir.com](https://app.tenzir.com).

Use the app to write and run [pipelines](glossary.md#pipeline), explore their output, install [packages](glossary.md#package), build dashboards, and manage nodes and secrets. Everything it does is also available through the API.

## Catalog

The component that tracks which [partitions](glossary.md#partition) exist and what they contain.

When a query runs against [edge storage](glossary.md#edge-storage), the catalog narrows the search to the partitions that can hold matching events, using sparse in-memory indexes over their metadata. Its memory budget is tunable.

* [Configure the catalog](../guides/node-setup/tune-performance.md#configure-the-catalog)

## Context

A stateful object used for in-band enrichment.

Contexts come in various types, such as a lookup table, Bloom filter, and GeoIP database. Pipelines look values up in them with [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md), and something has to keep them current.

* Read more about [enrichment](enrichment.md)
* [Add enrichment contexts](../tutorials/add-enrichment-contexts.md)

## Destination

A [pipeline](glossary.md#pipeline) that ends in an [output](glossary.md#output) operator and starts with [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md).

* Learn more about [pipelines](pipeline.md)

## Edge Storage

The storage that ships with a [node](glossary.md#node), written with [`import`](https://tenzir.com/docs/reference/operators/import.md) and queried with [`export`](https://tenzir.com/docs/reference/operators/export.md).

Edge storage keeps events in [partitions](glossary.md#partition) of Parquet or Feather and uses a [catalog](glossary.md#catalog) to skip the ones a query cannot match. It suits local buffering and recent-history queries. For long retention, write to object storage or a database instead.

* [Ingest data into the node’s edge storage](../guides/store/import-into-a-node.md)
* [Query the node’s edge storage](../guides/search/export-from-a-node.md)

## Event

One record of typed data, and the unit that [pipelines](glossary.md#pipeline) move.

Think of an event as a JSON object with a stricter [type system](../reference/types.md): besides strings, numbers, and records, a field can be a timestamp, a duration, an IP address, or a subnet. The fields of an event and their types form its [schema](glossary.md#schema), and one pipeline can carry events of many schemas at once.

## Format

A data representation that Tenzir can read or write, such as JSON, CSV, Syslog, CEF, or PCAP.

Each format has a [parser](glossary.md#parser), a [printer](glossary.md#printer), or both. Formats are independent of where the bytes come from, so any format works with any connection.

* See available [operators for parsing](../reference/operators.md#parsing)
* See available [operators for printing](../reference/operators.md#printing)
* See available [functions for parsing](../reference/functions.md#parsing)
* See available [functions for printing](../reference/functions.md#printing)

## Function

Computes a value from other values, inside an expression.

A function acts on single values, while an [operator](glossary.md#operator) acts on a stream of [events](glossary.md#event). Examples of functions are `time.round(1s)` and `ip.is_v6()`, while `where` and `summarize` are operators.

* See available [functions](../reference/functions.md)

## Input

An [operator](glossary.md#operator) that only produces data, without consuming anything. A pipeline starts with one.

* Learn more about [pipelines](pipeline.md)

## Integration

Documentation and prebuilt TQL for working with one third-party product.

An integration tells you which operators to use for a given vendor, what to configure on their side, and which [package](glossary.md#package) to install if one exists.

* List of [all integrations](https://tenzir.com/integrations)
* [Does Tenzir have an integration for my system or format?](https://tenzir.com/faqs/does-tenzir-have-an-integration-for-x.md)

## Library

Our collection of [packages](glossary.md#package), installable from the [app](glossary.md#app).

The community library is [freely available on GitHub](https://github.com/tenzir/library), and you can point a node at your own repository instead.

## Metrics

Built-in telemetry about pipeline and node behavior, queryable as [events](glossary.md#event).

Metrics answer operational questions: what a pipeline ingested, where it stalled, how much memory it used.

* [Collect metrics](../guides/observability/collect-metrics.md)

## Module

A namespace for the [operators](glossary.md#operator) and [functions](glossary.md#function) of a [package](glossary.md#package), written with `::` as separator, as in `vendor::ocsf::map`.

Modules are exclusive to packages, and the package identifier is always the leading segment. Builtin operators and functions use flat names, such as [`ai_prompt`](https://tenzir.com/docs/reference/operators/ai_prompt.md), so no builtin can shadow a package’s entities.

* Read more about [modules](packages.md#modules)
* [Add operators](../guides/packages/add-operators.md)

## Node

A long-running process that hosts [pipelines](glossary.md#pipeline), [contexts](glossary.md#context), installed [packages](glossary.md#package), and [edge storage](glossary.md#edge-storage).

A node connects itself to the [platform](glossary.md#platform), which is how the [app](glossary.md#app) reaches it. Pipelines you run in the app execute on the node, close to your data, so telemetry never has to leave your network.

* [Deploy a node](../guides/node-setup/provision-a-node.md)
* Use the [REST API](../reference/operators/openapi.md) to manage a node
* [Import into a node](../guides/store/import-into-a-node.md)
* [Export from a node](../guides/search/export-from-a-node.md)

## OCSF

The [Open Cybersecurity Schema Framework](https://schema.ocsf.io), a vendor-neutral [schema](glossary.md#schema) for security events.

OCSF is the default target when we normalize data, because a detection written against an OCSF class works for every source that maps to it. Our [library](glossary.md#library) ships mappings for common sources, and dedicated operators derive and type-check the result.

* [Onboard a data source](../tutorials/onboard-a-data-source.md)

## Operator

The unit of computation in a [pipeline](glossary.md#pipeline), and one line of TQL.

An operator is an [input](glossary.md#input), a [transformation](glossary.md#transformation), or an [output](glossary.md#output). Packages add their own operators, which you call exactly like the builtin ones.

* See all available [operators](../reference/operators.md)

## Output

An [operator](glossary.md#operator) that only consumes data, without producing anything. A pipeline ends with one.

* Learn more about [pipelines](pipeline.md)

## Package

The unit we ship and you install: everything needed for one use case.

A package contains [operators](glossary.md#operator), constants, [contexts](glossary.md#context), runnable examples, and tests, and optionally [pipelines](glossary.md#pipeline) that start when you install it. Installing one adds its operators to your [module](glossary.md#module) namespace, so you call them from your own pipelines instead of copying TQL.

* Read more about [packages](packages.md)
* [Onboard a data source](../tutorials/onboard-a-data-source.md)

## Parser

What turns bytes of a [format](glossary.md#format) into [events](glossary.md#event).

Parsers appear as the `read_*` operators, and as `parse_*` [functions](glossary.md#function) when the input is a string field instead of a byte stream. A parser is the dual of a [printer](glossary.md#printer).

* See available [operators for parsing](../reference/operators.md#parsing)
* See available [functions for parsing](../reference/functions.md#parsing)

## Partition

The unit in which [edge storage](glossary.md#edge-storage) writes and reads events.

One partition is a [Parquet](https://parquet.apache.org) or [Feather](https://arrow.apache.org/docs/python/feather.html) file holding events of one [schema](glossary.md#schema). Partition size trades write amplification against query granularity.

## Pipeline

A sequence of [operators](glossary.md#operator) that data flows through, written in [TQL](glossary.md#tql).

A pipeline can run once and return a result, or run continuously until you stop it. Pipelines connect to each other through topics with [`publish`](https://tenzir.com/docs/reference/operators/publish.md) and [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md), which is how a deployment ends up as many small pipelines rather than one large one.

* Learn more about [pipelines](pipeline.md)
* [Run a pipeline](../guides/basic-usage/run-pipelines.md)

## Platform

The control plane that your nodes connect to, reachable through the [app](glossary.md#app) and the API.

The platform holds workspaces, user access, secrets, and dashboards, and it relays what you do in the app to the right node. Events stay on the node unless a pipeline sends them elsewhere. You can use ours or run your own.

* Understand the [Tenzir architecture](deployment.md)
* Read more about [the platform](platform.md)

## Printer

What turns [events](glossary.md#event) into bytes of a [format](glossary.md#format).

Printers appear as the `write_*` operators, and as `print_*` [functions](glossary.md#function) when you want a string field instead of a byte stream. A printer is the dual of a [parser](glossary.md#parser).

* See available [operators for printing](../reference/operators.md#printing)
* See available [functions for printing](../reference/functions.md#printing)

## Pushdown

Moving a requirement of a later [operator](glossary.md#operator) toward the [source](glossary.md#source) of a [pipeline](glossary.md#pipeline), so that upstream operators can act on it early.

Before a pipeline runs, Tenzir carries the predicates of `where`, the row limit of `head`, the fields that `select` keeps, and the ordering that downstream operators need upstream. A source such as `from_clickhouse` acts on what it understands, for example by adding a `WHERE` clause to the SQL query it sends, and a [parser](glossary.md#parser) that learns the order does not matter can split its work across several jobs. Results stay the same whether or not an operator acts on a pushed-down requirement.

* Learn more about [pipeline optimization](pipeline.md#optimization)

## Schema

The named record type of an [event](glossary.md#event): its field names and their types.

Events with the same fields and types share a schema. Every event carries its own schema name, which `@name` sets or reads. A pipeline, and even a single batch of events, can carry several schemas at once, and operators apply to the ones where they make sense.

* [Show available schemas in the edge storage](../guides/store/show-available-schemas.md)

## Sink

An operator that writes to an external resource.

A sink is the dual to a [source](glossary.md#source). It consumes events or bytes from the pipeline and has no output.

* Learn more about [pipelines](pipeline.md)

## Source

An [operator](glossary.md#operator) that reads from an external resource, or a [pipeline](glossary.md#pipeline) that starts with an [input](glossary.md#input) operator and ends in [`publish`](https://tenzir.com/docs/reference/operators/publish.md).

The operator sense is the dual to a [sink](glossary.md#sink): it has no input and emits events or bytes into the pipeline. The pipeline sense is the counterpart to a [destination](glossary.md#destination).

* Learn more about [pipelines](pipeline.md)

## TQL

The Tenzir Query Language, in which you write [pipelines](glossary.md#pipeline).

TQL reads top to bottom, one [operator](glossary.md#operator) per line, and covers collection, transformation, analytics, and delivery in one language. It has no separate configuration dialect: what you type in the [app](glossary.md#app) is what a deployed pipeline contains.

* Learn more about the [language](language.md)
* [Learn idiomatic TQL](../tutorials/learn-idiomatic-tql.md)

## Transformation

An [operator](glossary.md#operator) that both consumes and produces data. Most operators are transformations.

* Learn more about [pipelines](pipeline.md)
