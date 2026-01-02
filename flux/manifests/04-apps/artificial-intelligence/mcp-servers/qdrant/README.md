# Qdrant MCP Server

MCP server for knowledge storage and semantic search via Qdrant vector database.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- **[mcp-server-qdrant](https://github.com/qdrant/mcp-server-qdrant)** - Official Qdrant MCP server
- **[Qdrant Documentation](https://qdrant.tech/documentation/)** - Vector database documentation

## Overview

Provides semantic memory and knowledge retrieval capabilities:

- Store information with automatic embedding generation
- Semantic search across stored knowledge
- Local embedding model (no external API calls)
- Persistent storage via Qdrant database

## Tools

| Tool           | Description                              |
| -------------- | ---------------------------------------- |
| `qdrant-store` | Store information with metadata          |
| `qdrant-find`  | Semantic search for relevant information |

## Configuration

### Environment Variables

| Variable             | Value                                         | Description              |
| -------------------- | --------------------------------------------- | ------------------------ |
| `QDRANT_URL`         | `http://qdrant.qdrant.svc.cluster.local:6333` | Qdrant service URL       |
| `COLLECTION_NAME`    | `knowledge`                                   | Default collection       |
| `EMBEDDING_PROVIDER` | `fastembed`                                   | Local embedding provider |
| `EMBEDDING_MODEL`    | `sentence-transformers/all-MiniLM-L6-v2`      | Embedding model          |

### 1Password Secrets

Uses same secret as Qdrant database (`vaults/Secrets/items/qdrant-secrets`):

| Field     | Description                       |
| --------- | --------------------------------- |
| `api-key` | API key for Qdrant authentication |

## Usage Examples

### Store Knowledge

```
Store this information: "Kubernetes uses etcd as its backing store for all cluster data"
```

### Query Knowledge

```
Find information about Kubernetes storage
```

## Troubleshooting

### Check Server Status

```bash
# MCPServer status
kubectl get mcpserver -n mcp-qdrant

# Pod logs
kubectl logs -n mcp-qdrant -l app.kubernetes.io/name=qdrant-mcp
```

### Test Connection to Qdrant

```bash
# From MCP server pod
kubectl exec -n mcp-qdrant -l app.kubernetes.io/name=qdrant-mcp -- \
  curl -s http://qdrant.qdrant.svc.cluster.local:6333/readyz
```
