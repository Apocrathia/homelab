---
title: "python"
canonical: https://tenzir.com/docs/reference/operators/python
source: https://tenzir.com/docs/reference/operators/python.md
section: "Docs"
---

# python

> Executes Python code against each event of the input.

Executes Python code against each event of the input.

```tql
python code:string, [requirements=string]
python file=string, [requirements=string]
```

Requirements

A Python 3 (>=3.10) interpreter must be present in the `PATH` environment variable of the `tenzir` or `tenzir-node` process.

## Description

The `python` operator executes user-provided Python code against each event of the input.

By default, the Tenzir node executing the pipeline creates a virtual environment into which the `tenzir` Python package is installed. This behavior can be turned off in the node configuration using the `plugin.python.create-venvs` boolean option.

Performance

The `python` operator implementation applies the provided Python code to each input row, one by one. We use [PyArrow](https://arrow.apache.org/docs/python/index.html) to convert the input values to native Python data types and back to the Tenzir data model after the transformation. This does have a noticeable performance impact compared to native TQL operations.

### `code: string`

The provided Python code describes an event-to-event transformation, i.e., it is executed once for each input event and produces exactly output event.

An implicitly defined `self` variable represents the event. Modify it to alter the output of the operator. Fields of the event can be accessed with the dot notation. For example, if the input event contains fields `a` and `b` then the Python code can access and modify them using `self.a` and `self.b`. Similarly, new fields are added by assigning to `self.fieldname` and existing fields can be removed by deleting them from `self`. When new fields are added, it is required that the new field has the same type for every row of the event.

### `file: string`

Instead of providing the code inline, the `file` option allows for passing a path to a file containing the code the operator executes per event.

### `requirements = string (optional)`

The `requirements` flag can be used to pass additional package dependencies in the pip format. When it is used, the argument is passed on to `pip install` in a dedicated virtual environment.

The string is passed verbatim to `pip install`. To add multiple dependencies, separate them with a space: `requirements="foo bar"`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `python` runs its own Python subprocess. Events can therefore reach separate interpreter sessions and finish in a different order.

Every subprocess maintains independent interpreter and module state. External side effects from the instances can overlap and interleave. Use a pipeline degree of one when your Python program requires one continuous interpreter session or ordered side effects.

## Secrets

Secrets never appear in events: a field that was assigned a secret holds the string `"***"` instead, so your Python code cannot read a secret from an event.

The `code` argument is the exception. It accepts a secret, and Tenzir resolves the secret and passes the resulting text to the Python subprocess as the program. If you build the code from a secret, for example with a format string, the program contains the secret value and can read it.

## Examples

### Insert or modify a field

Set field `x` to `"hello, world"`

```tql
python "self.x = 'hello, world'"
```

### Remove all fields from an event

Clear the contents of `self` to remove the implicit input values from the output:

```tql
python "
  self.clear()
"
```

### Insert a new field

Define a new field `x` as the square root of the field `y`, and remove `y` from the output:

```tql
python "
  import math
  self.x = math.sqrt(self.y)
  del self.y
"
```

### Make use of third party packages

```tql
python r#"
  import requests
  requests.post("http://imaginary.api/receive", data=self)
"#, requirements="requests=^2.30"
```

## See Also

* [`shell`](https://tenzir.com/docs/reference/operators/shell.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
