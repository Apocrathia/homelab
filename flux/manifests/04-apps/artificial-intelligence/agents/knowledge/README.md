# Knowledge Agent

Knowledge management agent for the homelab AI stack.

> **Navigation**: [← Back to Agents README](../README.md)

## Purpose

Stores, retrieves, and synthesizes information across multiple knowledge sources:

- **Qdrant**: Vector knowledge base for semantic storage/retrieval
- **OpenZIM**: Offline encyclopedic content (Wikipedia, etc.)
- **Search Agent**: Delegation for web searches when needed

## Tools

| Tool           | Source           | Purpose                                           |
| -------------- | ---------------- | ------------------------------------------------- |
| `qdrant-store` | Qdrant MCP       | Store memories/knowledge with semantic embeddings |
| `qdrant-find`  | Qdrant MCP       | Semantic search across stored knowledge           |
| OpenZIM tools  | OpenZIM MCP      | Query offline encyclopedic content                |
| search-agent   | Agent delegation | Web search for current information                |

## Usage

The knowledge agent is designed to be called by other agents (like homelab-agent) when they need to:

- Store information for later retrieval
- Recall previously stored information
- Look up factual/encyclopedic information
- Search across multiple knowledge sources

## Configuration

- **Model**: qwen3 (via LiteLLM)
- **Namespace**: kagent
