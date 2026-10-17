# Entity Management (entity_management)

Entity Management events report activity by a managed client, a micro service, or a user at a management console. The activity can be a create, read, update, and delete operation on a managed entity.

- **Class UID**: `3004`
- **Category**: Identity & Access Management
- **Extends**: [Identity & Access Management (iam)](iam.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Create`
- `2`: `Read`
- `3`: `Update`
- `4`: `Delete`

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Group**: context

Use for when the entity acting upon another entity is a process or user.

### `comment`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: primary

The user provided comment about why the entity was changed.

### `entity`

- **Type**: [`managed_entity`](../objects/managed_entity.md)
- **Requirement**: required
- **Group**: primary

The managed entity that is being acted upon.

### `entity_result`

- **Type**: [`managed_entity`](../objects/managed_entity.md)
- **Requirement**: optional
- **Group**: primary

The updated managed entity.
