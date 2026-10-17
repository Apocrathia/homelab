---
title: "fields"
canonical: https://tenzir.com/docs/reference/operators/fields
source: https://tenzir.com/docs/reference/operators/fields.md
section: "Docs"
---

# fields

> Retrieves all fields stored at a node.

Retrieves all fields stored at a node.

```tql
fields
```

## Description

The `fields` operator shows a list of all fields stored at a node across all available schemas.

## Examples

### Get the top-5 most frequently used fields across schemas

```tql
fields
summarize field, count=count_distinct(schema), schemas=distinct(schema)
sort -count
head 5
```

## See Also

* [`schemas`](https://tenzir.com/docs/reference/operators/schemas.md)
* [Show available schemas](../../guides/store/show-available-schemas.md)
