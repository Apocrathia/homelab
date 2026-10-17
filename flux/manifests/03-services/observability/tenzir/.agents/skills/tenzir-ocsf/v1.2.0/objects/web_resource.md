# Web Resource (web_resource)

The Web Resource object describes characteristics of a web resource that was affected by the activity/event.

- **Extends**: [Resource (_resource)](_resource.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: optional

Details of the web resource, e.g, `file` details, `search` results or application-defined resource.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

Description of the web resource.

### `name`

- **Type**: `string_t`

The name of the web resource.

### `type`

- **Type**: `string_t`

The web resource type as defined by the event source.

### `uid`

- **Type**: `string_t`

The unique identifier of the web resource.

### `url_string`

- **Type**: `url_t`
- **Requirement**: recommended

The URL pointing towards the source of the web resource.
