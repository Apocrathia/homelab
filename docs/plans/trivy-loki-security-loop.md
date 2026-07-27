---
title: "Trivy Loki security loop (Prometheus detect, Loki investigate)"
status: active
found_at: 2026-07-26
updated_at: 2026-07-26
area: security
---

# Trivy Loki security loop (Prometheus detect, Loki investigate)

## Goal

Turn existing Trivy Operator data into a durable security feedback loop:
queryable Loki reports, Grafana-managed alerts on Prometheus findings, and a
repeatable path from alert/query → `docs/issues/` remediations.

## Scope

**In scope:**

- Phase A: Fix Alloy Trivy webhook JSON → label extraction; document working
  LogQL; diagnose missing image CVE metrics / `VulnerabilityReport` in Loki
- Phase B: Grafana Operator alert rules (`GrafanaAlertRuleGroup` + Security
  folder) on Trivy Prometheus metrics; route via existing notification policy
- Phase C: Operator/agent triage playbook — Loki drill-down → theme-level
  issues under `docs/issues/` (noise policy aligned with
  `trivy-scan-noise-deferred.md`)

**Out of scope:**

- Replacing the existing Prometheus Trivy Operator dashboard (grafana.com 17813)
- Loki-native LogQL alert rules as the primary detection path
- Unpacking full report bodies into high-cardinality labels or metrics in Alloy
- Kyverno / admission auto-enforce driven by Trivy findings
- Enabling net-new Trivy scan kinds beyond repairing what should already ship
- Cluster mutate or git commit without operator authorization

## Decisions

- Detection store — **Prometheus** — cheap rollups; matches existing
  `GrafanaAlertRuleGroup` pattern under
  `flux/manifests/03-services/observability/grafana/alerting/`. Reversible by
  deleting the Security alert manifests.
- Evidence store — **Loki** — full report JSON via Trivy webhook → Alloy.
  Labels are for filtering only; severity detail stays in the line body.
- Alert authoring — **Grafana Operator CRs** (`GrafanaAlertRuleGroup` /
  `GrafanaFolder`) — GitOps SoT; not PrometheusRule, not UI-only rules.
- Alloy JSON paths — **camelCase `operatorObject.*`** — live payloads use
  `operatorObject`; current `OperatorObject` paths never promote
  `report_kind` / `namespace` / `verb`. Low-risk fix; verify with one LogQL
  after Alloy reload.
- Label set — **keep lean** (`report_kind`, `report_name`, `namespace`,
  `verb` plus existing static `source`/`job`/`cluster`/`component`) — do not
  promote CVE IDs or check IDs to labels (cardinality).
- Alert severity — **CRITICAL and selected HIGH only** for v1 — avoid
  Discord firehose from MEDIUM/LOW config noise.
- Remediation grain — **one issue per theme** (e.g. allowPrivilegeEscalation,
  HostPath, secrets RBAC), not per pod — matches existing ledger style.
- CVE gap — **diagnose in Phase A, do not block A/B on configaudit/compliance
  alerts** — as of 2026-07-26 Prom only exposes
  `trivy_cluster_compliance`, `trivy_compliance_info`,
  `trivy_configaudits_info`, `trivy_resource_configaudits`,
  `trivy_resource_infraassessments`,
  `trivy_clusterrole_clusterrbacassessments`; no vuln metric series and no
  `VulnerabilityReport` lines in Loki (24h sample).

## Steps

### Phase A — Loki query surface

- [ ] Fix `loki.process "trivy_reports"` JSON expressions in
      `flux/manifests/03-services/observability/alloy/configmap.yaml` to use
      `operatorObject.kind`, `operatorObject.apiVersion`,
      `operatorObject.metadata.name`, `operatorObject.metadata.namespace`
      (and keep `Verb` / `verb` if that field remains PascalCase in payloads)
- [ ] Operator applies / Flux reconciles Alloy; confirm new labels appear on
      `{source="trivy"}` streams
- [ ] Update LogQL examples in
      `flux/manifests/03-services/trivy/README.md` to match real labels and
      include 2–3 useful queries (by `report_kind`, by namespace, compliance
      fail summaries via `| json`)
- [ ] Diagnose missing CVE path: Trivy Operator scan jobs / Helm values /
      webhook payload kinds; file `docs/issues/` if repair is a separate lap

### Phase B — Grafana alerts

- [ ] Add Security `GrafanaFolder` + `GrafanaAlertRuleGroup` under
      `flux/manifests/03-services/observability/grafana/alerting/` (mirror
      `pvc-capacity.yaml` structure)
- [ ] Wire kustomization include for the new alert file
- [ ] Rule v1 candidates (tune thresholds after dry-run in Explore):
  - CRITICAL config-audit findings present (`trivy_configaudits_info` /
    resource configaudit series — confirm exact PromQL against live labels)
  - Compliance control failures at CRITICAL/HIGH for selected CIS/PSS
    controls (`trivy_compliance_info` / `trivy_cluster_compliance`)
- [ ] Labels: `component=security`, severity; rely on default Discord route
      unless a dedicated security route is requested later
- [ ] Verify rules evaluate in Grafana (pending/firing as expected); silence
      or raise thresholds if noisy

### Phase C — Remediation loop

- [ ] Document triage playbook in Trivy README (or short
      `docs/security/` pointer): alert → Loki filter by namespace/report_kind
      → theme issue via `file-issue`
- [ ] First burn-down wave from current CIS summary (theme issues only):
  - SecurityContext / seccomp gaps
  - `allowPrivilegeEscalation`
  - Minimize secrets access / wildcard RBAC (coordinate with existing
    `trivy-kyverno-gateway-secrets-rbac.md`)
  - HostPath volumes
- [ ] Respect deferred noise buckets in `trivy-scan-noise-deferred.md`

## Feedback loop

Phase A:

- LogQL: `{source="trivy"}` — confirm `report_kind` / `namespace` labels
  exist (`list_loki_label_values` or Explore)
- LogQL: `{source="trivy", report_kind="ConfigAuditReport"}` returns rows
- `prettier --check` on touched markdown; yamllint / Alloy config sanity on
  ConfigMap edit

Phase B:

- Grafana Explore PromQL for each alert expression before shipping the CR
- After apply: Grafana alerting UI / MCP `alerting_manage_rules` list shows
  Security group; rules not stuck in Error
- Optional: Trivy MCP `scan_filesystem` on changed alert YAML paths

Phase C:

- Filed issues have concrete acceptance + feedback loop
- Re-query CIS/`trivy_compliance_info` after remediations to see fail counts
  move

## Notes

- Existing dashboard:
  http://grafana.gateway.services.apocrathia.com/d/ycwPj724k (Prometheus)
- Alloy webhook listener: `alloy.alloy-system.svc:8080` ←
  `operator.webhookBroadcastURL` on `trivy-operator`
- Alternate report storage keeps reports out of etcd; Loki is the report SoT
- Agents never commit; operator commits and authorizes any cluster apply
