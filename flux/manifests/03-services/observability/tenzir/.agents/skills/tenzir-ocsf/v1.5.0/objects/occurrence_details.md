# Occurrence Details (occurrence_details)

Details about where in the target entity, specified information was discovered. Only the attributes, relevant to the target entity type should be populuated.

- **Extends**: [Object (object)](object.md)

## Attributes

### `cell_name`

- **Type**: `string_t`
- **Requirement**: optional

The cell name/reference in a spreadsheet. e.g `A2`

### `column_name`

- **Type**: `string_t`
- **Requirement**: optional

The column name in a spreadsheet, where the information was discovered.

### `column_number`

- **Type**: `integer_t`
- **Requirement**: optional

The column number in a spreadsheet or a plain text document, where the information was discovered.

### `end_line`

- **Type**: `integer_t`
- **Requirement**: optional

The line number of the last line of the file, where the information was discovered.

### `json_path`

- **Type**: `string_t`
- **Requirement**: optional

The JSON path of the attribute in a json record, where the information was discovered

### `page_number`

- **Type**: `integer_t`
- **Requirement**: optional

The page number in a document, where the information was discovered.

### `record_index_in_array`

- **Type**: `integer_t`
- **Requirement**: optional

The index of the record in the array of records, where the information was discovered. e.g. the index of a record in an array of JSON records in a file.

### `row_number`

- **Type**: `integer_t`
- **Requirement**: optional

The row number in a spreadsheet, where the information was discovered.

### `start_line`

- **Type**: `integer_t`
- **Requirement**: optional

The line number of the first line of the file, where the information was discovered.
