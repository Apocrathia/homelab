# Cloud Resources Inventory Info (cloud_resources_inventory_info)

Cloud Resources Inventory Info events report cloud asset inventory data. This data can be either logged or proactively collected. For example, use this event class when creating an inventory of cloud resource information from a Configuration Management Database (CMDB), Cyber Asset Attack Surface Management (CAASM), direct public cloud service provider APIs, Software-as-a-Service (SaaS) APIs, or otherwise.

- **Class UID**: `5023`
- **Category**: Discovery
- **Extends**: [Discovery (discovery)](discovery.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `cloud`, `container`, `database`, `databucket`, `idp`, `resources`, `table`

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

### `cloud`

- **Type**: [`cloud`](../objects/cloud.md)
- **Requirement**: recommended
- **Group**: primary

Cloud service provider or SaaS platform metadata about the cloud resource(s) that are being discovered by an inventory process.

### `container`

- **Type**: [`container`](../objects/container.md)
- **Requirement**: recommended
- **Group**: primary

A cloud-based container image or running container discovered by an inventory process.

### `database`

- **Type**: [`database`](../objects/database.md)
- **Requirement**: recommended
- **Group**: primary

A cloud-based database discovered by an inventory process.

### `databucket`

- **Type**: [`databucket`](../objects/databucket.md)
- **Requirement**: recommended
- **Group**: primary

A cloud-based data bucket or other object storage discovered by an inventory process.

### `idp`

- **Type**: [`idp`](../objects/idp.md)
- **Requirement**: recommended
- **Group**: primary

The Identity Provider that is being discovered by an inventory process, or that is related to the cloud resource(s) being discovered by an inventory process.

### `region`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: context

The cloud region where the resource is located, e.g., `us-isof-south-1`, `eastus2`, `us-central1`, etc.

### `resources`

- **Type**: [`resource_details`](../objects/resource_details.md)
- **Requirement**: recommended
- **Group**: primary

The cloud resource(s) that are being discovered by an inventory process. Use this object if there is not a direct object match in the class.

### `table`

- **Type**: [`table`](../objects/table.md)
- **Requirement**: recommended
- **Group**: primary

A cloud-based database table discovered by an inventory process.
