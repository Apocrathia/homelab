---
title: "Add operators"
canonical: https://tenzir.com/docs/guides/packages/add-operators
source: https://tenzir.com/docs/guides/packages/add-operators.md
section: "Docs"
---

# Add operators

> This guide shows you how to create user-defined operators (UDOs) for your package. You’ll learn how to define operators with positional and named arguments, and how to test them with the Test Framework.

This guide shows you how to create user-defined operators (UDOs) for your package. You’ll learn how to define operators with positional and named arguments, and how to test them with the Test Framework.

This guide covers the mechanics. Our tutorial on onboarding a data source puts them to work: it [creates a parser from a pipeline](../../tutorials/onboard-a-data-source.md#create-the-parser), [composes a public mapper with internal mapping UDOs](../../tutorials/onboard-a-data-source.md#create-the-mapper), and shows how the parse, map, and normalize [layers fit together](../../tutorials/onboard-a-data-source.md#fit-it-into-the-data-lifecycle) behind one call.

## Create a user-defined operator

**User-defined operators (UDOs)** are reusable building blocks that you can use in your pipelines. Place operator files in the `operators` directory of your package.

Tenzir names operators using the convention `<package>::[dirs...]::<basename>`. For example, a file at `operators/ocsf/map.tql` in a package with ID `vendor` becomes the operator `vendor::ocsf::map`. The `::` separator forms a [module](../../explanations/packages.md#modules), which only packages use, so no builtin can shadow your operators.

operators/ocsf/auth.tql

```tql
// Normalize authentication logs to OCSF Authentication event class
class_uid = 3002
category_uid = 3
activity_id = 1 if outcome == "success" else 2
actor.user.name = username
actor.user.uid = user_id
src_endpoint.ip = src_ip
dst_endpoint.ip = dst_ip
drop username, user_id, src_ip, dst_ip, outcome
```

After installing the package, use the operator in any pipeline:

```tql
from_file "auth.json"
vendor::ocsf::auth
publish "ocsf-events"
```

### Choose a namespace

Name the package after the vendor and give each of the vendor’s products a directory below it, so operator names read `vendor::product::<operator>`. Our `amazon` package does this: `amazon::vpc_flow::parse_v2` sits next to `amazon::route53::ocsf::map`, and adding another AWS service means adding a directory rather than renaming anything.

Drop the product level when the vendor ships one thing, or when vendor and product are the same name. Our `zeek` package is `zeek::ocsf::map`, not `zeek::zeek::ocsf::map`.

Examples in these guides use the single-level form, as in `vendor::ocsf::map`, because a second placeholder segment adds length without teaching anything. Read them as the one-product case, and insert your product level where a vendor package needs it.

## Add parameters to operators

Operators can accept positional and named arguments, enabling you to create flexible, reusable building blocks that match the calling conventions of built-in operators. Define parameters in a YAML frontmatter block at the beginning of the `.tql` file.

### Parameter schema

Each parameter supports the following fields:

| Field         | Required | Description                                          |
| ------------- | -------- | ---------------------------------------------------- |
| `name`        | Yes      | Parameter name, used as `$name` in the operator body |
| `type`        | No       | Type constraint for the parameter value              |
| `description` | No       | Documentation string for the parameter               |
| `default`     | No       | Default value if the argument is not provided        |

### Supported types

The `type` field constrains what values the parameter accepts. It uses TQL type definition syntax:

| Type       | Description                                                                   |
| ---------- | ----------------------------------------------------------------------------- |
| `field`    | A field selector (for example, `name`). Defaults must be `null` or a selector |
| `string`   | A string literal or expression                                                |
| `int`      | A signed integer value                                                        |
| `uint`     | An unsigned integer value                                                     |
| `float`    | A floating-point value                                                        |
| `bool`     | A boolean value                                                               |
| `duration` | A duration value                                                              |
| `time`     | A timestamp value                                                             |
| `ip`       | An IP address                                                                 |
| `subnet`   | A subnet value                                                                |
| `blob`     | A blob value                                                                  |
| `secret`   | A secret string (accepts string literals)                                     |

If you omit the `type` field, the parameter accepts any value.

Null values

All typed parameters accept `null` values regardless of their declared type.

### Type checking

Tenzir validates parameter types at compile time when possible:

* **Compile-time checking** occurs when arguments are constant values
* **Runtime checking** defers validation for expressions containing runtime data

If a type mismatch occurs, Tenzir reports an error with the expected type and shows usage information for the operator.

## Work with operator parameters

This section shows common patterns for defining and using operator parameters.

### Define positional arguments

Positional arguments are passed in order when calling the operator. Define them under the `args.positional` key:

operators/tag.tql

```tql
---
args:
  positional:
    - name: field
      type: field
    - name: value
      type: string
---


$field = $value
```

Call this operator with positional arguments:

```tql
from {x: 1}
vendor::tag name, "Alice"
```

```tql
{x: 1, name: "Alice"}
```

### Define named arguments

Named arguments use the `name=value` syntax and can have default values. Define them under the `args.named` key:

operators/tag.tql

```tql
---
args:
  positional:
    - name: field
      type: field
    - name: value
      type: string
  named:
    - name: prefix
      type: string
      default: ""
---


$field = f"{$prefix}{$value}"
```

Call this operator with both positional and named arguments:

```tql
from {x: 1}
vendor::tag name, "Alice", prefix="User: "
```

```tql
{x: 1, name: "User: Alice"}
```

### Make arguments optional

Positional arguments with a `default` value become optional. Callers can omit them, and Tenzir substitutes the default:

operators/greet.tql

```tql
---
args:
  positional:
    - name: name
      type: string
      default: "World"
---


greeting = f"Hello, {$name}!"
```

Calling the operator without arguments uses the default value:

```tql
from {}
vendor::greet
```

```tql
{greeting: "Hello, World!"}
```

Passing an explicit argument overrides the default:

```tql
from {}
vendor::greet "Alice"
```

```tql
{greeting: "Hello, Alice!"}
```

### Use field parameters

The `field` type enables dynamic field selection. The caller passes a field path, and the operator uses it to read or write data:

operators/double\_value.tql

```tql
---
args:
  positional:
    - name: target
      type: field
---


$target = $target * 2
```

Using the operator:

```tql
from {count: 5, score: 10}
vendor::double_value count
```

```tql
{count: 10, score: 10}
```

To update a child field of the selected target, access it like any other field. Use dot syntax for ordinary field names, string-literal bracket syntax for names with punctuation, or an index expression that resolves to a field name:

operators/tag\_nested.tql

```tql
---
args:
  positional:
    - name: target
      type: field
    - name: name
      type: string
    - name: value
      type: string
---


$target.status = $value
$target["mapped-status"] = $value
$target[$name] = $value
```

Using the operator:

```tql
from {event: {}}
vendor::tag_nested event, "dynamic-status", "ok"
```

```tql
{
  event: {
    status: "ok",
    "mapped-status": "ok",
    "dynamic-status": "ok",
  },
}
```

### Default to a selector

Field parameters accept a selector as default value, such as `this`, `this.name`, or `foo.bar`. This makes it easy to write operators that work on the entire event by default but can be scoped to a specific field on demand:

operators/wrap.tql

```tql
---
args:
  named:
    - name: field
      type: field
      default: this
---


this = {wrapped: $field}
```

Calling the operator without arguments wraps the whole event:

```tql
from {name: "Alice"}
vendor::wrap
```

```tql
{
  wrapped: {
    name: "Alice",
  },
}
```

Passing an explicit selector wraps just that field:

```tql
from {name: "Alice"}
vendor::wrap field=name
```

```tql
{
  wrapped: "Alice",
}
```

### Detect whether an argument was provided

Any typed parameter supports `default: null`, making it optional without requiring a concrete fallback value. Inside the operator body, compare the parameter against `null` to check whether the caller provided it.

This is especially useful for `field` parameters whose behavior should change entirely depending on whether the caller selected a field:

operators/redact.tql

```tql
---
args:
  positional:
    - name: input
      type: field
  named:
    - name: target
      type: field
      default: null
      description: "Optional field to redact"
---


if $target != null {
  $target = "REDACTED"
}
$input = $input
```

When the caller omits `target`, the operator skips the redaction:

```tql
from {message: "hello", secret: "s3cret"}
vendor::redact message
```

```tql
{message: "hello", secret: "s3cret"}
```

When the caller provides `target`, the operator redacts that field:

```tql
from {message: "hello", secret: "s3cret"}
vendor::redact message, target=secret
```

```tql
{message: "hello", secret: "REDACTED"}
```

The same pattern works for other types. For example, an optional `string` parameter that only applies when provided:

operators/tag.tql

```tql
---
args:
  positional:
    - name: field
      type: field
  named:
    - name: suffix
      type: string
      default: null
---


if $suffix != null {
  $field = f"{$field}{$suffix}"
}
```

Note

Callers cannot pass `null` explicitly for a `field` parameter. Writing `target=null` produces a compile-time error because `null` is not a valid field selector. The `null` default applies only when the argument is omitted entirely. Other parameter types do accept explicit `null` values.

### Call other operators

Parameterized operators can call other operators, including passing through their own parameters:

operators/transform.tql

```tql
---
args:
  positional:
    - name: field
      type: field
  named:
    - name: multiplier
      type: int
      default: 2
---


utils::scale $field, factor=$multiplier
```

## See also

* [Create a package](create-a-package.md)
* [Add pipelines](add-pipelines.md)
* [Add constants](add-constants.md)
* [Test packages](test-packages.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
