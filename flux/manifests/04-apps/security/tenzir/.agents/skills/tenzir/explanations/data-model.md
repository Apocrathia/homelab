---
title: "Data model"
description: "Understand how Tenzir stores events in columnar batches, keeps events of different shapes and types side by side, and selects rows with bitmaps instead of slicing batches apart."
canonical: https://tenzir.com/docs/explanations/data-model
source: https://tenzir.com/docs/explanations/data-model.md
section: "Docs"
---

# Data model

> Understand how Tenzir stores events in columnar batches, keeps events of different shapes and types side by side, and selects rows with bitmaps instead of slicing batches apart.

The **data model** defines how Tenzir holds events in memory while they flow through pipelines. It is columnar, like the formats that analytical databases use, but we designed it for security telemetry: a single stream interleaves events with different fields, and the same field may hold an IP address in one event and a hostname in the next. The data model keeps such events together in one batch, preserves each event’s field order, and filters and branches by flipping bits instead of copying data.

Our [types reference](../reference/types.md) defines the types available in TQL. Our [executor explanation](executor.md) describes how batches move between operators.

## Events in columns

Operators exchange events in **batches** that hold many events at once. Within a batch, the data model stores events column by column: all values of a field sit next to each other in memory instead of being scattered across per-event objects. A filter that compares `src_ip` therefore scans one contiguous array, and an operator that never touches a field never reads it.

A batch consists of three parts:

* **Events**: a record array with one column per field name that occurs in the batch.
* **Metadata**: per-row columns with the schema name, the import time and other meta information.
* **Mask**: a bitmap with one bit per row that marks the rows that are still active.

A batch of five Suricata events. A metadata column on the left holds the schema names suricata.flow, suricata.dns, and suricata.alert. The events in the middle are stored as four field columns, src\_ip, dest\_port, rrname, and signature, where every row has a src\_ip and the other columns hold values only for the rows whose event has that field. A mask on the right marks four rows as active and the third row as filtered out.

Earlier versions of Tenzir required every event in a batch to share one schema. A stream that alternated between flows and DNS queries broke into many tiny batches, increasing per-batch overhead. The current data model keeps events with different fields and types in the same batch.

## Records with shapes

A record array keeps one column per field name it has seen, plus a **shape** for every row. A shape is an ordered list of the fields that a row contains. Each field column comes with a bitmap that marks the rows where the column holds a value.

Four events stored as one record: the first has fields a and b, the second b and a, the third a and b, and the fourth a and c. A shape column assigns each row shape 1, 2, 1, or 3. The columns a, b, and c each pair a bitmap with a value column: a is set in all four rows, b in the first three, and c only in the last. A table of shapes, offset from the rows because its entries do not correspond to events, defines shape 1 as fields a then b, shape 2 as b then a, and shape 3 as a then c.

The shape records which fields a row has and their order. The first two events in the example have the same fields in a different order, so they get different shapes, and Tenzir reproduces each event exactly as it arrived. A field that appears in a row’s shape but has no value in its column reads back as `null`. A field that is not part of the shape does not exist for that row at all.

Each record array interns its shapes in a table, so a thousand events with the same fields share one field list and store a small shape index each. The table also remembers how adding or removing a field turns one shape into another. An assignment such as `event.severity = "high"` over a batch with a handful of distinct shapes therefore costs a lookup per shape, not per row.

Reading a field inside a pipeline never consults the shapes. An expression such as `event.severity == "high"` goes straight to the field’s column and bitmap, no matter which shapes the rows have. Tenzir only reads the shapes when it serializes events to a row-oriented format that writes each event as an object, such as JSON or YAML. There, the shape decides which keys an object contains and in which order they appear.

How this relates to record shredding in Arrow

