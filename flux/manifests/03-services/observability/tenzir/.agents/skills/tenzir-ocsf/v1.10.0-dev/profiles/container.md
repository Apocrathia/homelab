# Container (container)

The container context for a process.

## Attributes

### `container`

- **Type**: [`container`](../objects/container.md)
- **Requirement**: recommended
- **Group**: context

The information describing an instance of a container. A container is a prepackaged, portable system image that runs isolated on an existing system using a container runtime like containerd.

### `namespace_pid`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: context

If running under a process namespace (such as in a container), the process identifier within that process namespace.
