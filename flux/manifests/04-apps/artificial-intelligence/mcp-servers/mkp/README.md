# MKP Kubernetes MCP Server

The MKP MCP server provides direct Kubernetes cluster access through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [MKP Source Repository](https://github.com/StacklokLabs/mkp)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

## Overview

This deployment includes:

- MKP MCP server for Kubernetes cluster interaction
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy
- Network permission profile for cluster access
- In-cluster Kubernetes authentication

## Configuration

### Security

- **Permission Profile**: Network access for cluster operations
- **Cluster Access**: Uses in-cluster service account for authentication
- **Read-Only Mode**: Default operation (write operations disabled)
- **Security Note**: This is an unauthenticated endpoint with minimal read-only access to non-sensitive resources only

## Access

This server is accessible only through the LiteLLM proxy. See the [main README](../README.md) for details.

### Available MCP Tools

The MKP server provides these Kubernetes tools:

1. **get_resource**

   - Get Kubernetes resources and subresources
   - **Input**: `{"resource_type": "namespaced", "group": "apps", "version": "v1", "resource": "deployments", "namespace": "default", "name": "nginx-deployment"}`

2. **list_resources**

   - List Kubernetes resources of a specific type
   - **Input**: `{"resource_type": "namespaced", "group": "apps", "version": "v1", "resource": "deployments", "namespace": "default"}`

3. **apply_resource**

   - Create or update Kubernetes resources
   - **Input**: `{"resource_type": "namespaced", "group": "apps", "version": "v1", "resource": "deployments", "namespace": "default", "manifest": {...}}`

4. **post_resource**
   - Execute commands in pods or interact with subresources
   - **Input**: `{"resource_type": "namespaced", "group": "", "version": "v1", "resource": "pods", "namespace": "default", "name": "my-pod", "subresource": "exec", "body": {"command": ["ls", "-la"]}}`
