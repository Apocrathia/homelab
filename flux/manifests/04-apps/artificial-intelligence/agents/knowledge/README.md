# Knowledge Agent

> **Navigation**: [← Back to Agents README](../README.md)

## Overview

The knowledge agent stores, retrieves, and synthesizes information across sources:

- Qdrant vector store for semantic storage and retrieval
- Offline encyclopedic content through OpenZIM
- Web search delegation for current information
- Called by other agents for knowledge queries

## Tools

| Tool           | Source       | Purpose                                           |
| -------------- | ------------ | ------------------------------------------------- |
| `qdrant-store` | Qdrant MCP   | Store memories/knowledge with semantic embeddings |
| `qdrant-find`  | Qdrant MCP   | Semantic search across stored knowledge           |
| OpenZIM tools  | OpenZIM MCP  | Query offline encyclopedic content                |
| DeepWiki tools | DeepWiki MCP | GitHub repository documentation and Q&A           |

## Usage

Other agents (like homelab-agent) call it to store and recall knowledge, look up encyclopedic facts, and run web searches.

## Configuration

- **Model**: via LiteLLM (pinned in `modelconfig.yaml`)
- **Namespace**: `kagent` (the consolidated agent fleet): behavior in
  `agenttemplate.yaml`, thin `Agent` wrapper in `agent.yaml`. homelab-agent
  binds this agent as a same-namespace subAgent tool. The 0.10.x
  `search-agent` subAgent is not carried over: kagent 1.0.1 forbids subAgent
  tools on templates shared with other agents (homelab-agent binds
  `search-agent` directly).

## Troubleshooting

```bash
# Check agent status
kubectl get agents knowledge-agent --namespace kagent

# Controller logs (substrate agents run on the shared worker pool)
kubectl logs --namespace kagent deployment/kagent-controller -f
```

## References

- **[Qdrant MCP Server](../../mcp-servers/qdrant/README.md)** - Vector database integration
- **[OpenZIM MCP Server](../../mcp-servers/openzim/README.md)** - Encyclopedic content
