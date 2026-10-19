# Host (host)

Adds host and actor context to event classes. Apply this profile when the event originates from or is observed on a specific host or device, and when the initiating user, process, or service is known. All event classes include this profile by default through the base event.

## Applies to

- Account Change
- Admin Group Query
- Airborne Broadcast Activity
- API Activity
- Application Activity
- Application Error
- Application Lifecycle
- Application Security Posture Finding
- Authentication
- Authorize Session
- Base Event
- Clipboard Activity
- Cloud Resources Inventory Info
- Compliance Finding
- Data Security Finding
- Datastore Activity
- Detection Finding
- Device Config State
- Device Config State Change
- Device Inventory Info
- Device Power State Activity
- DHCP Activity
- Discovery
- Discovery Result
- DNS Activity
- Drone Flights Activity
- Email Activity
- Email File Activity
- Email URL Activity
- Entity Management
- Event Log Activity
- File Hosting Activity
- File Query
- File Remediation Activity
- File System Activity
- Finding
- Folder Query
- FTP Activity
- Group Management
- HTTP Activity
- IAM Analysis Finding
- Identity & Access Management
- Incident Finding
- Job Query
- Kernel Activity
- Kernel Extension Activity
- Kernel Object Query
- Live Evidence Info
- Memory Activity
- Module Activity
- Module Query
- Network
- Network Activity
- Network Connection Query
- Network File Activity
- Network Remediation Activity
- Networks Query
- NTP Activity
- Operating System Patch State
- OSINT Inventory Info
- Peripheral Activity
- Peripheral Device Query
- Process Activity
- Process Query
- Process Remediation Activity
- RDP Activity
- Remediation Activity
- Role Management
- Scan Activity
- Scheduled Job Activity
- Script Activity
- Security Finding
- Service Query
- SMB Activity
- Software Inventory Info
- SSH Activity
- Startup Item Query
- System Activity
- Tunnel Activity
- Unmanned Systems
- User Access Management
- User Inventory Info
- User Management
- User Query
- User Session Query
- Vulnerability Finding
- Web Resource Access Activity
- Web Resources Activity

## Attributes

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: optional

The user, process, or service that initiated the activity on the host. For system-level events this is typically a process; for IAM events it is typically a user or role.

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: recommended

The host or device where the activity was observed. Populate with details such as hostname, IP address, OS, and hardware identifiers when available from the source.
