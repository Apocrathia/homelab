---
title: "package_add"
canonical: https://tenzir.com/docs/reference/operators/package_add
source: https://tenzir.com/docs/reference/operators/package_add.md
section: "Docs"
---

# package_add

> Installs a package.

Installs a package.

```tql
package_add [package_path:string, inputs=record]
```

## Description

The `package_add` operator installs all operators, pipelines, and contexts from a package.

### `package_path : string (optional)`

The path to a package located on the file system.

### `inputs = record (optional)`

A record of optional package inputs that configure the package.

## Examples

### Add a package from the Community Library

```tql
package_add "suricata-ocsf"
```

### Add a local package with inputs

```tql
package_add "/mnt/config/tenzir/library/zeek",
  inputs={format: "tsv", "log-directory": "/opt/tenzir/logs"}
```

## See Also

* [`package_list`](https://tenzir.com/docs/reference/operators/package_list.md)
* [`package_remove`](https://tenzir.com/docs/reference/operators/package_remove.md)
* [Install a package](../../guides/packages/install-a-package.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
