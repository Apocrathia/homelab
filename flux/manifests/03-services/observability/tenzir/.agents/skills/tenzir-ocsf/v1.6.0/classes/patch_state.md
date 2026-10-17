# Operating System Patch State (patch_state)

Operating System Patch State reports the installation of an OS patch to a device and any associated knowledgebase articles.

- **Class UID**: `5004`
- **Category**: Discovery
- **Extends**: [Discovery (discovery)](discovery.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `device.os.sp_name`, `device.os.sp_ver`, `device.os.version`

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

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: required
- **Group**: primary

An addressable device, computer system or host.

### `kb_article_list`

- **Type**: [`kb_article`](../objects/kb_article.md)
- **Requirement**: recommended
- **Group**: primary

A list of KB articles or patches related to an endpoint. A KB Article contains metadata that describes the patch or an update.
