# Query Information (query_info)

The query info object holds information related to data access within a datastore. To access, manipulate, delete, or retrieve data from a datastore, a query must be written using a specific syntax.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `query_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the query was run.

### `query_string`

- **Type**: `string_t`
- **Requirement**: required

A string representing the query code being run. For example: `SELECT * FROM my_table`

### `data`

- **Type**: `json_t`
- **Requirement**: optional

The data returned from the query execution.

### `bytes`

- **Type**: `long_t`
- **Requirement**: optional

The size of the data returned from the query.

### `name`

- **Type**: `string_t`

The query name for a saved or scheduled query.

### `uid`

- **Type**: `string_t`

The unique identifier of the query.
