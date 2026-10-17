# User Inventory Info (user_inventory)

User Inventory Info events report user inventory data that is either logged or proactively collected. For example, when collecting user information from Active Directory entries.

- **Class UID**: `5003`
- **Category**: Discovery
- **Extends**: [Discovery (discovery)](discovery.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: optional
- **Group**: context

The actor describes the process that was the source of the inventory activity. In the case of user inventory data, that could be a particular process or script that is run to scrape the user data. For example, it could be a powershell process that runs to pull data from the Azure AD graph API.

### `user`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: required
- **Group**: primary

The user that is being discovered by an inventory process.
