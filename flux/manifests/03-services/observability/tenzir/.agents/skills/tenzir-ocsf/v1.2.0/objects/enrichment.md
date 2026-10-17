# Enrichment (enrichment)

The Enrichment object provides inline enrichment data for specific attributes of interest within an event. It serves as a mechanism to enhance or supplement the information associated with the event by adding additional relevant details or context.

- **Extends**: [Object (object)](object.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: required

The enrichment data associated with the attribute and value. The meaning of this data depends on the type the enrichment record.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The name of the attribute to which the enriched data pertains.

### `provider`

- **Type**: `string_t`
- **Requirement**: recommended

The enrichment data provider name.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The enrichment type. For example: `location`.

### `value`

- **Type**: `string_t`
- **Requirement**: required

The value of the attribute to which the enriched data pertains.
