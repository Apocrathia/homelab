---
title: "Add constants"
canonical: https://tenzir.com/docs/guides/packages/add-constants
source: https://tenzir.com/docs/guides/packages/add-constants.md
section: "Docs"
---

# Add constants

> This guide shows you how to define package-wide constants in a constants.tql file and reference them as pkg::$name from the package’s own operators and pipelines, as well as from any pipeline that uses the package. You’ll learn the let syntax, how bindings build on one another, the rules each binding must satisfy, and when to use a constant instead of an input.

This guide shows you how to define package-wide constants in a `constants.tql` file and reference them as `pkg::$name` from the package’s own operators and pipelines, as well as from any pipeline that uses the package. You’ll learn the `let` syntax, how bindings build on one another, the rules each binding must satisfy, and when to use a constant instead of an input.

Our tutorial on [onboarding a data source](../../tutorials/onboard-a-data-source.md#create-the-parser) shows how package constants publish reusable classifiers, patterns, headers, and pattern definitions.

## Define constants

Place a `constants.tql` file at the root of your package. Each `let` binding defines a named constant that Tenzir evaluates once when it loads the package:

constants.tql

```tql
let $threshold = 8
let $severities = {low: 2, medium: 3, high: 4, critical: 5}
```

A constant can be any value - a number, string, list, or record - which makes `constants.tql` a natural home for the lookup tables and magic numbers that would otherwise be copy-pasted across your operators.

## Reference constants

Reference a constant from anywhere with `<package>::$name`, using your package’s ID as the prefix. In a package with ID `vendor`, the bindings above become `vendor::$threshold` and `vendor::$severities`.

### From the package’s own operators

Inside the package, operators and pipelines reference constants so the same value lives in exactly one place:

operators/ocsf/map.tql

```tql
ocsf.severity_id = vendor::$severities[severity]
```

### From external pipelines

Once the `vendor` package is available, any pipeline can reference its constants:

```tql
from {severity: 9}, {severity: 3}
where severity >= vendor::$threshold
```

```tql
{severity: 9}
```

This lets a package publish named thresholds and enumerations that consumers reuse instead of hardcoding their own copies.

## Build on earlier constants

A binding may reference any constant declared before it, so you can derive one constant from another:

constants.tql

```tql
let $high_severity = 8
let $threshold = $high_severity + 1
```

References resolve in order. A binding that refers to a constant declared later in the file fails to load the package.

## Binding rules

Each binding must evaluate to a deterministic constant value, because Tenzir computes it once when the package loads and folds the result into every reference. Tenzir rejects a binding that is:

* **Non-deterministic**, such as `now()` or `random()`.
* A **pipeline** rather than a value.
* A **function** (lambda).
* A **duplicate name**, since all constants share one flat namespace.

When a binding violates these rules, the package fails to load with a diagnostic that points at the offending `let`.

## Constants versus inputs

Constants and [inputs](configure-inputs.md) both parameterize a package, but they sit on opposite sides of the install boundary:

|               | Constants                                            | Inputs                                                                  |
| ------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Defined in    | `constants.tql`                                      | `package.yaml`                                                          |
| Set by        | the package author (fixed)                           | the person installing the package                                       |
| Referenced as | `pkg::$name`                                         | `{{ inputs.name }}`                                                     |
| Resolved      | const-evaluated when the package loads               | substituted at install time                                             |
| Use for       | shared lookup tables, enumerations, fixed thresholds | endpoints, credentials, intervals, and other deployment-specific values |

Reach for a constant when the package author owns the value and wants to share it. Reach for an input when the person installing the package must supply it.

## See also

* [Add operators](add-operators.md)
* [Configure inputs](configure-inputs.md)
* [Create a package](create-a-package.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
* [Packages](../../explanations/packages.md)
