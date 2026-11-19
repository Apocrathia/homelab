# alert-agent-invoke source

Python source for the Grafana-alert webhook bridge. `server.py` receives
alert webhooks, builds a prompt from the alert template, and calls kagent
A2A as a background task. Deps: a2a-sdk, httpx, starlette, uvicorn.

> **Navigation**: [← Back to alert-agent-invoke README](../README.md)
