# Knowledge Agent

> **Navigation**: [← Back to Agents README](../README.md)

## Overview

The knowledge agent stores, retrieves, and synthesizes information across sources:

- Qdrant vector store for semantic storage and retrieval
- Offline encyclopedic content through OpenZIM
- Web search delegation for current information
- Called by other agents for knowledge queries

## Tools

| Tool           | Source           | Purpose                                           |
| -------------- | ---------------- | ------------------------------------------------- |
| `qdrant-store` | Qdrant MCP       | Store memories/knowledge with semantic embeddings |
| `qdrant-find`  | Qdrant MCP       | Semantic search across stored knowledge           |
| OpenZIM tools  | OpenZIM MCP      | Query offline encyclopedic content                |
| search-agent   | Agent delegation | Web search for current information                |

## Usage

Other agents (like homelab-agent) call it to store and recall knowledge, look up encyclopedic facts, and run web searches.

## Configuration

- **Model**: via LiteLLM (pinned in `modelconfig.yaml`)
- **Namespace**: `agent-knowledge`

## Troubleshooting

```bash
# Check agent status
kubectl get agents knowledge-agent --namespace agent-knowledge

# View agent logs
kubectl logs --namespace agent-knowledge -l app.kubernetes.io/name=knowledge-agent -f
```

## References

- **[Qdrant MCP Server](../../mcp-servers/qdrant/README.md)** - Vector database integration
- **[OpenZIM MCP Server](../../mcp-servers/openzim/README.md)** - Encyclopedic content
