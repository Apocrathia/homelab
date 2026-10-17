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

### `connection_info`

- **Type**: [`network_connection_info`](network_connection_info.md)
- **Requirement**: recommended

Describes details about the network connection associated to the activity that triggered the detection.

### `container`

- **Type**: [`container`](container.md)
- **Requirement**: recommended

Describes details about the container associated to the activity that triggered the detection.

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

### `device`

- **Type**: [`device`](device.md)
- **Requirement**: recommended

An addressable device, computer system or host associated to the activity that triggered the detection.

### `dst_endpoint`

- **Type**: [`network_endpoint`](network_endpoint.md)
- **Requirement**: recommended

Describes details about the destination of the network activity that triggered the detection.

### `email`

- **Type**: [`email`](email.md)
- **Requirement**: recommended

The email object associated to the activity that triggered the detection.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: recommended

Describes details about the file associated to the activity that triggered the detection.

### `http_request`

- **Type**: [`http_request`](http_request.md)
- **Requirement**: recommended

Describes details about the http request associated to the activity that triggered the detection.

### `http_response`

- **Type**: [`http_response`](http_response.md)
- **Requirement**: recommended

Describes details about the http response associated to the activity that triggered the detection.

### `ja4_fingerprint_list`

- **Type**: [`ja4_fingerprint`](ja4_fingerprint.md)
- **Requirement**: recommended

Describes details about the JA4+ fingerprints that triggered the detection.

### `job`

- **Type**: [`job`](job.md)
- **Requirement**: recommended

Describes details about the scheduled job that was associated with the activity that triggered the detection.

### `process`

- **Type**: [`process`](process.md)
- **Requirement**: recommended

Describes details about the process associated to the activity that triggered the detection.

### `query`

- **Type**: [`dns_query`](dns_query.md)
- **Requirement**: recommended

Describes details about the DNS query associated to the activity that triggered the detection.

### `script`

- **Type**: [`script`](script.md)
- **Requirement**: recommended

Describes details about the script that was associated with the activity that triggered the detection.

### `src_endpoint`

- **Type**: [`network_endpoint`](network_endpoint.md)
- **Requirement**: recommended

Describes details about the source of the network activity that triggered the detection.

### `tls`

- **Type**: [`tls`](tls.md)
- **Requirement**: recommended

Describes details about the Transport Layer Security (TLS) activity that triggered the detection.

### `url`

- **Type**: [`url`](url.md)
- **Requirement**: recommended

The URL object that pertains to the event or object associated to the activity that triggered the detection.

### `user`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

Describes details about the user that was the target or somehow else associated with the activity that triggered the detection.
