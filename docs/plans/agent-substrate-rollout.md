---
title: "Roll out Agent Substrate for kagent"
status: active
found_at: 2026-07-24
updated_at: 2026-07-24
related_issue: docs/issues/agent-substrate-real-environments.md
area: agents
---

# Roll out Agent Substrate for kagent

## Goal

Give kagent agents real execution environments (durable gVisor sandbox actors,
golden snapshots, WorkerPool lifecycle) instead of chatbot inference plus remote
MCP. Stand up Agent Substrate in-cluster, enable kagent's substrate integration,
and prove it with two smoke agents: one declarative `SandboxAgent` and one
long-lived `AgentHarness` over ACP. Phased, HITL, GitOps-only — each phase ends
by refining this plan.

## Scope

**In scope:**

- Agent Substrate install via GitOps: `substrate-crds` + `substrate` HelmReleases
  (`oci://ghcr.io/kagent-dev/substrate/helm/*`, pinned) into namespace
  `ate-system`.
- kagent HelmRelease value additions: `controller.substrate.*` +
  `substrateWorkerPool.*` (`flux/manifests/04-apps/artificial-intelligence/kagent/helmrelease.yaml`).
- Net-new declarative `hello-substrate` **Go** `SandboxAgent`.
- Net-new disposable `AgentHarness` (a second OpenClaw instance) purely to prove
  the ACP path.
- Docs: operator/agent note on substrate vs plain Declarative pods.
- Renovate annotations for the new pinned charts + ateom image.

**Out of scope:**

- Migrating the existing generic-app Hermes / OpenClaw off generic-app — their
  native dashboard/TUI is load-bearing; they stay put. The harness smoke is a
  **separate** instance.
- Converting any of the 7 existing Declarative kagent agents onto substrate.
- Python ADK on substrate (unsupported today — Go runtime only).
- Cluster mutation without operator ask; agent never commits.
- Enabling kagent's **bundled** substrate subchart (`substrate.enabled` stays
  `false`) — we install substrate as a sibling app, not via the kagent chart.

## Decisions

- Next lap — **plan-first (Heavy tier)** — greenfield two-chart install + kagent
  value changes + heavy data plane; ordering and capacity matter. Reversible:
  plan is a doc.
- Substrate version — **pin v0.0.6** (`substrate-crds` + `substrate`) — kagent
  **0.9.12** chart declares dependency on Substrate **0.0.6**; walkthrough's
  "0.9.7+" / AgentHarness "0.9.9+" floors are met. Options considered: v0.0.6
  (chosen; chart-locked) vs floating latest (rejected — repo pins). Reversible:
  uninstall the two HelmReleases.
- Install namespace — **`ate-system`** — upstream default; substrate control +
  data plane co-locate there. Hard-ish to reverse (namespace rename = reinstall),
  so lock it now. **Must** carry PSA privileged labels (see Phase 0).
- kagent integration — **HelmRelease values** (confirmed present on 0.9.12):
  `controller.substrate.enabled=true`,
  `ateApiEndpoint=dns:///api.ate-system.svc:443`, `ateApiInsecure=true`,
  `ateApiTokenFile=/var/run/secrets/tokens/ate-api/token`,
  `ateApiTokenAudience=api.ate-system.svc`,
  `substrateWorkerPool.create=true`, `name=kagent-default`, `replicas=2`,
  `ateomImage=ghcr.io/kagent-dev/substrate/ateom-gvisor:v0.0.6`.
  Leave chart `substrate.enabled=false` (sibling install). Reversible: revert
  values.
- WorkerPool size — **`kagent-default` replicas=2** hosted in **`ate-system`**
  (not chart-created in `kagent`). Reason: ateom pods need privileged + hostPath;
  `kagent` stays PSA baseline. kagent values:
  `substrateWorkerPool.create=false`,
  `controller.substrate.defaultWorkerPool.{namespace=ate-system,name=kagent-default}`.
  Reversible: delete the CR / set create back + privilege kagent ns.

