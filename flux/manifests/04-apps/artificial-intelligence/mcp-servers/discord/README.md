# Discord MCP (SaseQ)

Java/Spring MCP server using the Discord API (JDA). Deployed as kmcp MCPServer `discord` in `mcp-discord`.

homelab-agent references a subset of tools via `RemoteMCPServer` in the `kagent` namespace.

## Configuration

- **Transport**: `transportType: http` — native streamable HTTP on port 8080
- **Token**: Synced from 1Password (`homelab-agent-secrets`, field `discord-token`) — same application as the Discord bridge bot.
- **Logging / filesystem**: The image ships `logging.file.name=./target/logs/...` and an empty `logging.pattern.console`, which breaks Logback. The pod uses a read-only root filesystem, so `SPRING_APPLICATION_JSON` points the log file at `/data/discord-mcp-server.log` on an `emptyDir`, and `/tmp` is a separate `emptyDir` for JVM scratch.
- **Guild**: Optional field `discord-guild-id` on the same 1Password item — exposed as `DISCORD_GUILD_ID` so guild-scoped tools do not require `guildId` on every call.
- **Secrets**: The `homelab-agent-secrets` Secret is mounted read-only; the startup command maps `discord-token` and `discord-guild-id` to `DISCORD_TOKEN` and `DISCORD_GUILD_ID`.

Coordinate any Discord A2A bridge work with [the upstream A2A issue](../../../../../../../docs/issues/discord-integration-upstream-a2a.md).

## Internal URL

`http://discord.mcp-discord.svc.cluster.local:8080/mcp`

## References

- [SaseQ/discord-mcp](https://github.com/SaseQ/discord-mcp)
