# Actor (actor)

The Actor object contains details about the user, role, or process that initiated or performed a specific activity.

- **Extends**: [Object (object)](object.md)

## Attributes

### `authorizations`

- **Type**: [`authorization`](authorization.md)
- **Requirement**: optional

Provides details about an authorization, such as authorization outcome, and any associated policies related to the activity/event.

### `idp`

- **Type**: [`idp`](idp.md)
- **Requirement**: optional

This object describes details about the Identity Provider used.

### `invoked_by`

- **Type**: `string_t`
- **Requirement**: optional

The name of the service that invoked the activity as described in the event.

### `process`

- **Type**: [`process`](process.md)
- **Requirement**: recommended

The process that initiated the activity.

### `session`

- **Type**: [`session`](session.md)
- **Requirement**: optional

The user session from which the activity was initiated.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

The user that initiated the activity or the user context from which the activity was initiated.
