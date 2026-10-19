---
title: "package_remove"
canonical: https://tenzir.com/docs/reference/operators/package_remove
source: https://tenzir.com/docs/reference/operators/package_remove.md
section: "Docs"
---

# package_remove

> Uninstalls a package.

Uninstalls a package.

```tql
package_remove package_id:string
```

## Description

The `package_remove` operator uninstalls a previously installed package.

### `package_id : string`

The unique ID of the package as in the package definition.

## Examples

### Remove an installed package

```tql
package_remove "suricata-ocsf"
```

## See Also

* [`package_add`](https://tenzir.com/docs/reference/operators/package_add.md)
* [`package_list`](https://tenzir.com/docs/reference/operators/package_list.md)
* [Install a package](../../guides/packages/install-a-package.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
