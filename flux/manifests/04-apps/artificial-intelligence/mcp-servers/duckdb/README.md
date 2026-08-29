# DuckDB MCP Server

The [`mcp-server-motherduck`](https://github.com/motherduckdb/mcp-server-motherduck) MCP server pointed at a local DuckDB file on a Longhorn volume. Gives agents the ability to query, transform, and persist data via SQL without touching the human-facing UI.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

This deployment includes:

- `mcp-server-motherduck` installed from PyPI at pod startup
- Backing DuckDB file at `/data/duckdb.db` on a 10Gi Longhorn RWO volume
- Shared SMB mount at `/shared` (`//storage.services.apocrathia.com/Library/Databases/DuckDB`) for cross-process Parquet/CSV/JSON exchange with the UI deployment
- kmcp (`kagent.dev/v1alpha1` MCPServer) with `transportType: stdio` — the agentgateway adapter exposes the stdio process as streamable-http on port 8080
- Read-write enabled — the MCP process is the sole writer of its `.duckdb` file (see _Concurrency_ below)

## Configuration

### Transport

`transportType: stdio` with `stdioTransport: {}`. kmcp's agentgateway adapter replaces the image entrypoint, runs `cmd`/`args` per MCP session, and serves streamable-http `/mcp` on port 8080.

### Endpoint

- **Service**: `http://duckdb.mcp-duckdb.svc.cluster.local:8080/mcp` (in-cluster only — no Gateway route; the `mcp-server-isolation` CiliumClusterwideNetworkPolicy gates ingress)
- **LiteLLM**: `mcp_servers.duckdb` (alias `duckdb`)
- **kubectl**: `kubectl get mcpserver.kagent.dev -n mcp-duckdb`, `kubectl logs -n mcp-duckdb deploy/duckdb`

### Concurrency

agentgateway respawns the stdio process **per MCP session**, and `/data/duckdb.db` is read-write — DuckDB's single-writer file lock means two concurrent sessions will contend, and the second process fails to open the database. Treat this server as one-session-at-a-time; agents that hit a lock error should retry.

### Persistence

`/data` is a Longhorn RWO PVC owned exclusively by this MCP process. `/shared` is an SMB RWX mount of the same path mounted by the [`duckdb` UI deployment](../../duckdb/) — agents can `read_parquet('/shared/...')` files the UI exported, and write Parquet back for the UI to consume. The two pods cannot share the `.duckdb` file directly (DuckDB single-process lock); they exchange data via files on the SMB mount instead.

### Security

- **Container**: `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`, `seccompProfile: RuntimeDefault`; root filesystem stays writable for the PyPI install at startup
- **Egress**: unrestricted (needed for DuckDB extension downloads and any S3/HTTP attached sources)
- **Authentication**: None — restricted to the AI namespaces by the `mcp-server-isolation` CiliumClusterwideNetworkPolicy

## Available MCP Tools

Per `mcp-server-motherduck`, agents get tools for executing arbitrary SQL queries against the attached database, browsing schemas and tables, and managing data shares. The full surface is documented upstream.

## Notes

The first session after a pod start downloads `mcp-server-motherduck` from PyPI; later sessions reuse the wheel cache in `/tmp` (emptyDir — survives per-session respawns, not pod restarts). First session per pod is slower than a baked image. If startup time becomes painful, switch to a wrapper image with the package pre-installed.

## References

- [mcp-server-motherduck](https://github.com/motherduckdb/mcp-server-motherduck) - MCP server repository
- [MotherDuck MCP Docs](https://motherduck.com/docs/sql-reference/mcp/) - Configuration reference
- [DuckDB Documentation](https://duckdb.org/docs/) - SQL reference
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol
