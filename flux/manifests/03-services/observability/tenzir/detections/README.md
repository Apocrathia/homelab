# Detections

The detection plane: one OCSF bus on the core node, one sigma pass over
it, and one archive dataset for everything the plane produces. This
README documents the architecture; the node wiring lives in
[`nodes/core/`](../nodes/core/README.md).

## Three planes

- **Live detection** runs in-node: feeds publish OCSF-normalized events
  onto the `ocsf` topic and the sigma pipeline evaluates rules against
  them as they arrive.
- **Findings and events** live in the ClickHouse OCSF query store
  (per-class `ocsf.<Class_Name>` tables). It is the record: everything
  else is a buffer. The retired `s3://tenzir/ocsf/` parquet archive
  stays untouched in the rustfs bucket as frozen, unqueried history.
- **Querying and alerting** live in Grafana over the `ocsf-clickhouse`
  datasource. Grafana owns notifications; there is no other findings
  egress (the Discord doorbell and the Loki findings projection
  are gone, cut with this restructure).

## The bus

Every normalized feed publishes to the unified `ocsf` topic: k8s audit
(API Activity 6003), authentik (Authentication 3002, Account Change
3001), fleet (Base Event), trivy (Vulnerability Finding 2002, Detection
Finding 2004), netflow (Network Activity 4001). The tetragon node
publishes its own node-local `ocsf` topic with Process Activity (1007),
File System Activity (1001), and Network Activity (4001). One
`sigma-detection` pipeline on the core node subscribes.

## Sigma semantics

The sigma operator runs with `mapping="auto"`: it selects matching
behavior per input schema. OCSF-shaped schemas get translated rules; a
rule whose fields do not resolve for a schema is skipped with one
warning per revision, never weakened. The
[`homelab/`](./sigma/homelab/README.md) rules are written against OCSF
field paths and evaluate live. The vendored
[`sigma/sigmahq/kubernetes-audit/`](./sigma/sigmahq/kubernetes-audit/README.md)
corpus names raw audit fields, has no OCSF projection, and stays parked
until upstream publishes a translation.

Detection Findings (2004) are stamped with a stable uid, rule id plus
subject fingerprint, and imported into the node lake; the archive rule
exports them with every other class after the 15-minute window. trivy's
own 2004s (ExposedSecretReport) ride the same stamp via the trivy
pipeline.

## Class taxonomy

| Class                 | uid  | Source                                                                                                     |
| --------------------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| API Activity          | 6003 | kube-apiserver audit (k8s map)                                                                             |
| Authentication        | 3002 | authentik logins (authentik map)                                                                           |
| Account Change        | 3001 | authentik account mutations (authentik map)                                                                |
| Network Activity      | 4001 | netflow flows, tetragon kprobe connect attempts (netflow/tetragon maps)                                    |
| Detection Finding     | 2004 | sigma matches, trivy ExposedSecretReport                                                                   |
| Vulnerability Finding | 2002 | trivy VulnerabilityReport (homelab convention: Tenzir upstream documents no vulnerability-finding mapping) |
| Process Activity      | 1007 | tetragon exec and exit (tetragon map)                                                                      |
| File System Activity  | 1001 | tetragon secret-file-access kprobe (tetragon map)                                                          |
| Base Event            | 0    | fleet rows, authentik non-IAM actions, unknown tetragon kinds: cannot name a class, not archived           |

Mappings resolve class ids with the lookup idiom instead of hard-coded
numbers: `ocsf_class_uid("Network Activity")` reads better than
`4001` and survives OCSF revisions. Write it that way in rules and
mappers; the numbers exist for the reader.

Classes that cannot map to OCSF (the Base Event fallback above) are not
archived: they expire with the 15-minute local window on the
weighted-age backstop. When a feed grows a real class mapping, it joins
the archive automatically.

## YARA scaffold

[`yara/`](./yara/README.md) holds a vendored subset of the
signature-base ruleset. No pipeline consumes it yet: the tenzir `yara`
operator needs a finite byte source and none exists. The scaffold is a
pinned submodule plus nine byte-identical rules, ready for the consumer
MR.