- Declarative smoke — **net-new `hello-substrate` Go `SandboxAgent` in the
  `kagent` namespace** (Helm `default-model-config` already lives there;
  upstream walkthrough shape). Manifests can live under `kagent/` or a thin
  `agents/hello-substrate/` dir that targets ns `kagent` — do not touch the
  seven existing agent dirs. Options: kagent-ns smoke (chosen) vs new
  `agent-hello-substrate` ns + own ModelConfig (more ceremony for a disposable
  proof).
- Model wiring — **`default-model-config`** (Helm-managed in `kagent`, LiteLLM
  `qwen3.6-prime` via `kagent-secrets`). Confirmed live Accepted. No new secret.
- Harness smoke — **separate disposable OpenClaw instance over ACP**.
- Auth/secrets — **JWT via projected SA tokens** for ate API; chart generates
  TLS + session-signing Secrets. **No** 1Password Item for substrate auth.
  **RustFS** chart default is inline `rustfsadmin/rustfsadmin` — treat as Phase 1
  security decision (1Password vs accept for smoke / external S3 later).
- PSA — **`ate-system` privileged labels** (cilium/longhorn/trivy pattern). No
  Kyverno exception needed (no deny policies for privileged/hostPath).
- gVisor — **in-pod `runsc`** (no RuntimeClass, no Talos gVisor extension).
  `atelet` is privileged + hostPath + hostPort 9090. Any required `talos/`
  change = STOP + escalate.

## Phase 0 findings (2026-07-24)

| Check                                  | Verdict                   | Notes                                                                                                                                                           |
| -------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version pairing 0.0.6 ↔ kagent 0.9.12 | **GO**                    | 0.9.12 Chart.yaml depends on Substrate 0.0.6; value keys present                                                                                                |
| CRDs pre-existing                      | **GO (expected gap)**     | `SandboxAgent`/`AgentHarness` already from kagent-crds (`kagent.dev/v1alpha2`). `WorkerPool`/`ActorTemplate` absent until `substrate-crds` (`ate.dev/v1alpha1`) |
| Capacity                               | **GO** (light CAUTION)    | ~52 cores / ~167 Gi free actual; talos-01..03 CPU _requests_ 77–79%; chart sets no requests — prefer talos-04 when adding requests                              |
| gVisor / Talos                         | **CAUTION**               | No RuntimeClass needed; privileged atelet + hostPath unproven on Talos until smoke. `user.max_user_namespaces` already set in talos config                      |
| PSA / Kyverno                          | **CAUTION → mitigated**   | Kyverno will not deny; PSA baseline will — label `ate-system` privileged                                                                                        |
| Auth                                   | **GO**                    | SA JWT defaults; no operator auth secret. Chart-generated TLS/session secrets OK                                                                                |
| RustFS creds                           | **open**                  | Inline defaults unsuitable for hardened deploy — decide before/with Phase 1                                                                                     |
| ModelConfig name                       | **GO (original plan OK)** | Helm `default-model-config` exists in `kagent` (LiteLLM); use it for smoke                                                                                      |
| Install path                           | **confirmed**             | Mirror kagent OCI two-chart pattern under `artificial-intelligence/substrate/`; OCI `HelmRepository` in bootstrap (protected)                                   |

OCI pins (Phase 1):

- `oci://ghcr.io/kagent-dev/substrate/helm/substrate-crds:0.0.6`
- `oci://ghcr.io/kagent-dev/substrate/helm/substrate:0.0.6`
- Worker image: `ghcr.io/kagent-dev/substrate/ateom-gvisor:v0.0.6`

Steady-state footprint (defaults): valkey×6 (1Gi each) + rustfs (1Gi) +
ate-api-server / ate-controller / atenet DNS+router + atelet DaemonSet (×nodes)

- WorkerPool pods + 2 init Jobs.

## Steps

### Phase 0 — Foundations / compat check (before any apply)

