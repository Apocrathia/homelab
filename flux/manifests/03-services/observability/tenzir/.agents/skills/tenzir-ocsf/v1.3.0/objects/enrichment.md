# Enrichment (enrichment)

The Enrichment object provides inline enrichment data for specific attributes of interest within an event. It serves as a mechanism to enhance or supplement the information associated with the event by adding additional relevant details or context.

- **Extends**: [Object (object)](object.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the enrichment data was generated.

### `data`

- **Type**: `json_t`
- **Requirement**: required

The enrichment data associated with the attribute and value. The meaning of this data depends on the type the enrichment record.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

A long description of the enrichment data.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The name of the attribute to which the enriched data pertains.

### `provider`

- **Type**: `string_t`
- **Requirement**: recommended

The enrichment data provider name.

### `reputation`

- **Type**: [`reputation`](reputation.md)
- **Requirement**: optional

The reputation of the enrichment data.

### `short_desc`

- **Type**: `string_t`
- **Requirement**: recommended

A short description of the enrichment data.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The enrichment type. For example: `location`.

### `src_url`

- **Type**: `url_t`
- **Requirement**: recommended

The URL of the source of the enrichment data.

### `value`

- **Type**: `string_t`
- **Requirement**: required

The value of the attribute to which the enriched data pertains.
