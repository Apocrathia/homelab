---
title: "Inspect the compilation output"
description: "Inspect a pipeline's tokens, syntax tree, logical operators, and physical plan to diagnose compilation and planning issues."
canonical: https://tenzir.com/docs/guides/troubleshooting/inspect-compilation-output
source: https://tenzir.com/docs/guides/troubleshooting/inspect-compilation-output.md
section: "Docs"
---

# Inspect the compilation output

> Inspect a pipeline's tokens, syntax tree, logical operators, and physical plan to diagnose compilation and planning issues.

When a pipeline fails to compile or its plan differs from what you expect, inspect the compiler’s intermediate output. The `tenzir` CLI can print each representation and exit without running the pipeline.

These developer-oriented formats can change between releases. The output in this guide was captured with Tenzir 6.16.0 using `uvx tenzir`.

## Choose a pipeline

In your shell, store a small pipeline in a variable so that every command inspects the same source:

```sh
PIPELINE='from {x: 1}, {x: 2} | where x > 1 | to_stdout'
```

The commands use an installed `tenzir` executable. You can also replace `tenzir` with `uvx tenzir` to run them without a separate installation.

## Inspect the syntax

Use the token dump to check how the source splits into identifiers, literals, and punctuation. Use the abstract syntax tree (AST) to check how the parser groups those tokens into operators and expressions:

```sh
tenzir --dump-tokens "$PIPELINE"
tenzir --dump-ast "$PIPELINE"
```

If parsing fails, inspect the tokens around the reported location before looking at later compilation stages.

## Inspect the logical operators

Print the intermediate representation (IR) before and after optimization:

```sh
tenzir --dump-ir "$PIPELINE"
tenzir --dump-opt-ir "$PIPELINE"
```

The optimized IR retains the `where` comparison in this example. This excerpt shows its predicate:

```text
where_ir {
  self: [0]:0..0 from 0,
  predicate: binary_expr {
    left: root_field {
      id: `x` @ [1]:28..29 from 0,
      has_question_mark: false
    },
    op: "gt",
    right: constant int64 1 @ [1]:32..33 from 0,
    location: [1]:28..33 from 0
  }
}
```

The `gt` operation compares the field `x` with the integer `1`. When comparing the two dumps, focus on operators and their arguments rather than source locations, which can change as the optimizer rewrites the IR.

## Inspect the physical plan

Print the planned graph to check operator degrees and connections:

```sh
tenzir --dump-ir-plan "$PIPELINE"
```

```text
● {input}
│
● from
╎
● where
╎
● to_stdout
│
● {output}
```

Read the graph from top to bottom. Each `●` marks a planned operator or an external input/output placeholder. In this format, `│` denotes a regular channel and `╎` a tiny channel with a smaller memory budget.

To check whether a parallelism setting changes operator degrees, repeat the dump with an explicit setting:

```sh
tenzir --parallelism=3 --dump-ir-plan "$PIPELINE"
```

```text
● {input}
│
● from
╎
● where(x3)
╎
● to_stdout
│
● {output}
```

The `(x3)` suffix shows that `where` has degree three. The `from` and `to_stdout` operators stay at degree one in this plan. Match the CLI’s parallelism setting and configuration to the pipeline you’re investigating. These dumps describe the local plan, not the live state of a pipeline running on a node. Use our guide on [investigating slow pipelines](investigate-slow-pipelines.md) to measure runtime behavior.

## See also

* [Executor](../../explanations/executor.md)
* [Tune performance](../node-setup/tune-performance.md)
* [Debug field values](debug-field-values.md)
