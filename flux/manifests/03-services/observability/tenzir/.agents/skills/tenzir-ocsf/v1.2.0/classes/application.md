# Application Activity (application)

Abstract base class for Application Activity event classes. Concrete classes in this category extend this class and inherit its attributes.

- **Category**: Application Activity
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

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
