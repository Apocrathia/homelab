# Container (container)

The Container object describes an instance of a specific container. A container is a prepackaged, portable system image that runs isolated on an existing system using a container runtime like containerd.

- **Extends**: [Object (object)](object.md)

## Attributes

### `hash`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: recommended

Commit hash of image created for docker or the SHA256 hash of the container. For example: `13550340a8681c84c861aac2e5b440161c2b33a3e4f302ac680ca5b686de48de`.

### `image`

- **Type**: [`image`](image.md)
- **Requirement**: recommended

The container image used as a template to run the container.

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels associated to the container.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The container name.

### `network_driver`

- **Type**: `string_t`
- **Requirement**: optional

The network driver used by the container. For example, bridge, overlay, host, none, etc.

### `orchestrator`

- **Type**: `string_t`
- **Requirement**: optional

The orchestrator managing the container, such as ECS, EKS, K8s, or OpenShift.

### `pod_uuid`

- **Type**: `uuid_t`
- **Requirement**: optional

The unique identifier of the pod (or equivalent) that the container is executing on.

### `runtime`

- **Type**: `string_t`
- **Requirement**: optional

The backend running the container, such as containerd or cri-o.

### `size`

- **Type**: `long_t`
- **Requirement**: recommended

The size of the container image.

### `tag`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use the `labels or tags` attribute instead.

The tag used by the container. It can indicate version, format, OS.

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the container.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The full container unique identifier for this instantiation of the container. For example: `ac2ea168264a08f9aaca0dfc82ff3551418dfd22d02b713142a6843caa2f61bf`.
