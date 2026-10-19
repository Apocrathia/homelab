---
title: "Debug field values"
canonical: https://tenzir.com/docs/guides/troubleshooting/debug-field-values
source: https://tenzir.com/docs/guides/troubleshooting/debug-field-values.md
section: "Docs"
---

# Debug field values

> When a field comes out null, holds the wrong value, or has a type you didn’t expect, the cause is almost always visible in a warning or in the data one step upstream. This guide shows you how to find it.

When a field comes out `null`, holds the wrong value, or has a type you didn’t expect, the cause is almost always visible in a warning or in the data one step upstream. This guide shows you how to find it.

## Read the warning

TQL emits a warning whenever an operation can’t be applied to the data it receives, and then produces `null` instead of stopping. These warnings are the fastest way to explain a wrong value. For example, multiplying a field that arrived as a string:

```tql
from {count: "3"}
doubled = count * 2
```

```plaintext
warning: binary operator `mul` not implemented for `string` and `int64`
 --> <input>:2:11
  |
2 | doubled = count * 2
  |           ~~~~~~~~~
  |
  = hint: the result of this expression is `null`
```

```tql
{count: "3", doubled: null}
```

The field came in as a string, but the expression treats it as a number, so the result is `null`. On a deployed pipeline the same warning appears in diagnostics instead of on your terminal; see [Inspect a node](../observability/inspect-a-node.md#find-failing-pipelines).

## Check a field’s type

When a value looks right but behaves wrong, confirm its type with [`type_of`](https://tenzir.com/docs/reference/functions/type_of.md). The `.kind` field gives the readable type name:

```tql
from {count: "3", port: 443}
count_type = count.type_of().kind
port_type = port.type_of().kind
```

```tql
{count: "3", port: 443, count_type: "string", port_type: "int"}
```

A numeric-looking string is a common surprise. A comparison against it silently matches nothing, because comparing a string to a number yields `null`:

```tql
from {severity: "5"}, {severity: "3"}
where severity >= 4
```

This drops every event and warns twice: once that the comparison isn’t defined for a string and a number, and once that `where` expected a `bool` but got `null`. Cast the field first with [`int`](https://tenzir.com/docs/reference/functions/int.md):

```tql
from {severity: "5"}, {severity: "3"}
where severity.int() >= 4
```

```tql
{severity: "5"}
```

## Inspect the pipeline step by step

When a wrong value survives several operators, shorten the pipeline to find where it turns wrong. Comment out everything after the operator you suspect and run what remains; the output you see is that operator’s output. Add `head` to keep it small. Starting from a pipeline that produces the wrong `severity`:

```tql
subscribe "alerts"
severity = severity.int()
enriched = severity * weight
// where enriched > 100      // disabled to inspect the previous step
head 5
```

Run it, note the value of the field, then move the comment one operator further down. The step where the field first changes to the wrong value is the one to fix.

## Tap into a topic

When your pipelines hand off events through `publish` and `subscribe`, every topic is a point where you can hook into the live flow. A topic delivers a copy of each event to every subscriber, so a debugging session runs alongside the deployed pipelines without taking data away from them.

Subscribe to the topic, apply the operators you want to test, and inspect the result. In the Explorer, run:

```tql
subscribe "alerts"
severity = severity.int()
head 5
```

The same pipeline streams the events to your terminal when you run it over the CLI:

```sh
tenzir 'subscribe "alerts" | severity = severity.int() | head 5'
```

This is a quick way to develop a mapping or a user-defined operator against live events before wiring it into a deployed pipeline. One caveat: operators from a package installed on the node aren’t visible to your local CLI, so test those in the Explorer. See [Split and merge streams](../route/split-and-merge-streams.md) for how topics connect pipelines.

## Handle missing fields

Reading a field that doesn’t exist produces `null` and a warning, which is how you catch a typo or a schema that differs from what you assumed:

```tql
from {source_ip: 1.2.3.4}
ip = src_ip
```

```plaintext
warning: field `src_ip` not found
 --> <input>:2:6
  |
2 | ip = src_ip
  |      ~~~~~~
  |
  = hint: append `?` to suppress this warning
```

```tql
{source_ip: 1.2.3.4, ip: null}
```

The field is `source_ip`, not `src_ip`. If a field is legitimately absent from some events and `null` is the value you want, append `?` to read it without the warning: `ip = src_ip?`.

## See also

* [`type_of`](https://tenzir.com/docs/reference/functions/type_of.md)
* [`int`](https://tenzir.com/docs/reference/functions/int.md)
* [Transform values](../shape/transform-values.md)
* [Filter and select data](../optimize/filter-and-select-data.md)
* [Split and merge streams](../route/split-and-merge-streams.md)
* [Inspect a node](../observability/inspect-a-node.md)
