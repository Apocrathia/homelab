# Discord MCP (SaseQ)

Java/Spring MCP server using the Discord API (JDA). Deployed with ToolHive in `mcp-discord`.

homelab-agent references a subset of tools via `RemoteMCPServer` in the `kagent` namespace.

## Configuration

- **Token**: Synced from 1Password (`homelab-agent-secrets`, field `discord-token`) — same application as the Discord bridge bot.
- **Optional**: Set `DISCORD_GUILD_ID` on the MCPServer pod if you want guild-scoped tools to omit `guildId` (patch the `MCPServer` CR `podTemplateSpec`).

## Internal URL

`http://mcp-discord-mcp-proxy.mcp-discord.svc.cluster.local:8080/mcp`

Registered in LiteLLM (`litellm.yml` under `mcp_servers.discord`) for clients that use the proxy.

## References

- [SaseQ/discord-mcp](https://github.com/SaseQ/discord-mcp)
