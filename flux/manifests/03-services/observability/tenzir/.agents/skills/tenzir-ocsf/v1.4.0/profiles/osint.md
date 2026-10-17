# OSINT (osint)

The OSINT (Open Source Intelligence) profile contains one or more indicators and associated analysis and details, such as registrar (WHOIS) information and commentary about a hostname, or information about a digital certificate and its usage within a campaign. This information can be used to further enrich a detection or finding by providing decisioning support to other analysts and engineers within the profile itself.

## Applies to

- Account Change
- Admin Group Query
- Airborne Broadcast Activity
- API Activity
- Application Activity
- Application Error
- Application Lifecycle
- Authentication
- Authorize Session
- Base Event
- Cloud Resources Inventory Info
- Compliance Finding
- Data Security Finding
- Datastore Activity
- Detection Finding
- Device Config State
- Device Config State Change
- Device Inventory Info
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
- Identity & Access Management
- Incident Finding
- Job Query
- Kernel Activity
- Kernel Extension Activity
- Kernel Object Query
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
- Peripheral Device Query
- Process Activity
- Process Query
- Process Remediation Activity
- RDP Activity
- Remediation Activity
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
- User Query
- User Session Query
- Vulnerability Finding
- Web Resource Access Activity
- Web Resources Activity

## Attributes

### `osint`

- **Type**: [`osint`](../objects/osint.md)
- **Requirement**: required
- **Group**: primary

The OSINT (Open Source Intelligence) object contains details related to an indicator such as the indicator itself, related indicators, geolocation, registrar information, subdomains, analyst commentary, and other contextual information. This information can be used to further enrich a detection or finding by providing decisioning support to other analysts and engineers.
