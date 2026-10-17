# AI Operation (ai_operation)

AI-specific attributes for model operations, retrieval systems, and agent activities. e.g. model_name, total_token_counts etc.

## Applies to

- Account Change
- API Activity
- Application Activity
- Application Error
- Application Lifecycle
- Authentication
- Authorize Session
- Clipboard Activity
- Datastore Activity
- Device Power State Activity
- DHCP Activity
- DNS Activity
- DNS Zone Transfer Activity
- Email Activity
- Entity Management
- Event Log Activity
- File Hosting Activity
- File System Activity
- FTP Activity
- Group Management
- HTTP Activity
- Identity & Access Management
- Kernel Activity
- Kernel Extension Activity
- Memory Activity
- Module Activity
- Network
- Network Activity
- Network File Activity
- NTP Activity
- Peripheral Activity
- Process Activity
- RDP Activity
- Role Management
- Scan Activity
- Scheduled Job Activity
- Script Activity
- SMB Activity
- SSH Activity
- System Activity
- Tunnel Activity
- User Access Management
- User Management
- Web Resource Access Activity
- Web Resources Activity

## Attributes

### `ai_agent`

- **Type**: [`ai_agent`](../objects/ai_agent.md)
- **Requirement**: optional
- **Group**: context

The autonomous AI agent that performed this operation. Carries model identity via `ai_agent.ai_model`. Populate when the action was performed by an agent rather than a direct model call.

### `ai_capability`

- **Type**: [`ai_capability`](../objects/ai_capability.md)
- **Requirement**: optional
- **Group**: context

The AI capability invoked in this operation: a tool, resource, or prompt, in the sense of the MCP primitives. Records the capability's identity, kind, provenance, declared contracts, and declared safety hints. Transport details remain on the event's transport attributes (e.g., `api`, `http_request`), and affected objects remain in `resources`. Producers deriving `activity_id` from the capability's declared hints (e.g., mapping a declared read-only tool to `Read`) should note the hints are self-declared and unverified; when the observed operation contradicts the declaration, classify by observed behavior.

### `ai_model`

- **Type**: [`ai_model`](../objects/ai_model.md)
- **Requirement**: recommended
- **Group**: context

The AI model involved in this operation. Use for direct model invocations where no autonomous agent is involved. For agent-mediated operations, model identity is carried within `ai_agent.ai_model` instead.

### `delegation`

- **Type**: [`delegation`](../objects/delegation.md)
- **Requirement**: optional
- **Group**: context

The delegation under whose authority this AI operation was performed. Links the event to a durable authorization context independent of traces and sessions, enabling correlation of all events executed under the same delegated authority.

### `message_context`

- **Type**: [`message_context`](../objects/message_context.md)
- **Requirement**: optional
- **Group**: context

Communication context for AI system interactions including protocols, roles, clients, and session information for MCP and other AI communication systems.

### `ai_status`

- **Type**: [`ai_status`](../objects/ai_status.md)
- **Requirement**: optional
- **Group**: context

Per-operation outcome scalars for this operation, such as the stop reason and the permission check result, grouped in the `ai_status` object so they do not proliferate as discrete attributes at the event root. Additional outcome attributes may be added to the object in later versions.