- [x] Confirm substrate **v0.0.6** chart values + CRDs are compatible with kagent
      **0.9.12** — **GO**; 0.9.12 depends on 0.0.6; `controller.substrate.*` +
      `substrateWorkerPool.*` present.
- [x] CRD inventory — no `ate.dev` / WorkerPool yet; SandboxAgent/AgentHarness
      already from kagent-crds (`kagent.dev/v1alpha2`). substrate-crds add
      `WorkerPool` + `ActorTemplate` (`ate.dev/v1alpha1`).
- [x] Capacity check — actual headroom sufficient; note request-packing CAUTION
      on talos-01..03.
- [x] gVisor — in-pod runsc, no RuntimeClass / no Talos extension planned;
      privileged atelet + hostPath gated by PSA labels + real-node smoke.
- [x] Auth defaults — SA JWT; no extra 1Password for ate API. RustFS inline
      creds still open.
- [x] **Refine this plan** (this revision).

### Phase 1 — Install Agent Substrate (control + data plane)

- [x] Operator confirms: draft Phase 1 manifests; bootstrap `HelmRepository`
      under protected `01-bootstrap/`; RustFS chart-default for smoke + harden
      issue filed.
- [x] Add OCI `HelmRepository` `substrate` →
      `oci://ghcr.io/kagent-dev/substrate/helm` under
      `flux/manifests/01-bootstrap/helm/repositories/`.
- [x] Add `flux/manifests/04-apps/artificial-intelligence/substrate/`:
      `namespace.yaml` (`ate-system` + PSA privileged + `images/dockerhub`),
      `crds-helmrelease.yaml` (`substrate-crds` 0.0.6),
      `helmrelease.yaml` (`substrate` 0.0.6, `dependsOn: substrate-crds`),
      `kustomization.yaml`, README. Renovate `datasource=docker` annotations.
- [x] Wire `- substrate` into `artificial-intelligence/kustomization.yaml`.
- [x] Local verify (kustomize / helm template / yamllint / Trivy) — CAUTION OK
      for smoke (RustFS defaults + privileged atelet expected).
- [x] Operator applies; confirm `ate-*`, `valkey-cluster-{0..5}`, `rustfs`
      Running and init jobs Completed (read-only Flux/kubectl). Real-node gate:
      atelet Ready on all nodes; no PSA denials; hostPath mounts succeed.
      **Applied 2026-07-24:** both HRs Ready ~71s; atelet DS 4/4 Ready
      (talos-01..04); valkey 0–5 Running; rustfs Running; init jobs
      `valkey-cluster-init` + `rustfs-bucket-init` Complete; CRDs
      `workerpools.ate.dev` + `actortemplates.ate.dev` present. No PSA
      denials. Talos hostPath for atelet **works**.
- [x] **Refine this plan:** chart defaults sufficient for smoke; JWT stock
      issuer accepted (api-server Ready); footprint matches Phase 0 estimate;
      CRDs HR Ready briefly lagged `dependsOn` perception (~20s) then substrate
      install proceeded — no startup race beyond that.

### Phase 2 — Enable kagent substrate integration + WorkerPool

- [x] Add `controller.substrate.*` + `substrateWorkerPool.*` to the kagent
      HelmRelease values (see Decisions); pin `ateomImage` to v0.0.6.
      Do **not** set chart `substrate.enabled=true`.
- [x] Local verify; operator applies; watch kagent controller roll — **HR Ready**
      (upgrade v353); controller rolled.
- [x] Confirm `kubectl get workerpool kagent-default` shows replicas=2 Ready.
      **Resolved:** WorkerPool hosted in **`ate-system`** (`workerpool.yaml`);
      kagent `substrateWorkerPool.create=false`;
      `defaultWorkerPool.namespace=ate-system`. Deployment
      `kagent-default-deployment` **2/2 Ready** in ate-system (~12s).
      Controller env: `SUBSTRATE_DEFAULT_WORKERPOOL_NAMESPACE=ate-system`.
