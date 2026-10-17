# Ticket (ticket)

The Ticket object represents ticket in the customer's systems like Salesforce, jira etc.

- **Extends**: [Object (object)](object.md)

## Attributes

### `src_url`

- **Type**: `url_t`
- **Requirement**: recommended

The url of a ticket in the ticket system.

### `title`

- **Type**: `string_t`
- **Requirement**: optional

The title of the ticket.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The linked ticket type determines whether the ticket is internal or in an external ticketing system.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `Internal`
- `2`: `External`
- `99`: `Other`

The normalized identifier for the ticket type.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

Unique ticket identifier like ticket id.
