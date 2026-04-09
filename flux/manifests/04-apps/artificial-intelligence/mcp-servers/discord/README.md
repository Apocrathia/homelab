# Discord MCP (SaseQ)

Java/Spring MCP server using the Discord API (JDA). Deployed with ToolHive in `mcp-discord`.

homelab-agent references a subset of tools via `RemoteMCPServer` in the `kagent` namespace.

## Configuration

- **Token**: Synced from 1Password (`homelab-agent-secrets`, field `discord-token`) — same application as the Discord bridge bot.
- **Logging / filesystem**: The image ships `logging.file.name=./target/logs/...` and an empty `logging.pattern.console`, which breaks Logback. ToolHive uses a read-only root filesystem, so `SPRING_APPLICATION_JSON` points the log file at `/data/discord-mcp-server.log` on an `emptyDir`, and `/tmp` is a separate `emptyDir` for JVM scratch.
- **Guild**: Optional field `discord-guild-id` on the same 1Password item — exposed as `DISCORD_GUILD_ID` so guild-scoped tools do not require `guildId` on every call.

## Internal URL

`http://mcp-discord-mcp-proxy.mcp-discord.svc.cluster.local:8080/mcp`

## References

- [SaseQ/discord-mcp](https://github.com/SaseQ/discord-mcp)
