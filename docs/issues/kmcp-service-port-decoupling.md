---
title: "kmcp: allow the generated Service port to differ from the container port"
kind: feature
status: open
severity: low
source: human
found_at: 2026-07-25
found_by: ian
area: agents
slice: hitl
---

# kmcp: allow the generated Service port to differ from the container port

Upstream enhancement request for `kagent-dev/kmcp`, staged locally for
refinement before filing. Not a homelab bug — the workaround (a companion
Service) exists; this is about kmcp exposing the knob natively.

## Problem / desired state

The kmcp controller creates and reconciles the `Service` for every
`MCPServer`, and hard-couples the Service port to the container port. There is
no CRD field to set the Service port independently, so every MCP endpoint is
reachable only on `spec.deployment.port` (in this lab, `8080`). Consumers that
expect HTTP services on `80` cannot get it from the kmcp-managed Service, and
manual edits to that Service are reverted by the controller.

Desired: a way to express a Kubernetes Service port that differs from the
container/`targetPort`, e.g. Service `port: 80` → `targetPort: 8080`. This is
standard `ServicePort` behavior; kmcp just does not surface it.

For `transportType: http` this maps cleanly to
`HTTPTransport` (which already has `targetPort` for the container side but no
Service-side port). For `stdio`, agentgateway is the listener, so the same
Service-port override should apply to the port the Service advertises.

## Repro

1. Apply an `MCPServer` (`kagent.dev/v1alpha1`) with
   `spec.deployment.port: 8080`.
2. Inspect the generated Service:

   ```bash
   kubectl get svc <name> -n <ns> -o jsonpath='{.spec.ports[0]}'
   # {"port":8080,"targetPort":8080,...} — both pinned to deployment.port
   ```

3. There is no CRD field to make `port: 80`; editing the Service by hand is
   reconciled back to `8080`.

## Acceptance

- The `MCPServer` CRD exposes a documented field to set the Service port
  independently of the container port (name TBD upstream, e.g.
  `httpTransport.servicePort` or a `deployment.service.port`).
- With that field set, the generated Service shows
  `port: <chosen>` / `targetPort: <deployment.port>`, and the controller does
  not revert it.
- Behavior is defined for both `http` and `stdio` transport types.
- Default is unchanged (Service port == container port) when the field is unset
  — no breaking change for existing CRs.

## Feedback loop

- `kubectl get svc <name> -n <ns> -o yaml` — confirm `port` vs `targetPort`
  after applying the new field (read-only).
- Upstream: unit test in `translateTransportAdapterService` asserting the split
  when the field is set and equality when it is unset.

## Implementation hint

Current behavior in
`pkg/controller/transportadapter/transportadapter_translator.go`
(`translateTransportAdapterService`): it reads `server.Spec.Deployment.Port`
and sets both `ServicePort.Port` and `ServicePort.TargetPort` to that value.
The enhancement is to source `Port` from a new optional field and keep
`TargetPort` on `deployment.port`. The CRD lacks any Service-port field today
(`HTTPTransport` has `targetPort`/`path`/`tls`; `StdioTransport` is empty;
`MCPServerDeployment.Port` defaults to `3000`).

## Notes

- Homelab workaround (no upstream dependency): add a second, repo-owned Service
  in the same namespace using the kmcp pod selector
  (`app.kubernetes.io/{instance,name}: <cr-name>`) with `port: 80`,
  `targetPort: 8080`, and point clients at it. kmcp ignores non-owned Services.
  Not adopted yet — kept on `8080` pending this upstream knob.
- Separate, related kmcp gap observed during the ToolHive→kmcp migration (file
  distinctly if pursued): HTTP-transport images get no auto `PORT`/`MCP_PORT`
  env injection and no declared `containerPort`, so port wiring is manual.
- `spec.deployment.port` itself is configurable (upstream default `3000`); the
  lab pins `8080` as a cutover convention. This issue is strictly
  about the Service-vs-container port split, not "stuck on 8080."
  Context: closed issue `docs/issues/migrate-toolhive-to-kmcp.md`.
