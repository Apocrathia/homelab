# Software Inventory Info (software_info)

Software Inventory Info events report device software inventory data that is either logged or proactively collected. For example, when collecting device information from a CMDB or running a network sweep of connected devices.

- **Class UID**: `5020`
- **Category**: Discovery
- **Extends**: [Discovery (discovery)](discovery.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [OSINT](../profiles/osint.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)

## Attributes

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: optional
- **Group**: context

The actor object describes details about the user/role/process that was the source of the activity.

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: required
- **Group**: primary

The device that is being discovered by an inventory process.

### `package`

- **Type**: [`package`](../objects/package.md)
- **Requirement**: required
- **Group**: primary

The device software that is being discovered by an inventory process.

### `product`

- **Type**: [`product`](../objects/product.md)
- **Requirement**: optional
- **Group**: context

Additional product attributes that have been discovered or enriched from a catalog or other external source.
