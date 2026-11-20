---
title: "kagent + substrate 1.0 rollout runbook"
status: active
found_at: 2026-11-19
updated_at: 2026-11-19
area: agents
---

# kagent + substrate 1.0 rollout runbook

## Goal

Merge-time operator sequence for the kagent 1.0.1 + substrate 1.0.1
migration (`chore/upgrade-kagent-substrate-1.0`). The upgrade is not
apply-and-forget: both CRD charts drop every previously-served API version,
so the old object fleet must be deleted before the new CRDs can land. This
runbook covers the expected failure states, the one required operator
intervention, convergence, and cleanup.

## Scope

**In scope:**

- CRD stored-version unblock for `substrate-crds` (`workerpools.ate.dev`
  v1alpha1 -> v1).
- Old-fleet teardown and recreation across the kagent API group rename
  (`kagent.dev` -> `api.kagent.dev`).
- The fleet outage window: why it exists, when it starts and ends.
- `substrate` first-install ordering against its CNPG cluster.

**Out of scope:**

- Preconditions documented where they live: Talos kube-apiserver gates and
  1Password items
  ([substrate/README.md](../../flux/manifests/04-apps/artificial-intelligence/substrate/README.md));
  MCPServer CRD protection and adoption
  ([kmcp/README.md](../../flux/manifests/04-apps/artificial-intelligence/kmcp/README.md)).

## Decisions

- **No in-place migration: the fleet is deleted and recreated.** Both new
  CRD charts serve exactly one version per kind with no conversion webhook
  (`conversion` unset = `None`), and kagent renamed its API group
  (`kagent.dev` -> `api.kagent.dev`). Old objects cannot be updated into the
  new APIs; the MR re-creates every CR. Without a served overlap there is
  no conversion path — an outage window is inherent to this upgrade.
- **The agent fleet consolidates into `kagent`.** v1alpha3 agent tools are
  same-namespace-only, so the six per-namespace custom agents and the seven
  vendored 0.10.x subchart agents all re-create in `kagent` (AgentTemplate +
  thin Agent). The `agent-{git,infrastructure,knowledge,media,search}`
  namespaces delete with their Namespace CRs; `agent-home` and
  `agent-homelab` survive as bridge-only hosts. A2A URLs move to
  `/api/a2a/kagent/<agent>` (litellm, hermes, the CI job, both bridges are
  rewired in this MR).
- **substrate-crds is blocked by `status.storedVersions`.**
  `workerpools.ate.dev` keeps its CRD name across 0.0.6 -> 1.0.1, so the
  upgrade is a spec update that drops `v1alpha1`. Kubernetes rejects a CRD
  update that drops a version still listed in `status.storedVersions`, and
  the apiserver never auto-prunes that list. The live
  `WorkerPool/kagent-default` (ate-system) is stored at `v1alpha1`, so the
  HelmRelease fail-loops until the object is deleted and `storedVersions`
  is patched (Steps).
- **kagent-crds needs no storedVersions patch.** The 1.0.1 chart serves the
  renamed `api.kagent.dev` group; the old `kagent.dev` CRDs are simply
  absent from the new chart, so helm deletes them on upgrade. CRD deletion
  has no storedVersions precondition and garbage-collects its objects —
  which is also what tears down the v1alpha2 fleet.
- **Fleet outage is accepted and bounded.** It starts when the kagent-crds
  upgrade deletes the old CRDs (first reconcile after merge) and ends when
  the substrate stack converges after the storedVersions unblock. kagent
  1.0.1 cannot compile harnesses against the still-running substrate 0.0.6
  in between.

## Steps

Preconditions (operator, before merge): Talos gates applied and control
planes restarted, 1Password items created, and the MCPServer CRD annotated
`helm.sh/resource-policy=keep` so the kagent-crds upgrade cannot delete it
(see Scope links). The MR cannot go green without the Talos gates and the
1Password items; the annotation only protects the 14 in-cluster MCP
servers from a fleet bounce.

