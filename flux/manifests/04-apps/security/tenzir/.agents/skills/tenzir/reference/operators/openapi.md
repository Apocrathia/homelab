---
title: "openapi"
canonical: https://tenzir.com/docs/reference/operators/openapi
source: https://tenzir.com/docs/reference/operators/openapi.md
section: "Docs"
---

# openapi

> Shows the node’s OpenAPI specification.

Shows the node’s OpenAPI specification.

```tql
openapi
```

## Description

The `openapi` operator shows the current Tenzir node’s [OpenAPI specification](openapi.md) for all available REST endpoint plugins.

## Examples

### Render the OpenAPI specification as YAML

```tql
openapi
write_yaml
```

## See Also

* [`api`](https://tenzir.com/docs/reference/operators/api.md)
