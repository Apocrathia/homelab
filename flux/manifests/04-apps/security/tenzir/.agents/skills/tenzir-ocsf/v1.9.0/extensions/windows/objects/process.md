# Process (process)

Extends the process object to add Windows specific fields.

- **Extends**: [Process (process)](../../../objects/process.md)

## Inherited attributes

**From Process:**
- `file` (recommended)
- `parent_process` (recommended)
- `user` (recommended)

**From Process Entity:**
- `cmd_line` (recommended)
- `cpid` (recommended)
- `created_time` (recommended)
- `pid` (recommended)

## Attributes

### `hosted_services`

- **Type**: [`win_service`](../objects/win_service.md)
- **Requirement**: optional

The Windows services that this process is hosting.
