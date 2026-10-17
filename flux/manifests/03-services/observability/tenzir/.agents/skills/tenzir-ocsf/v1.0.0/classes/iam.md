# Identity & Access Management (iam)

Abstract base class for Identity & Access Management event classes. Concrete classes in this category extend this class and inherit its attributes.

- **Category**: Identity & Access Management
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)
