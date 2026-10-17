# AI Operation (ai_operation)

AI-specific attributes for model operations, retrieval systems, and agent activities. e.g. model_name, total_token_counts etc.

## Applies to

- API Activity
- Datastore Activity
- Process Activity

## Attributes

### `ai_model`

- **Type**: [`ai_model`](../objects/ai_model.md)
- **Requirement**: recommended
- **Group**: context

The AI Model object describes the characteristics of an AI/ML model. Examples include language models like GPT-4, embedding models like text-embedding-ada-002, and computer vision models like CLIP.

### `message_context`

- **Type**: [`message_context`](../objects/message_context.md)
- **Requirement**: optional
- **Group**: context

Communication context for AI system interactions including protocols, roles, clients, and session information for MCP and other AI communication systems.