- [x] **Refine this plan:** PSA baseline blocks privileged ateom in `kagent`;
      do not chart-create WorkerPool there. Phase 3 smoke should rely on
      controller default pool (or name-only ref — CRD has no namespace field);
      omit same-ns assumptions.

### Phase 3 — Declarative smoke: `hello-substrate`

- [x] Author `SandboxAgent` `hello-substrate` in ns `kagent`
      (`platform: substrate`, `runtime: go`, `modelConfig: default-model-config`).
      Omit `workerPoolRef` (name-only resolves in agent ns; default pool is
      `ate-system/kagent-default`). Manifest:
      `kagent/hello-substrate.yaml`.
- [x] Local verify; operator applies; wait for Ready.
      **Applied 2026-07-24:** Ready after JWT issuer fix + controller substrate
      env (Flux `apps-ai` had clobbered local HR values — suspended during
      HITL). Golden snapshot Ready ~17s after issuer corrected to
      `https://kubernetes.apocrathia.com:6443`.
- [ ] UI smoke: chat proves execution beyond inference; View → Substrate shows
      the actor `Suspended` between requests.
- [x] **Refine this plan:** (1) chart JWT issuer must match Talos SA issuer
      (`kubernetes.apocrathia.com:6443`), not kind default; (2) local kubectl
      apply of HRs is overwritten by Flux `apps-ai` until push or suspend;
      (3) omit `workerPoolRef` when pool is cross-namespace.

### Phase 4 — Promote OpenClaw AgentHarness to resident

- [x] Author `AgentHarness` `openclaw-substrate-smoke` (`backend: openclaw`,
      `runtime: substrate`, `modelConfigRef: default-model-config`). Gateway
      token via cluster-local Secret `openclaw-substrate-smoke-gateway`
      (not in git; recreate cmd in manifest comment). Omit `workerPoolRef`.
      Do not touch generic-app OpenClaw.
- [x] Operator applies; Ready in ~51s. Status: `ActorRunning` on worker IP,
      bootstrap complete, connection via atenet-router Host
      `ahr-kagent-openclaw-substrate-smoke.actors.resources.substrate.ate.dev`.
      WorkerPool still 2/2; harness pins a long-lived actor slot (validates
      replicas=2 sizing vs declarative ephemeral sessions).
- [ ] UI smoke over ACP; confirm concurrent declarative session still schedules
      (headroom slot).
- [x] **Refine this plan:** CRD requires `gatewayToken` XOR
      `gatewayTokenSecretRef` when `substrate` is set; `runtime: substrate`
      required (default is openshell). AgentHarness surfaces the **full**
      OpenClaw Control UI (earlier “limited harness” note was wrong).
- [x] Replace the generic-app deployment with `AgentHarness/openclaw` in
      namespace `openclaw`; manifest path `openclaw/agentharness.yaml`.
      Ready live (`ahr-openclaw-openclaw`). Existing in-VM smoke state was
      disposable.
- [x] Add `ModelConfig/openclaw-model` +
      `OnePasswordItem/openclaw-harness-secrets` (item
      `vaults/Secrets/items/openclaw-secrets`). Secret key `token` is
      CRD-hardcoded.
- [x] Remove generic-app HelmRelease + ConfigMap generator from the **active**
      OpenClaw kustomization. Keep `helmrelease.yaml` / `openclaw.json` dormant
      on disk. Direct `openclaw.gateway.services.apocrathia.com` retired once
      live HelmRelease is deleted.
- [x] Delete smoke harness + cluster-only gateway Secret; remove smoke YAML
      from kagent kustomization.
- [x] Keep WorkerPool replicas at 2: one resident harness slot plus one
      declarative/session slot.
- [x] **Refine:** harnesses outside `kagent` need Role/RoleBinding granting
      `ate-system/ate-api-server` `get` on secrets/configmaps in that
      namespace (`openclaw/rbac-ate-api.yaml`). Without it ActorTemplate sticks
      in `ResumeGoldenActor` with Forbidden on secretKeyRef.
