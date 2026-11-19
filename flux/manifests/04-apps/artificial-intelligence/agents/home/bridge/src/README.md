# home-agent-bridge source

Python source for the Home Assistant webhook bridge. `main.py` is a thin
HTTP server that accepts a JSON prompt from Home Assistant's `rest_command`
and forwards it to the home-agent via the kagent A2A endpoint, fire-and-forget.

> **Navigation**: [← Back to home-agent-bridge README](../README.md)