[Apache Arrow](https://arrow.apache.org/docs/format/Columnar.html#struct-layout) also shreds records into columns: a struct array holds one child array per field, each with a validity bitmap, and nested records become nested struct arrays. Our record arrays follow the same idea, with one column per field name and a bitmap per column.

In Arrow, the struct type fixes the fields and their order for every row of the array. Every row has every field, a field that an event lacks can only be stored as `null`, and an event with a new field requires a new schema and thus a new batch. Tenzir records the fields and their order per row in the shape instead. Rows with different fields share one array, a missing field stays distinct from a `null` field, and a new field only adds a column.

A single column serves every shape that contains its field. In the batch of Suricata events above, flows, DNS queries, and alerts all store their `src_ip` in the same column. An expression such as `src_ip in 10.0.0.0/8` therefore runs once over that column for the whole batch. With one schema per batch, the engine would first have to slice the events by schema and then evaluate the expression once per slice, paying for every slice boundary in a stream that switches event types.

## Unions for mixed types

A column of a record or the elements of a list can hold values of different types. When they do, the data model stores the column as a **union**: a per-row index that names each row’s type, plus one array and bitmask per type.

A host column with the values 10.0.0.1, “db01”, 10.0.0.7, and null stored as a union. An index column assigns the rows to alternative 0, 1, 0, and 2. Alternative 0 holds IP addresses with a bitmap that selects rows one and three, alternative 1 holds strings with a bitmap that selects row two, and alternative 2 is null, which consists of a bitmap alone and stores no values.

Every alternative spans all rows of the column and carries a bitmap of the rows it covers. The rows line up one to one, so the union needs no offsets. The index gives fast access to a single row, while the bitmaps let column-wise code take all values of one type at once and combine them with other masks. For example, [`where`](https://tenzir.com/docs/reference/operators/where.md) takes the `bool` alternative of its predicate and warns about the rows that hold any other type.

A column with a single type uses its array directly, without a union. Lists use the same representation for their elements, so `[0, "hello", {y: 42}]` stores an integer, a string, and a record in one union array.

### Nulls without a type

A `null` is a value of the `null` type, not a missing value inside a column of another type. An array of nulls stores only its length. A column that is partly `null`, like the `host` column above, is a union with a `null` alternative.

The events `{"x": null}` and `{"x": 1}` therefore share a batch: the `x` column is a union of `null` and `int`.

## Masking instead of slicing

Every batch carries a top level mask, and operators that select rows change the mask rather than the data. A condition such as `proto == "tcp"` evaluates to a `bool` column, and the data model stores every `bool` column as a bitmap, as the section on [physical representations](data-model.md#logical-types-physical-representations) shows. Evaluating the condition therefore already produces a mask in the right format, with no conversion step and no per-row branching.

A [`where`](https://tenzir.com/docs/reference/operators/where.md) filter combines that bitmap with the incoming mask in a single bitwise AND and passes the unchanged columns downstream. An [`if`](https://tenzir.com/docs/reference/statements.md#if) statement derives two masks from the same bitmap, one for the rows where the condition holds and one for the rows where it does not, and hands the same batch to both branches, each with its own mask.

An if statement that tests for circles splits eight events with different shapes into a then and an else branch. On the left, slicing cuts the batch wherever the condition flips, so the two branches receive six small batches in total. On the right, masking hands the same eight-row batch to both branches, each with a bitmap that selects its rows.

Masking turns filtering and branching from a copy into a few bitwise operations. Rows that drop out of the mask stay in memory, but no operator reads them, and their slots may hold arbitrary leftovers. Downstream operators see only the active rows, so the difference is invisible in a pipeline’s results.

Masked rows are removed when events leave the data model, for example when a node imports them into its storage or when [`write_parquet`](https://tenzir.com/docs/reference/operators/write_parquet.md) converts them into Apache Arrow. Until then, a heavily filtered batch keeps its original size in memory - not different from how slicing in Apache Arrow would keep the memory alive as well.

## Logical types, physical representations

A TQL type such as `int` or `string` is a **logical type**: it defines which values a field can hold and which operations apply to it. How the values sit in memory is a separate decision. Each logical type has one or more **physical representations**, and every array uses exactly one of them at a time.

Logical types on the left and their possible physical representations on the right. Signed and unsigned integers use 8-, 16-, 32-, or 64-bit values or a constant. Floats use 32- or 64-bit values or a constant. Times, durations, IP addresses, and subnets use fixed-width values or a constant. Strings, blobs, and secrets use spans into a byte buffer or a constant. Booleans always use a bitmap, and nulls store only a length. Lists use spans into an elements array or a constant, and records use shapes with field columns or a constant. A column of any type holds one of these representations or a union.

The representations fall into a few families:

* **Fixed-width arrays** hold one slot per row and serve numbers, time values, durations, IP addresses, and subnets. Integers and floats come in several widths. Data that we read from Parquet, Feather, or ClickHouse keeps the width that the source used, so a column of small integers stays small. Every read widens the value to its logical type, which is why `int` always behaves like a 64-bit integer in TQL.
* **Constants** store a single value and a length. A field that has the same value in every row of a batch, such as the schema name in the metadata, costs the same memory for one row as for a million.
* **Spans and bytes** store strings, blobs, and secrets as one begin and end offset per row into a shared byte buffer. Rows with the same value can point to the same bytes.
* **Bitmaps** store booleans at one bit per row. A bitmap that is entirely true or entirely false needs no memory at all, which keeps the common case of a mask that selects every row free.
* **Lists** store a begin and end offset per row into a single elements array. The elements array can use any representation, including a union.
* **Records** store shapes and field columns, as the section on [records with shapes](data-model.md#records-with-shapes) describes.

A column whose type is not known in advance, such as a record field or the elements of a list, holds any of these representations or a union of them. Code that processes such a column dispatches on the representation once per array and then runs a tight loop over the values, instead of checking types row by row.

## Interoperability with Apache Arrow

The data model does not depend on [Apache Arrow](https://arrow.apache.org), but Tenzir converts to and from Arrow where events cross a boundary. Reading Parquet or Feather imports Arrow arrays and takes over their buffers where it can. Writing Parquet or Feather, importing events into a node’s storage, and the Python integration convert events back to Arrow record batches. The conversion drops masked rows and splits a batch into one Arrow record batch per schema, because Arrow requires a fixed schema per batch.

## See also

* [Pipeline](pipeline.md)
* [Executor](executor.md)
* [Type System](../reference/types.md)
* [Tune performance](../guides/node-setup/tune-performance.md)