- [x] Delete live `HelmRelease/openclaw`; generic-app Deployment, Service, and
      legacy `OnePasswordItem/openclaw-secrets` are gone. Keep
      `helmrelease.yaml` dormant on disk for rollback.
- [ ] Treat RustFS credential hardening as required: resident gateway material
      is present in ActorTemplate/snapshot state (token also lands in
      ActorTemplate command base64 — rotate if describe/logs leaked it).
- [ ] Defer Hermes AgentHarness until stable kagent 0.10. kagent 0.9.12 accepts
      the CRD shape but the substrate controller returns `BackendUnavailable`
      for `backend: hermes`.
- [x] Flux `apps-ai` resumed after commit+push of the resident harness
      migration.

### Phase 5 — Docs

- [ ] Add operator/agent note: how substrate `SandboxAgent`/`AgentHarness`
      differ from plain Declarative pods (lifecycle, snapshots, WorkerPool slots,
      Go-only, footprint, PSA). Update kagent README + substrate dir README.
- [ ] `prettier -w` + `prettier --check` on changed markdown.

### Phase 6 — Refine → done

- [ ] Tick related-issue acceptance
      (`docs/issues/agent-substrate-real-environments.md`).
- [ ] Decide fate of the disposable harness (keep as reference vs tear down).
- [ ] **Delete this plan on ship** (ledger delete-on-ship; git is the archive).
      Move any durable lessons to `.agents/memories/` or the substrate README.

## Feedback loop

- `kustomize build flux/manifests/04-apps/artificial-intelligence/substrate`
- `kustomize build flux/manifests/04-apps/artificial-intelligence/kagent`
- `kustomize build flux/manifests/04-apps/artificial-intelligence/agents`
- `helm template` the substrate + kagent charts with the pinned values
- `yamllint` on changed manifests
- Trivy on changed paths (`user-trivy` / project scanner) after any
  manifest/dependency change
- Flux MCP read-only: HelmRelease status for `substrate-crds`, `substrate`,
  `kagent` (mutate needs operator ask)
- `kubectl get workerpool` / `sandboxagent` / `agentharness` Ready conditions
- UI smoke: chat + Substrate inventory (actor `Suspended` between sessions)
- Real-node: atelet DaemonSet Ready; no PSA events on `ate-system`

## Notes

- Likely paths: `flux/manifests/04-apps/artificial-intelligence/substrate/` (new),
  `flux/manifests/01-bootstrap/helm/repositories/substrate.yaml` (protected),
  `.../kagent/helmrelease.yaml`, `.../agents/hello-substrate/` (new),
  kagent + substrate READMEs.
- Risks / rollback:
  - **Footprint** — valkey ×6 + rustfs + atelet is the biggest homelab cost;
    Phase 0 capacity is GO. Rollback = uninstall both substrate HelmReleases +
    revert kagent values.
  - **Privileged data plane** — atelet privileged/hostPath/hostPort; PSA labels
    required; Talos hostPath mountability still unproven until apply.
  - **RustFS defaults** — inline admin creds; harden before treating as durable.
  - **Go-only** — Python ADK agents cannot run on substrate.
- Implement via `implement-change` / `manifest-implementer` + `manifest-verifier`
  per phase; `helm-deployment` skill for the substrate charts. HITL throughout.
- Upstream: [Agent Substrate](https://kagent.dev/docs/kagent/examples/agent-substrate),
  [Agent Harness](https://kagent.dev/docs/kagent/examples/agent-harness).
  Research agents: [compat](84210d03-da46-4f0f-b2e9-8c1558de0388),
  [SRE](761eac71-bd3e-4868-b7af-9fcb8f9a5c8f),
  [repo](3caeefde-b174-4fb2-aaaf-25bc888ff75f),
  [gVisor](285ac608-5650-40da-83a4-dc08e0bc2ae1),
  [Kyverno/PSA](4442d939-de8c-4d8c-86a4-1d2197c9623a).
