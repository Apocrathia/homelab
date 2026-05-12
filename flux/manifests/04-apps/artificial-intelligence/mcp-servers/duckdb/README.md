# DuckDB MCP Server

The [`mcp-server-motherduck`](https://github.com/motherduckdb/mcp-server-motherduck) MCP server pointed at a local DuckDB file on a Longhorn volume. Gives agents the ability to query, transform, and persist data via SQL without touching the human-facing UI.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

This deployment includes:

- `mcp-server-motherduck` installed from PyPI at pod startup
- Backing DuckDB file at `/data/duckdb.db` on a 10Gi Longhorn RWO volume
- Shared SMB mount at `/shared` (`//storage.services.apocrathia.com/Library/Databases/DuckDB`) for cross-process Parquet/CSV/JSON exchange with the UI deployment
- ToolHive proxy exposing the stdio MCP server as streamable-http on port 8080
- Read-write enabled — the MCP process is the sole writer of its `.duckdb` file (single-writer constraint satisfied trivially)

## Configuration

### Transport

`transport: stdio` with `proxyMode: streamable-http`. ToolHive handles HTTP/session management; the MCP server runs in stdio mode internally.

### Persistence

`/data` is a Longhorn RWO PVC owned exclusively by this MCP process. `/shared` is an SMB RWX mount of the same path mounted by the [`duckdb` UI deployment](../../duckdb/) — agents can `read_parquet('/shared/...')` files the UI exported, and write Parquet back for the UI to consume. The two pods cannot share the `.duckdb` file directly (DuckDB single-process lock); they exchange data via files on the SMB mount instead.

### Security

- **Permission Profile**: `network` (needed for DuckDB extension downloads and any S3/HTTP attached sources)
- **Authentication**: None — restricted to the AI namespaces by the `mcp-server-isolation` CiliumClusterwideNetworkPolicy

## Available MCP Tools

Per `mcp-server-motherduck`, agents get tools for executing arbitrary SQL queries against the attached database, browsing schemas and tables, and managing data shares. The full surface is documented upstream.

## Notes

The first pod start downloads `mcp-server-motherduck` from PyPI; subsequent restarts reuse the wheel cache only if `/tmp` survives, which it does not (emptyDir). Pod startup will be slower than a baked image. If startup time becomes painful, switch to a wrapper image with the package pre-installed.

## References

- [mcp-server-motherduck](https://github.com/motherduckdb/mcp-server-motherduck) - MCP server repository
- [MotherDuck MCP Docs](https://motherduck.com/docs/sql-reference/mcp/) - Configuration reference
- [DuckDB Documentation](https://duckdb.org/docs/) - SQL reference
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol
