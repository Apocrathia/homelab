---
title: "Install a package"
canonical: https://tenzir.com/docs/guides/packages/install-a-package
source: https://tenzir.com/docs/guides/packages/install-a-package.md
section: "Docs"
---

# Install a package

> Write your own package

[Packages](../../explanations/packages.md) provide a flexible approach for combining operators, pipelines, contexts, and examples into a unified deployable unit.

Write your own package

Want to create your own package? Check out our [package development tutorial](../../tutorials/onboard-a-data-source.md).

## Install from the Tenzir Library

The most convenient way to install a package is through the [Tenzir Library](https://app.tenzir.com/library):

1. Click on a package
2. Select the *Install* tab
3. Define your inputs (optional)
4. Click the *Install* button in the bottom right

## Install with the package operator

To install a package interactively in TQL, use the [`package_add`](https://tenzir.com/docs/reference/operators/package_add.md) operator:

```tql
package_add "/path/to/pkg"
```

This installs the package from the directory `/path/to/pkg`. Pass an `inputs` record to adjust the package configuration and replace the package’s templates with concrete values:

```tql
package_add "package.yaml", inputs={
  endpoint: "localhost:42000",
  policy: "block",
}
```

Your package now appears when you list all installed packages:

```tql
package_list
```

```tql
{
  id: "your-package",
  install_status: "installed",
  // …
}
```

To uninstall a package interactively, use [`package_remove`](https://tenzir.com/docs/reference/operators/package_remove.md) and pass the package ID.

```tql
package_remove "your-package"
```

## Install from a custom repository

For packages hosted in a Git repository (like a private library), clone the repository and point Tenzir at it. You can reference the entire library directory - Tenzir discovers all packages inside:

```bash
git clone https://github.com/your-org/my-packages.git
tenzir --package-dirs=/path/to/my-packages
```

Or configure the package directories in `tenzir.yaml`:

tenzir.yaml

```yaml
tenzir:
  package-dirs:
    - /path/to/my-packages
```

You can also install individual packages interactively:

```tql
package_add "/path/to/my-packages/package-one"
```

## Install with Infrastructure as Code (IaC)

For IaC-style deployments, you can install packages *as code* by putting them next to your `tenzir.yaml` configuration file:

* /opt/tenzir/etc/tenzir/

  * packages/

    * your-package/

      * operators/

        * …

      * pipelines/

        * …

      * config.yaml The configuration for the package

      * package.yaml The package manifest with metadata

  * tenzir.yaml

Inside the `packages` directory, each installed package has its own directory. The directory name matches the package ID.

The node searches for packages in the following locations:

1. The `packages` directory in all [configuration directories](../../explanations/configuration.md).
2. All directories specified in the `tenzir.package-dirs` configuration option.

To provide inputs in IaC-mode, place a `config.yaml` file next to the `package.yaml` file. For example, this configuration sets the inputs `endpoint` and `policy`:

config.yaml

```yaml
inputs:
  endpoint: localhost:42000
  policy: block
```

## See also

* [Configure inputs](configure-inputs.md)
* [Publish a package](publish-a-package.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
* [Packages](../../explanations/packages.md)
