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
