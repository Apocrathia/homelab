# Data Classification (data_classification)

The Data Classification profile adds attributes to specific resource objects, allowing users to describe information about classifiers & data classification results.

## Attributes

### `data_classification`

- **Type**: [`data_classification`](../objects/data_classification.md)
- **Requirement**: recommended
- **Group**: context

> **Deprecated since v1.4.0.** Use the attribute `data_classifications` instead

The Data Classification object includes information about data classification levels and data category types.

### `data_classifications`

- **Type**: [`data_classification`](../objects/data_classification.md)
- **Requirement**: recommended
- **Group**: context

A list of Data Classification objects, that include information about data classification levels and data category types, identified by a classifier.
