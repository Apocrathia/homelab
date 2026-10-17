# OSINT Inventory Info (osint_inventory_info)

OSINT Inventory Info events report open source intelligence or threat intelligence inventory data that is either logged or proactively collected. For example, when collecting OSINT information from Threat Intelligence Platforms (TIPs) or Extended Detection and Response (XDR) platforms, or collecting data from OSINT or other generic threat intelligence and enrichment feeds such as APIs and datastores.

- **Class UID**: `5021`
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

The actor describes the process that was the source of the inventory activity. In the case of OSINT inventory data, that could be a particular process or script that is run to scrape the OSINT or threat intelligence data. For example, it could be a Python process that runs to pull data from a MISP or Shodan API.

### `osint`

- **Type**: [`osint`](../objects/osint.md)
- **Requirement**: required
- **Group**: primary

The OSINT that is being discovered by an inventory process.
