# Qdrant Vector Database

High-performance vector database for AI knowledge storage and semantic search.

> **Navigation**: [← Back to AI README](../README.md)

## Documentation

- **[Qdrant Documentation](https://qdrant.tech/documentation/)** - Official documentation
- **[Qdrant Helm Chart](https://github.com/qdrant/qdrant-helm)** - Helm chart repository

## Overview

Qdrant provides the vector storage backend for the knowledge management system:

- Vector similarity search for semantic retrieval
- Persistent storage of embeddings and metadata
- API key authentication for secure access
- Prometheus metrics for monitoring

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Qdrant MCP Server │────▶│   Qdrant Database   │
│   (mcp-qdrant ns)   │     │   (qdrant ns)       │
└─────────────────────┘     └─────────────────────┘
         │
         │ MCP
         ▼
┌─────────────────────┐
│   LiteLLM / Agents  │
└─────────────────────┘
```

## Configuration

### 1Password Secrets

Create `qdrant-secrets` in 1Password (`vaults/Secrets/items/qdrant-secrets`):

| Field     | Description                       |
| --------- | --------------------------------- |
| `api-key` | API key for Qdrant authentication |

### Key Settings

- **Storage**: Longhorn persistent volume
- **Cluster Mode**: Disabled (single node deployment)

See `helmrelease.yaml` for complete configuration including resource limits.

## Access

- **Internal HTTP**: `http://qdrant.qdrant.svc.cluster.local:6333`
- **Internal gRPC**: `http://qdrant.qdrant.svc.cluster.local:6334`

No external access - accessed exclusively via MCP server.

## MCP Integration

The Qdrant MCP server (`mcp-qdrant` namespace) provides:

- **`qdrant-store`**: Store information with embeddings
- **`qdrant-find`**: Semantic search for relevant information

Default collection: `knowledge`

Embedding model: `sentence-transformers/all-MiniLM-L6-v2` (local, via FastEmbed)

## Troubleshooting

### Check Database Status

```bash
# Pod status
kubectl get pods -n qdrant

# Logs
kubectl logs -n qdrant deployment/qdrant

# Service health
kubectl exec -n qdrant deployment/qdrant -- \
  curl -s http://localhost:6333/readyz
```

### Check MCP Server

```bash
# MCP server status
kubectl get mcpserver -n mcp-qdrant

# MCP server logs
kubectl logs -n mcp-qdrant -l app.kubernetes.io/name=qdrant-mcp
```

### Verify Collections

```bash
# List collections (replace API_KEY)
kubectl exec -n qdrant deployment/qdrant -- \
  curl -s -H "api-key: $API_KEY" \
  http://localhost:6333/collections
```
