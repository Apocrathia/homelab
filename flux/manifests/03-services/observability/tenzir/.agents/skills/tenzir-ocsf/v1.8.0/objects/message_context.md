# Message Context (message_context)

Communication context for AI system interactions including protocols, roles, clients, and session information for MCP and other AI communication systems.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `ai_role`

- **Type**: `string_t`
- **Requirement**: optional

The normalized caption of the `ai_role_id`.

### `ai_role_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `ai_role`

#### Enum values

- `0`: `Unknown` - Unknown role type.
- `1`: `User` - The human user initiating a request.
- `2`: `Assistant` - The AI model generating a response.
- `3`: `Tool` - A callable tool or API invoked by the assistant.
- `4`: `Agent` - A software agent that performs tasks with autonomy or delegated intent.
- `5`: `Orchestrator` - The component coordinating multiple agents or tools.
- `6`: `Retriever` - A component that retrieves information or context from a knowledge source (e.g., vector DB, search system, or API).
- `99`: `Other` - Other role type not covered above.

Specifies the functional role of the AI within the context of this message, such as retrieving information, assisting reasoning, executing a tool, or generating content.

### `application`

- **Type**: [`application`](application.md)
- **Requirement**: recommended

The initiating client application. In AI systems, this represents the client-side application or framework that initiates requests (e.g., LangChain application, web browser, mobile app, SDK implementation).

### `completion_tokens`

- **Type**: `integer_t`
- **Requirement**: optional

Number of tokens in the model's response/completion for this message.

### `name`

- **Type**: `string_t`

The name or identifier of the message context. In AI systems, this could be the conversation ID, session name, thread identifier, or interaction name (e.g., 'user-session-123', 'conversation-abc', 'chat-thread-456').

### `prompt_tokens`

- **Type**: `integer_t`
- **Requirement**: optional

Number of tokens in the input prompt for this message.

### `service`

- **Type**: [`service`](service.md)
- **Requirement**: recommended

The server or service handling the request. In AI systems, this represents the AI service, API endpoint, or agent that processes and responds to requests (e.g., OpenAI API service, Claude API service, internal AI model service).

### `total_tokens`

- **Type**: `integer_t`
- **Requirement**: optional

Total number of tokens used for this message (prompt + completion).

### `uid`

- **Type**: `string_t`

The unique identifier of the message context. This could be a session ID, conversation ID, or other unique identifier that allows correlation of messages within the same context.
