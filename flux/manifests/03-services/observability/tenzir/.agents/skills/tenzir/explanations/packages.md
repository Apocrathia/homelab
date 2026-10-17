---
title: "Packages"
canonical: https://tenzir.com/docs/explanations/packages
source: https://tenzir.com/docs/explanations/packages.md
section: "Docs"
---

# Packages

> This page explains how packages bundle pipelines, operators, contexts, and examples into a deployable unit. You’ll learn about package design principles and how the components fit together.

This page explains how packages bundle pipelines, operators, contexts, and examples into a deployable unit. You’ll learn about package design principles and how the components fit together.

## What is a package

A **package** is a 1-click deployable unit that implements a specific use case. Packages provide a modular way to distribute TQL functionality, from simple transformations to complete data processing workflows.

Packages solve common distribution challenges:

* **Reusability**: Share operators and pipelines across teams and projects
* **Configurability**: Template inputs let users customize behavior without modifying source files
* **Testability**: The Test Framework validates package behavior
* **Discoverability**: The Tenzir Library makes packages findable and installable

## Modules

A **module** is a namespace for the operators and functions that a package brings along. Modules use `::` as separator, and the package identifier is always the leading segment, as in `vendor::ocsf::map`.

Modules exist so that packages can pick natural names without colliding with each other. Two packages may both provide a `map` operator, because their fully qualified names differ. Nested namespaces add further segments, which lets a package group related entities, such as `vendor::ocsf::events::dns` next to `vendor::ocsf::events::http`.

Modules are exclusive to packages. Builtin operators and functions use flat names, such as [`ai_prompt`](https://tenzir.com/docs/reference/operators/ai_prompt.md), and never occupy a module. That separation makes the origin of an entity visible in its name: a name with `::` comes from a package, and a name without it is builtin. It also means no builtin can shadow a package’s entities, so a package is free to use a module name like `context` or `ocsf`.

## Package structure

A package is a directory with the following structure:

* pkg/

  * changelog/ User-facing trail of changes

    * …

  * examples/ Self-contained snippets to run

    * …

  * operators/ User-defined operators (UDOs)

    * …

  * pipelines/ Fully deployable pipelines

    * …

  * tests/ Integration tests

    * inputs/ Sample data for tests

      * …

  * constants.tql Package-level constants

  * package.yaml Package manifest

The `package.yaml` manifest is the only required file. It identifies the directory as a package and contains descriptive fields, top-level categories, external metadata, context definitions, and input specifications.

## Package components

### Operators

**User-defined operators (UDOs)** in the `operators` directory provide reusable building blocks. Tenzir names them using the convention `<package>::[dirs...]::<basename>`, which by convention resolves to `vendor::product::<operator>` for a vendor with several products and to `vendor::<operator>` for a vendor with one, as our guide on [choosing a namespace](../guides/packages/add-operators.md#choose-a-namespace) describes.

Operators can accept [positional and named arguments](../guides/packages/add-operators.md#add-parameters-to-operators) for flexible, parameterized transformations.

Packages that onboard a data source name their operators after the step they perform, which our tutorial on [onboarding a data source](../tutorials/onboard-a-data-source.md#fit-it-into-the-data-lifecycle) describes in full.

### Pipelines

**Pipelines** in the `pipelines` directory are complete, deployable TQL programs. Unlike operators, pipelines must have both input and output operators. They run automatically when you install the package (unless disabled).

Pipeline [frontmatter options](../guides/packages/add-pipelines.md#configure-pipeline-behavior) control restart behavior, enable/disable state, and other runtime settings. Ship optional operational pipelines with `disabled: true` so installation remains predictable.

### Contexts

**Contexts** defined in the manifest provide stateful enrichment capabilities. The node creates these contexts when you install the package, making them available for lookup and enrichment operations.

### Constants

**Constants** in the `constants.tql` file are package-level `let` bindings that Tenzir evaluates once when it loads the package. Reference them as `pkg::$name` from the package’s own operators and pipelines or from any external pipeline. Use them to share lookup tables, enumerations, and fixed thresholds that would otherwise be duplicated across files.

### Examples

**Examples** in the `examples` directory demonstrate how to use the package. These self-contained snippets appear in the Tenzir Library and help users understand package capabilities.

### Metadata

Top-level `categories` describe where the package appears in the Tenzir Library. Valid values are `sources`, `destinations`, `mappings`, and `contexts`.

The top-level `metadata` key stores opaque package data for external tools. Tenzir accepts the key in `package.yaml` but does not interpret its contents. Unknown top-level keys outside the package schema still fail validation, so use `metadata` for non-engine data that should travel with the package definition.

### Tests

**Tests** in the `tests` directory validate package behavior using the Test Framework. Tests ensure operators and pipelines work correctly and provide confidence during package updates.

### Changelog

The **changelog** directory tracks user-facing changes using the Ship Framework. It helps users understand what changed between versions and guides upgrade decisions.

## Design principles

### Composability

Good packages expose **operators** as building blocks that users can compose in their own pipelines. This maximizes flexibility: users decide when and how to invoke the functionality.

### Opt-in execution

Packages that include **pipelines** execute immediately upon installation. For maximum flexibility, ship pipelines with `disabled: true` so users can review and enable them explicitly.

### Configurability

Use **inputs** to parameterize packages instead of hardcoding values. This allows the same package to work across different environments without modification.

### Testability

Write tests for operators and contexts early. The Test Framework makes testing straightforward, and good test coverage enables confident iteration.

## Package lifecycle

1. **Create**: Set up the package structure and manifest
2. **Develop**: Add operators, pipelines, contexts, constants, and examples
3. **Test**: Validate behavior with the Test Framework
4. **Install**: Deploy locally or through the Tenzir Library
5. **Maintain**: Update the changelog and publish releases

## See also

* [Install a package](../guides/packages/install-a-package.md)
* [Create a package](../guides/packages/create-a-package.md)
* [Add operators](../guides/packages/add-operators.md)
* [Add pipelines](../guides/packages/add-pipelines.md)
* [Add contexts](../guides/packages/add-contexts.md)
* [Add constants](../guides/packages/add-constants.md)
* [Maintain a changelog](../guides/packages/maintain-a-changelog.md)
* [Onboard a data source](../tutorials/onboard-a-data-source.md)
