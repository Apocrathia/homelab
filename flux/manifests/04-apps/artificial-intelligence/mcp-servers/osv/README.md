# OSV Vulnerability Scanner MCP Server

The OSV MCP server provides vulnerability scanning capabilities through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [OSV Database](https://osv.dev/) - Open Source Vulnerability database
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- OSV MCP server for vulnerability database queries
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy
- Network permission profile for database access

## Configuration

### Security

- **Permission Profile**: Network access for database queries
- **Authentication**: Currently open for ease of use

## Access

This server is accessible only through the LiteLLM proxy. See the [main README](../README.md) for details.

### Available MCP Tools

The OSV MCP server provides these tools:

1. **query_vulnerability**

   - Query for vulnerabilities affecting a specific package version or commit
   - **Input**: `{"package_name": "lodash", "ecosystem": "npm", "version": "4.17.15"}`
   - **Alternative**: `{"commit": "abc123..."}` or `{"purl": "pkg:npm/lodash@4.17.15"}`

2. **query_vulnerabilities_batch**

   - Query for vulnerabilities affecting multiple packages or commits at once
   - **Input**: `{"queries": [{"package_name": "lodash", "ecosystem": "npm", "version": "4.17.15"}]}`

3. **get_vulnerability**
   - Get detailed information about a specific vulnerability by OSV ID
   - **Input**: `{"id": "GHSA-vqj2-4v8m-8vrq"}`
