# Evidence Artifacts (evidences)

A collection of evidence artifacts associated to the activity/activities that triggered a security detection.

- **Extends**: [Object (object)](object.md)

## Attributes

### `actor`

- **Type**: [`actor`](actor.md)
- **Requirement**: recommended

Describes details about the user/role/process that was the source of the activity that triggered the detection.

### `api`

- **Type**: [`api`](api.md)
- **Requirement**: recommended

Describes details about the API call associated to the activity that triggered the detection.

### `container`

- **Type**: [`container`](container.md)
- **Requirement**: recommended

Describes details about the container associated to the activity that triggered the detection.

### `connection_info`

- **Type**: [`network_connection_info`](network_connection_info.md)
- **Requirement**: recommended

Describes details about the network connection associated to the activity that triggered the detection.

### `data`

- **Type**: `json_t`
- **Requirement**: optional

Additional evidence data that is not accounted for in the specific evidence attributes. `Use only when absolutely necessary.`

### `database`

- **Type**: [`database`](database.md)
- **Requirement**: recommended

Describes details about the database associated to the activity that triggered the detection.

### `databucket`

- **Type**: [`databucket`](databucket.md)
- **Requirement**: recommended

Describes details about the databucket associated to the activity that triggered the detection.

### `dst_endpoint`

- **Type**: [`network_endpoint`](network_endpoint.md)
- **Requirement**: recommended

Describes details about the destination of the network activity that triggered the detection.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: recommended

Describes details about the file associated to the activity that triggered the detection.

### `process`

- **Type**: [`process`](process.md)
- **Requirement**: recommended

Describes details about the process associated to the activity that triggered the detection.

### `query`

- **Type**: [`dns_query`](dns_query.md)
- **Requirement**: recommended

Describes details about the DNS query associated to the activity that triggered the detection.

### `src_endpoint`

- **Type**: [`network_endpoint`](network_endpoint.md)
- **Requirement**: recommended

Describes details about the source of the network activity that triggered the detection.
