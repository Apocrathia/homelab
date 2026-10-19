# Actor (actor)

The Actor object contains details about the user, role, application, service, or process that initiated or performed a specific activity. Note that Actor is not the threat actor of a campaign but may be part of a campaign. When the initiator of the activity is an autonomous AI agent, apply the `ai_operation` profile and populate `ai_operation.ai_agent` rather than describing the agent here.

- **Extends**: [Object (object)](object.md)

## Attributes

### `app_name`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.9.0.** Use the `application.name` attribute instead.

The client application or service that initiated the activity. This can be in conjunction with the `user` if present. Note that `app_name` is distinct from the `process` if present.

### `app_uid`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.9.0.** Use the `application.uid` attribute instead.

The unique identifier of the client application or service that initiated the activity. This can be in conjunction with the `user` if present. Note that `app_name` is distinct from the `process.pid` or `process.uid` if present.

### `application`

- **Type**: [`application`](application.md)
- **Requirement**: recommended

The client application or service that initiated the activity. This can be in conjunction with the `user` if present. Note that `application` is distinct from the `process` if present.

### `authorizations`

- **Type**: [`authorization`](authorization.md)
- **Requirement**: optional

Provides details about an authorization, such as authorization outcome, and any associated policies related to the activity/event.

### `iam_role`

- **Type**: [`iam_role`](iam_role.md)
- **Requirement**: optional

The actor's role, or as an alternative to `user` or `process` when the role is serving as a security principal for the operation that initiated the activity.

### `idp`

- **Type**: [`idp`](idp.md)
- **Requirement**: optional

This object describes details about the Identity Provider used.

### `invoked_by`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.2.0.** Use the `application` attribute instead.

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
