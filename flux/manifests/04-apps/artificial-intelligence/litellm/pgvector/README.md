# PGVector Vector Store

OpenAI-compatible vector store service using PostgreSQL with the pgvector extension for LiteLLM RAG capabilities.

> **Navigation**: [← Back to LiteLLM README](../README.md)

## Documentation

- **[litellm-pgvector GitHub Repository](https://github.com/BerriAI/litellm-pgvector)** - Source code and API reference
- **[LiteLLM Vector Store Documentation](https://docs.litellm.ai/docs/providers/vector_store)** - Vector store integration guide

## Overview

This deployment provides:

- FastAPI service exposing OpenAI-compatible vector store endpoints
- Dedicated PostgreSQL cluster with pgvector extension
- Integration with LiteLLM for embedding generation
- Persistent storage for vector embeddings and metadata

## Components

- **Vector Store Service**: FastAPI application running `litellm-pgvector`
- **PostgreSQL Cluster**: Dedicated database (`vector-store-postgres`) for vector storage
- **Init Containers**: Enable pgvector extension and clone repository at runtime

## Configuration

### 1Password Secrets

The following fields are required in `litellm-secrets` (`vaults/Secrets/items/litellm-secrets`):

- `vector-store-api-key`: API key for vector store authentication (random alphanumeric string)
- `username`: Database username (shared with main LiteLLM database)
- `password`: Database password (shared with main LiteLLM database)
- `master-key`: LiteLLM master key for embedding generation

### Vector Store ID

The `vector_store_id` in `litellm.yml` must reference an existing vector store created via the API. Unlike other providers (OpenAI, Bedrock), `pg_vector` does not support automatic vector store creation.

**Current Vector Store ID**: `09beee6f-ed62-47c6-a161-dea9018a5a40`

## Initial Setup

### Creating a Vector Store

After the vector store service is deployed and ready, create a vector store via the API:

```bash
# Get the API key
API_KEY=$(kubectl get secret -n litellm litellm-secrets -o jsonpath='{.data.vector-store-api-key}' | base64 -d)

# Create vector store
kubectl exec -n litellm deployment/vector-store -- curl -s -X POST \
  http://localhost:8000/v1/vector_stores \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "litellm-vector-store"}'
```

The response will include the `id` field. Add this ID to `litellm.yml`:

```yaml
vector_store_registry:
  - vector_store_name: "pgvector-litellm"
    litellm_params:
      vector_store_id: "<id-from-response>"
      custom_llm_provider: "pg_vector"
      ...
```

### Vector Store Persistence

The vector store ID persists as long as the PostgreSQL database persists. The database uses Longhorn persistent storage, so:

- **Pod restarts**: Vector store and ID remain unchanged
- **Database deletion**: Vector store is lost; new ID required after recreation

## Storage

- **Database Storage**: CloudNativePG PostgreSQL cluster with Longhorn storage (size configured in `helmrelease.yaml`)
- **Application Source**: Longhorn volume for repository and dependencies (size configured in `helmrelease.yaml`)

## Access

- **Internal Service**: `http://vector-store.litellm.svc.cluster.local:8000`
- **Health Endpoint**: `http://vector-store.litellm.svc.cluster.local:8000/health`

## Troubleshooting

### Vector Store Not Found (404)

If LiteLLM returns 404 errors when accessing the vector store:

1. Verify the vector store exists:

   ```bash
   API_KEY=$(kubectl get secret -n litellm litellm-secrets -o jsonpath='{.data.vector-store-api-key}' | base64 -d)
   kubectl exec -n litellm deployment/vector-store -- curl -s \
     http://localhost:8000/v1/vector_stores \
     -H "Authorization: Bearer ${API_KEY}"
   ```

2. Ensure the `vector_store_id` in `litellm.yml` matches an existing vector store ID

3. Check service connectivity:
   ```bash
   kubectl exec -n litellm deployment/litellm -- curl -s \
     http://vector-store.litellm.svc.cluster.local:8000/health
   ```

### Database Connection Issues

```bash
# Check PostgreSQL cluster status
kubectl -n litellm get cluster vector-store-postgres

# Verify pgvector extension
kubectl -n litellm exec -it vector-store-postgres-1 -- \
  psql -U litellm -d vectorstore -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### Application Startup Issues

```bash
# Check vector store pod logs
kubectl -n litellm logs -l app.kubernetes.io/name=vector-store

# Verify init containers completed
kubectl -n litellm describe pod -l app.kubernetes.io/name=vector-store
```

### Health Checks

```bash
# Overall status
kubectl -n litellm get pods,svc -l app.kubernetes.io/name=vector-store

# PostgreSQL cluster status
kubectl -n litellm get cluster vector-store-postgres -o wide

# Service health
kubectl exec -n litellm deployment/vector-store -- curl -s \
  http://localhost:8000/health
```
