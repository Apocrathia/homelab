# Record Integrity (record_integrity)

The Record Integrity profile adds one or more cryptographic attestations over the event itself, providing integrity, authenticity, and non-repudiation independent of any domain-specific content. It is domain-agnostic and may be applied to any event class. Each attestation is computed over a canonical serialization of the event; independent attesters over the same event each contribute a separate entry in `attestation_list`, while multiple signers of a single attestation, such as a producer plus a co-signature, notary, or witness, are carried in that attestation's `signatures` array, and a sequence of events may form a tamper-evident hash chain.

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

### `attestation_list`

- **Type**: [`attestation`](../objects/attestation.md)
- **Requirement**: optional
- **Group**: context

One or more cryptographic `attestation` objects over an event, each providing integrity, authenticity, and non-repudiation. Independent attesters over the same event — for example a producer at write time and a downstream processor at ingest — each contribute a separate attestation, distinct from co-signers on a single attestation, which share its `signatures` array. Carried on the `record_integrity` profile; the object itself is domain-agnostic.
