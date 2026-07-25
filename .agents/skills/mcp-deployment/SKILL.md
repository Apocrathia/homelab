---
name: mcp-deployment
description: Deploy MCP servers via kmcp (kagent MCPServer) and integrate with LiteLLM in the homelab. Covers MCPServer CRD, transport selection, secret mounts, and litellm.yml / RemoteMCPServer wiring. Use when adding MCP servers under flux/manifests/04-apps/artificial-intelligence/mcp-servers/ or wiring MCP into LiteLLM or kagent agents.
---

# MCP server deployment

Deploy in-cluster MCP servers with **kmcp** (`apiVersion: kagent.dev/v1alpha1`,
kind `MCPServer`) under `flux/manifests/04-apps/artificial-intelligence/mcp-servers/`,
then point LiteLLM and optional kagent `RemoteMCPServer`s at the CR-named Service.

# Input

- `[MCP_SERVER]` — short name (Service DNS uses this)
- `[NAMESPACE]` — `mcp-{server-name}` with label `mcp-server: "true"`
- `[TRANSPORT]` — `http` (native streamable-http) or `stdio` (agentgateway adapter)
- `[PORT]` — listen / Service port (lab convention: `8080`)

# Task

Author a kmcp `MCPServer`, wire parent kustomization + LiteLLM (and RemoteMCP
when an agent needs it), validate with `kustomize build`, probe `/mcp`.

# Restrictions

