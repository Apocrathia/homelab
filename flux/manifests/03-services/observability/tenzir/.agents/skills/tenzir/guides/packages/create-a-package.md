---
title: "Create a package"
canonical: https://tenzir.com/docs/guides/packages/create-a-package
source: https://tenzir.com/docs/guides/packages/create-a-package.md
section: "Docs"
---

# Create a package

> This guide shows you how to create a package from scratch. You’ll learn how to set up the directory structure, write the manifest, choose between operators and pipelines, and ship runnable examples.

This guide shows you how to create a package from scratch. You’ll learn how to set up the directory structure, write the manifest, choose between operators and pipelines, and ship runnable examples.

## Create the package scaffold

Create a directory with the standard package layout:

* vendor/

  * changelog/ User-facing documentation of changes

    * …

  * examples/ Runnable snippets for users

    * …

  * operators/ Reusable building blocks for pipelines

    * …

  * pipelines/ Deployable pipelines

    * …

  * tests/ Integration tests

    * inputs/ Sample data for test pipelines

      * …

  * package.yaml Manifest: descriptive fields, metadata, contexts, and inputs

The `tests/inputs/` directory holds sample data that the test harness makes available via the `TENZIR_INPUTS` environment variable. Reference these files from test pipelines using `f"{env("TENZIR_INPUTS")}/filename.txt"`.

## Add the package manifest

The `package.yaml` file is the **package manifest**. It marks the directory as a package and declares the package’s identity, the metadata the Tenzir Library shows, and the inputs users fill in at installation.

### Add descriptive metadata

Start with the required and recommended metadata fields:

package.yaml

```yaml
# The unique ID of the package. (required)
id: vendor


# The display name of the package and a path to an icon for the package.
name: My Package
package_icon: https://example.com/icon.svg


# The display name of the package author and a path to a profile picture.
author: Your Name
author_icon: https://github.com/yourusername.png


# A user-facing description of the package.
description: |
  A brief description of what your package does and the use cases it supports.
  You can use **Markdown** formatting here.


# User-facing categories for the Tenzir Library.
# Valid values: sources, destinations, mappings, contexts.
categories:
  - sources
  - mappings
```

### Add external metadata

The top-level `metadata` field carries data for external tools. Tenzir accepts the field but never interprets its contents.

package.yaml

```yaml
metadata:
  vendor: Vendor
  source: https://github.com/vendor/tenzir-packages
```

Unknown top-level keys fail validation, so put anything Tenzir does not define under `metadata`.

### Define inputs

**Inputs** are variables that the node replaces with user-provided values when someone installs the package.

package.yaml

```yaml
inputs:
  refresh_interval:
    name: Refresh Interval
    description: How often the pipeline refreshes the data source.
    default: 1h
```

Reference an input as `{{ inputs.input-id }}`, which our guide on [configuring inputs](configure-inputs.md) covers in full.

An input is fixed for the whole installation, so reach for it only when a value belongs to the deployment rather than to a call. Anything a caller might vary belongs in an operator argument, which is typed and checked every time the pipeline compiles.

## Operators versus pipelines

Every capability you add is either a user-defined operator or a pipeline, so settle that question before you write either one.

| Aspect        | Operators                      | Pipelines                            |
| ------------- | ------------------------------ | ------------------------------------ |
| **Purpose**   | Reusable building blocks       | Complete workflows                   |
| **Execution** | Called explicitly by other TQL | Run automatically on install         |
| **Structure** | No input/output restrictions   | Must have input and output operators |
| **Testing**   | Test with sample data          | Test with fixtures or mocks          |

Write an operator for a transformation users will reuse, compose with other operations, and call at a moment they choose.

Write a pipeline for a self-contained workflow that the package itself should run, such as refreshing a context every hour.

Most packages ship both: operators that carry the reusable capabilities, and disabled pipelines that demonstrate how to compose them. Our guide on [adding pipelines](add-pipelines.md) covers the frontmatter that controls scheduling, restarts, and whether a pipeline runs at all.

## Add examples

The `examples` directory holds self-contained snippets that run after installation. They appear in the [Tenzir Library](https://app.tenzir.com/library), which makes them the first TQL most users see from your package, so they run on a literal event rather than on live credentials. Start with the shortest path through the package:

examples/basic-usage.tql

```tql
from {message: "2026-01-15T10:30:00Z auth alice success"}
vendor::ocsf::normalize message
```

Then show a snippet per use case the package supports:

examples/alert-on-high-severity.tql

```tql
from {message: "2026-01-15T10:31:00Z auth root failure"}
vendor::ocsf::normalize message
where severity_id >= 4
publish "alerts"
```

One example, one use case. An example that needs a paragraph of setup belongs in a pipeline or a test.

## Define contexts

A package that enriches events declares its lookup tables and other contexts under a `contexts` key in the manifest, which our guide on [adding contexts](add-contexts.md) documents with the full schema.

## See also

* [Install a package](install-a-package.md)
* [Configure inputs](configure-inputs.md)
* [Add operators](add-operators.md)
* [Add pipelines](add-pipelines.md)
* [Add constants](add-constants.md)
* [Maintain a changelog](maintain-a-changelog.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
* [Packages](../../explanations/packages.md)