- [ ] 1. **Merge and let Flux run.** Expect this state — it is the plan,
     not a broken deploy:

  - `kagent-crds` upgrade succeeds: helm creates the 8 `api.kagent.dev`
    CRDs and prunes the old release manifest. The 8 `kagent.dev` CRDs are
    deleted; `mcpservers.kagent.dev` (in the old manifest via the deployed
    0.10.6 chart's `kmcp-crds` subchart) is skipped only because of the
    precondition annotation. The v1alpha2 fleet — Agents,
    AgentHarnesses, ModelConfigs, RemoteMCPServers, SandboxAgents — is
    garbage-collected with the CRD deletions. Flux pruning of the
    git-tracked v1alpha2 CRs may land first (apps-ai prunes on its 10m
    interval); do not rely on it. CRD deletion waits for all custom
    resources to clear — it does NOT bypass CR finalizers — so a
    finalizer-stuck object (e.g. `AgentHarness/openclaw`, broken for 115d —
    see `docs/issues/substrate-kagent-version-skew.md`) keeps its CRD in
    Terminating. Strip the finalizer and the CRD completes:

    ```bash
    kubectl patch agentharness openclaw -n openclaw --type=merge \
      -p '{"metadata":{"finalizers":null}}'
    ```

  - `substrate-crds` upgrade fails and remediation-retries:

    ```text
    CustomResourceDefinition.apiextensions.k8s.io "workerpools.ate.dev" is invalid:
    status.storedVersions[0]: Invalid value: "v1alpha1": missing from spec.versions;
    v1alpha1 was previously a storage version, and must remain in spec.versions until
    a storage migration ensures no data remains persisted in v1alpha1 and removes
    v1alpha1 from status.storedVersions
    ```

    Everything behind it (`substrate-podcert`, `substrate-atelet`,
    `substrate`) waits on dependsOn. Substrate 0.0.6 keeps running
    untouched in the meantime; the `substrate-postgres` CNPG cluster is a
    plain CR and may come up early — that is fine.

  - The new `api.kagent.dev/v1alpha3` CRs apply once the new CRDs exist
    (transient `no matches for kind` until then). Flux also prunes the five
    emptied `agent-*` Namespace CRs — namespace deletion cascades once the
    CRs inside them are gone, so expect the `agent-{git,infrastructure,
knowledge,media,search}` namespaces to terminate during convergence
    (the two bridge namespaces stay). The `kagent` HelmRelease
    upgrade itself fail-loops with the removed-API error below (the
    deployed release still tracks `kagent.dev/v1alpha2` objects, and their
    kinds are now gone) — no 1.0.1 controller until the stub recovery in
    step 3. Once it does deploy, it cannot compile harnesses against the
    old substrate 0.0.6 server — agents stay down until step 2 unblocks
    substrate.

- [ ] 2. **Unblock substrate-crds (the one required intervention):**

  ```bash
  # The v1alpha1 object pinning v1alpha1 into storedVersions. Flux pruning
  # may already have deleted it (the pool moved to the kagent namespace in
  # this MR) — check first.
  kubectl get workerpool -n ate-system
  kubectl delete workerpool kagent-default -n ate-system

  # No other live objects should pin dead storage versions: the 0.0.6 chart
  # creates no SandboxConfig and csidriverconfigs is new in 1.0.1. If any
  # sandboxconfigs exist, delete them and patch that CRD the same way.
  kubectl get sandboxconfigs.ate.dev -A

  # Drop the dead storage version. The status-subresource update is not
  # validated against spec.versions — that check is exactly what rejects
  # the chart upgrade — so this patch is safe while the old spec is still
  # serving.
  kubectl patch crd workerpools.ate.dev --subresource=status --type=merge \
    -p '{"status":{"storedVersions":["v1"]}}'

  # Land the upgrade (or wait out the remediation backoff).
  flux reconcile helmrelease substrate-crds -n ate-system
  ```

  The upgrade applies `workerpools.ate.dev` v1 and `sandboxconfigs.ate.dev`
  v1, creates `csidriverconfigs.ate.dev`, and deletes
  `actortemplates.ate.dev` (dropped from the chart — the kagent 0.10.x
  integration that created ActorTemplates is gone with this migration).

- [ ] 3. **Converge.** `substrate-podcert` and `substrate-atelet`
     reconcile (both gated by `substrate-crds` and `ate-cache`), then
     `substrate` (depends on all of them); the `substrate-postgres` CNPG
     cluster is applied by kustomize and converges alongside. Then kagent
     harness compiles succeed and the fleet returns.

  Expect first-install retries on `substrate`: the CNPG Cluster is a plain
  CR, not a HelmRelease, so `substrate` cannot dependsOn it (same posture
  as litellm's database). ate-api-server crash-loops and the HelmRelease
  remediation-retries until the cluster is up AND the
  `substrate-postgres` OnePasswordItem (the consolidated substrate-secrets
  item) has rendered the bootstrap Secret.
  Retries during first boot are convergence noise, not a blocker.

  If `kagent` (the controller HelmRelease) fail-loops instead with:

  ```text
  current release manifest contains removed kubernetes api(s) ...
  no matches for kind "ModelConfig" in version "kagent.dev/v1alpha2"
  ```

  the deployed kagent release (0.10.4 — the 0.10.6 upgrade fails on the
  chart's substrate-disabled gate, so 0.10.4 is the last deployed
  revision) still tracks chart-created `kagent.dev/v1alpha2` objects
  (seven subchart `Agent`s, `ModelConfig/default-model-config`, and
  `RemoteMCPServer`s `kagent-grafana-mcp` + `kagent-tool-server`), and
  helm cannot build the old manifest to compute the upgrade diff now that
  those CRDs are gone. Recovery: re-create the three dead CRDs as empty
  stubs, let the upgrade run, remove the stubs.

  ```bash
  helm pull oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds --version 0.10.6
  tar xf kagent-crds-0.10.6.tgz
  kubectl apply -f kagent-crds/templates/kagent.dev_agents.yaml \
    kagent-crds/templates/kagent.dev_modelconfigs.yaml \
    kagent-crds/templates/kagent.dev_remotemcpservers.yaml
  flux reconcile helmrelease kagent -n kagent
  # Confirm the upgrade landed before dropping the stubs (STATUS: deployed,
  # chart kagent-1.0.1, revision past 377) — deleting them mid-upgrade just
  # re-triggers the same removed-API failure.
  helm status kagent -n kagent
  kubectl delete crd agents.kagent.dev modelconfigs.kagent.dev remotemcpservers.kagent.dev
  ```

- [ ] 4. **Verify.**

  ```bash
  kubectl get helmrelease -n ate-system substrate-crds substrate substrate-atelet
  kubectl get helmrelease -n podcertificate-controller-system substrate-podcert
  kubectl get cluster -n ate-system substrate-postgres
  kubectl get helmrelease -n kagent kagent-crds kagent kmcp-crds kmcp
  kubectl get workerpool -A                       # kagent-default only
  kubectl get agents -A                           # the v1alpha3 fleet in kagent
  kubectl get agenttemplates -n kagent            # 14: seven custom + seven vendored
  kubectl get mcpservers -A                       # 14, reconciled by kmcp
  kubectl get ns | grep '^agent-'                 # agent-home + agent-homelab only
  ```

  If the 14 MCPServer CRs are missing: the `helm.sh/resource-policy=keep`
  precondition was not applied before the kagent-crds upgrade, so helm
  deleted `mcpservers.kagent.dev` with the old release manifest (ownership
  annotations do not protect it — helm's delete path only checks
  resource-policy). `flux reconcile helmrelease kmcp-crds -n kagent`
  re-creates the CRD, then `flux reconcile kustomization apps-ai` brings
  the CRs back from git.

  Smoke: hello-substrate A2A round-trip (the arm64 gVisor
  checkpoint/restore path that killed the 0.10.x line), a homelab-agent
  Discord round-trip, and one delegation edge (ask homelab-agent something
  that should route to git-agent) to prove the consolidated subAgent
  bindings compile.

- [ ] 5. **Clean up dropped CRDs.**

  ```bash
  # Expected end state: 8 api.kagent.dev CRDs, mcpservers.kagent.dev,
  # and workerpools/sandboxconfigs/csidriverconfigs.ate.dev. Nothing else.
  kubectl get crd | grep -E 'kagent\.dev|ate\.dev'
  ```

  The kagent-crds upgrade deletes the old `kagent.dev` CRDs and the
  substrate-crds upgrade deletes `actortemplates.ate.dev`; the step-3 stubs
  are removed by hand there. Drop the temporary keep annotation so helm
  manages the MCPServer CRD normally from here on:

  ```bash
  kubectl annotate crd mcpservers.kagent.dev helm.sh/resource-policy-
  ```

  `agentharnesses.kagent.dev` may linger in Terminating until the openclaw
  finalizer is stripped (step 1). If anything else lingers (a delete that
  never ran), confirm it is empty and delete it:

  ```bash
  kubectl delete crd actortemplates.ate.dev
  ```

## Feedback loop

- Rendered manifests are unchanged by this doc:
  `kubectl kustomize flux/manifests/04-apps/artificial-intelligence` and
  `kubectl kustomize flux/manifests/01-bootstrap/helm` exit 0.
- Live: the verify commands in Steps 4-5, plus
  `kubectl get crd workerpools.ate.dev -o jsonpath='{.status.storedVersions}'`
  returning `["v1"]` after the Step-2 patch.

## Notes

- Why the storedVersions patch works: the CRD **status subresource** update
  path skips the `storedVersions` vs `spec.versions` cross-check (that
  check runs on the spec update path and is exactly what blocks the chart
  upgrade). Patching status after deleting the stored objects is the
  standard way to retire a storage version; the apiserver never prunes it
  on its own.
- The kagent API group rename is why the kagent side needs no
  storedVersions surgery: old CRDs are deleted (not updated), and deletion
  has no storedVersions precondition.
- The old fleet cannot be pre-deleted before merge: the v1alpha2 CRs are
  git-managed, so Flux re-applies them until the MR lands. The teardown
  belongs to the merge-time CRD swap, not to a pre-merge maintenance
  window.