- Default: no commit/push (operator commits); ship only when authorized —
  [`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship).
- Never alter cluster without explicit permission.
- Present options and get approval before mutating Git or cluster.
- Prefer MCP tools over CLI when available.
- Prefer native `transportType: http` when the image speaks streamable-http;
  use `stdio` when the process is stdio-only or LiteLLM session handling needs
  the agentgateway adapter.
- No Gateway/HTTPRoute for MCP Services — clients are in-cluster only
  (LiteLLM / agents). Cilium CCNP `mcp-server-isolation` gates ingress.

# Research with DeepWiki

Before drafting, research the target MCP server repo and integration layers:

- **LiteLLM**: https://deepwiki.com/BerriAI/litellm
- **kagent / kmcp**: https://kagent.dev/docs/
- Target server: `https://deepwiki.com/{owner}/{repo}`

Confirm transport, port/path, env vars, and whether auth is env-based or
header-based (`extra_headers` / `RemoteMCPServer` `headersFrom`).

# Layout

```
flux/manifests/04-apps/artificial-intelligence/mcp-servers/{server-name}/
├── kustomization.yaml
├── namespace.yaml          # mcp-server: "true"
├── mcpserver.yaml         # kagent.dev/v1alpha1 MCPServer
├── secret.yaml            # OnePasswordItem when needed
└── README.md
```

Add `{server-name}/` to the parent `mcp-servers/kustomization.yaml`.

# Key patterns

## Native HTTP (`transportType: http`)

```yaml
apiVersion: kagent.dev/v1alpha1
kind: MCPServer
metadata:
  name: {server-name}
  namespace: mcp-{server-name}
  labels:
    app.kubernetes.io/name: {server-name}
    app.kubernetes.io/component: mcp-server
spec:
  transportType: http
  httpTransport:
    targetPort: 8080
    path: /mcp
  deployment:
    image: {image}:{tag}
    port: 8080
    env:
      MCP_PORT: "8080"
      # FASTMCP_PORT / MCP_TRANSPORT when the image expects them
    resources:
      limits:
        cpu: "200m"
        memory: "256Mi"
      requests:
        cpu: "100m"
        memory: "128Mi"
    podSecurityContext:
      seccompProfile:
        type: RuntimeDefault
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: [ALL]
```

## Stdio + agentgateway (`transportType: stdio`)

agentgateway replaces the image ENTRYPOINT and serves streamable HTTP `/mcp`
on `deployment.port`. Restate the process in `cmd`/`args`.

```yaml
spec:
  transportType: stdio
  stdioTransport: {}
  deployment:
    image: {image}:{tag}
    port: 8080
    cmd: node # or python / sh
    args: ["dist/cli.js"]
    env:
      EXAMPLE_URL: "http://…"
    # same securityContext / resources as above
```

### agentgateway gotchas

1. **Premature `$VAR` expansion** — do not `export FOO="$(cat secret)"` then
   use `$FOO` later in the same script; agentgateway expands `$FOO` first.
   Read secret files **inline** where used (`$(cat /var/run/secrets/mcp/…)`).
2. **Service-link env clash** — a Service named `foo` injects
   `FOO_PORT=tcp://…`. CR `env` does not win. `export FOO_PORT=<real>` inside
   the startup command if the app reads that name.
3. **Per-session respawn** — `cmd`/`args` run per MCP session while `/tmp`
   persists. Make clones/installs **idempotent** (or use a prebuilt image).
   Heavy per-session `pip install` will OOM.

## Secrets

kmcp `secretRefs` is envFrom-shaped and cannot rename hyphenated OnePassword
keys. Mount the Secret and export:

```yaml
deployment:
  volumes:
    - name: mcp-secrets
      secret:
        secretName: {server}-mcp-secrets
  volumeMounts:
    - name: mcp-secrets
      mountPath: /var/run/secrets/mcp
      readOnly: true
  cmd: /bin/sh
  args:
    - -c
    - |
      export TOKEN="$(cat /var/run/secrets/mcp/api-token)" &&
      exec {mcp-process}
```

Prefer client-supplied credentials (LiteLLM `static_headers` /
`extra_headers`, RemoteMCP `headersFrom`) over baking PATs into the pod when
the server supports header auth.

## Service DNS / clients

kmcp names the Service after the CR:

`http://{cr-name}.mcp-{name}.svc.cluster.local:8080/mcp`

LiteLLM (`litellm/litellm.yml`):

```yaml
mcp_servers:
  { alias }:
    url: "http://{cr-name}.mcp-{name}.svc.cluster.local:8080/mcp"
    transport: "http"
    auth_type: "none"
```

kagent agents: `RemoteMCPServer` with the same URL and
`protocol: STREAMABLE_HTTP`.

**Apply order:** kmcp CR Ready before flipping client URLs.

# Cilium

Keep `mcp-server: "true"` on the server NS and `mcp-client: "true"` on
callers (litellm, kagent, agent-\*). Do not add Gateway routes for MCP.

# Validation

1. `kustomize build` on the server dir and parent `mcp-servers/`
2. prettier / yamllint; Trivy on touched paths
3. Wait `mcpserver.kagent.dev/{cr}` Ready
4. Probe `/mcp` (initialize → tools/list; replay `mcp-session-id` for stdio)
5. Flip LiteLLM / RemoteMCP; re-probe via LiteLLM

# Troubleshooting

```bash
kubectl get mcpserver.kagent.dev -n mcp-{name}
kubectl logs -n mcp-{name} deploy/{name}
kubectl get svc -n mcp-{name}
```

| Symptom                         | Likely cause                         | Fix                                   |
| ------------------------------- | ------------------------------------ | ------------------------------------- |
| DeploymentFailed / selector     | CR name collides with old Deployment | Use a free CR name                    |
| Empty secrets / blank config    | agentgateway `$VAR` expand           | Inline `$(cat …)` reads               |
| App parse error on `*_PORT`     | Service-link env                     | `export NAME_PORT=…` in startup       |
| Clone/install fails 2nd session | Non-idempotent startup               | Guard clone; prefer baked image       |
| OOMKilled on tool call          | Per-session install                  | Prebuilt image or higher limit + bake |
| 401/403 on probe                | Header auth expected                 | Probe with caller headers             |

# Documentation

Per-server README: purpose, transport, endpoint FQDN, secrets, kubectl
targets (`deployment/{cr-name}`), link back to `mcp-servers/README.md`.
