# Ticket (ticket)

The Ticket object represents ticket in the customer's IT Service Management (ITSM) systems like ServiceNow, Jira, etc.

- **Extends**: [Object (object)](object.md)

## Attributes

### `src_url`

- **Type**: `url_t`
- **Requirement**: recommended

The url of a ticket in the ticket system.

### `status`

- **Type**: `string_t`
- **Requirement**: optional

The status of the ticket normalized to the caption of the `status_id` value. In the case of `99`, this value should as defined by the source.

### `status_details`

- **Type**: `string_t`
- **Requirement**: optional

A list of contextual descriptions of the `status, status_id` values.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `status`

#### Enum values

- `1`: `New` - The ticket is new and yet to be reviewed.
- `2`: `In Progress` - The ticket is actively being worked on.
- `3`: `Notified` - Relevant parties have been notified about the ticket.
- `4`: `On Hold` - Work on the ticket is temporarily suspended.
- `5`: `Resolved` - The ticket is resolved and a solution is implemented, pending confirmation or verification from the requestor.
- `6`: `Closed` - The ticket has been completed and closed.
- `7`: `Canceled` - The ticket has been canceled and will not be processed.
- `8`: `Reopened` - The ticket was previously closed, but has been reopened.

The normalized identifier for the ticket status.

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

Unique identifier of the ticket.
