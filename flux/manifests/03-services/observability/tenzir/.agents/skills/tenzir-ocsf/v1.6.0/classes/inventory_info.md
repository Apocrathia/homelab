# Device Inventory Info (inventory_info)

Device Inventory Info events report device inventory data that is either logged or proactively collected. For example, when collecting device information from a CMDB or running a network sweep of connected devices.

- **Class UID**: `5001`
- **Category**: Discovery
- **Extends**: [Discovery (discovery)](discovery.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: optional
- **Group**: context

The actor object describes details about the user/role/process that was the source of the activity. Note that this is not the threat actor of a campaign but may be part of a campaign.

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: required
- **Group**: primary

The device that is being discovered by an inventory process.
