# AI Agent (ai_agent)

An autonomous AI agent that performs tasks under delegated authority. Distinguished from the OCSF agent object (which describes security sensors such as EDR and DLP tools) and from human principals. An AI agent has a stable logical identity across runs and a restart-sensitive instance identity. The agent owns its model; the ai_model attribute captures which model was backing the agent at the time of action.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `ai_model`

- **Type**: [`ai_model`](ai_model.md)
- **Requirement**: recommended

The AI model backing this agent at the time of the recorded event. An agent's model may change across instances or versions; this captures the model in use for the specific logged activity or delegation.

### `charter`

- **Type**: [`file`](file.md)
- **Requirement**: optional

A document that defines an AI agent's durable role, responsibilities, constraints, and operating boundaries. When available, populate `hashes` on the file for content integrity and `signatures` for provenance. Integrity of the event that reports this agent is provided separately by the `record_integrity` profile.

### `instance_uid`

- **Type**: `string_t`
- **Requirement**: recommended

Identifier for a specific running instance or session of the agent, distinct from the stable logical `uid`. An instance is a single materialization of the agent: a conversation, session, or run. It may persist across restarts (a session that is suspended and later resumed keeps the same `instance_uid`) and may span multiple cooperating runtime components, so several events can share one `instance_uid`. Enables attribution of actions to a particular instance of the agent rather than to the agent generally.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

Human-readable name for the agent. For example: `Q4 Analysis Agent` or `Model Tester Agent`.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The agent framework, normalized to the caption of the `type_id` value.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The agent framework is unknown.
- `1`: `Native` - A first-party or proprietary agent built without a third-party agent framework. For example, a custom orchestrator or an LLM provider's own agent SDK.
- `2`: `LangChain` - An agent built with the LangChain framework.
- `3`: `AutoGen` - An agent built with the AutoGen framework for multi-agent conversation and orchestration.
- `4`: `CrewAI` - An agent built with the CrewAI framework for role-based multi-agent collaboration.
- `99`: `Other` - The agent framework is not listed. Use the `type` attribute to describe it.

The normalized identifier for the agent framework. Different agent frameworks have different identity, tool-call, and delegation semantics, so recording the framework enables cross-framework normalization. Communication protocols (e.g., MCP, A2A) are a property of individual operations rather than the agent itself, and are surfaced on the relevant operation rather than here.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The stable logical identifier for the agent, assigned by the agent's authoritative source (e.g., its control plane, registry, or issuing identity provider). Persists across restarts and instances. Producers populate this from whatever identity they observe: for a runtime that owns the agent, this is its issued ID; for a gateway or proxy, it is typically derived from the agent's credential. Multiple producers logging the same agent should converge on the same `uid` when they share an authoritative source.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The version of the agent: the agent's own code or configuration revision (e.g., `1.4.2`), distinct from the version of the model backing it (carried on `ai_model.version`). Enables correlation of behavioral changes with charter or configuration revisions across agent versions.
