---
title: "UniFi UXG-Pro IPFIX: migrate off CK+ for Traffic Flows hosting"
kind: feature
status: open
severity: medium
source: dogfood
found_at: 2026-08-01
found_by: agent+human
area: networking
slice: hitl
---

# UniFi UXG-Pro IPFIX: migrate off CK+ for Traffic Flows hosting

## Problem / desired state

goflow2 is healthy and scrapable (Mimir `up{job="goflow2"}=1`, UDP/2055 LB
VIP `10.100.1.96` / `ingest.services.apocrathia.com`). The collector path works
(cluster probe reaches the pod).

UniFi Network UI has NetFlow (IPFIX) configured (v10, collector hostname/port
2055, networks selected), but the **UXG-Pro emits nothing**. Gateway
`tcpdump -ni any udp port 2055` is silent. goflow2 has only ever seen our own
probe packet.

Root cause is UniFi product gating, not Cilium/goflow2:

- Gateway is **UXG-Pro** (`unpoller` model `UXGPRO`, firmware `5.0.16.x`)
- Controller is a **Cloud Key Gen2 Plus (CK+)**
- For UXG models, full Traffic Flows / “All Traffic” (and the IPFIX exporter
  that hangs off that stack) requires **UniFi OS Server**, **Official
  Hosting**, or **UCK-Enterprise** — not CK+
- CK+ + UXG only gets stub Flows (blocked/threat theater). UI can still show
  NetFlow form fields without a working exporter

Desired: run UniFi Network on a host that unlocks UXG Traffic Flows (spare NUC
→ UniFi OS Server preferred over paid Official Hosting / UCK-Enterprise), then
confirm the UXG actually emits IPFIX to goflow2.

Related in-repo: goflow2 collector + Network-folder Grafana dashboard under
`flux/manifests/03-services/observability/goflow2/` (dashboard work may land
separately on `feat/goflow2-dashboard`).

## Repro

1. UniFi → Settings → CyberSecure → Traffic Logging → NetFlow (IPFIX) enabled
   (v10, collector `ingest.services.apocrathia.com:2055`).
2. SSH to Gateway: `tcpdump -ni any udp port 2055` → no packets.
3. Cluster: goflow2 `Udp: InDatagrams` stays flat except artificial probes;
   no `goflow2_flow_*` series from the UXG `remote_ip`.

## Acceptance

- Controller is no longer CK+ for this site; UXG is adopted on **UniFi OS
  Server** (or Official Hosting / UCK-Enterprise if chosen instead)
- Insights → Flows offers **All Traffic** (not blocked/threats-only stub)
- With NetFlow (IPFIX) enabled, Gateway `tcpdump` shows UDP/2055 toward
  `10.100.1.96` (or the configured collector)
- goflow2 exposes non-probe `goflow2_flow_traffic_*` / `goflow2_flow_process_nf_*`
  labeled with the UXG as exporter; Grafana **goflow2 Collector** dashboard
  (Mimir) shows ingest

## Feedback loop

- Gateway: `tcpdump -ni any udp port 2055` (must leave silence)
- Cluster: `kubectl exec -n goflow2 deploy/goflow2 -- wget -qO- http://127.0.0.1:8080/metrics | grep goflow2_flow_traffic`
- Mimir: `increase(goflow2_flow_traffic_packets_total[15m])` with non-probe
  `remote_ip`
- UniFi UI: Insights → Flows shows All Traffic after hosting change

## Implementation hint

Stage spare NUC with UniFi OS Server (self-hosted, free). Backup CK+, restore /
re-adopt UXG, then re-test IPFIX before spending time on goflow2. Note: even on
supported hosting, UniFi IPFIX **export** has community reports of staying
quiet while Insights → Flows works — treat export verification as a separate
gate after hosting unlock.

Do not invent SSH/`config.gateway.json` netflow on UXG — UbiOS provisioning
will wipe it; that path died with USG.

## Notes

Evidence from 2026-08-01 dogfood:

- DNS: `ingest.services.apocrathia.com` → `10.100.1.96` (public + local)
- Shared Cilium LB IPAM key `ingest` with Alloy (syslog/CEF) — VIP path OK
- Sampling on/off did not matter (exporter never sent)
- Community: [UDM-Pro IPFIX export broken](https://community.ui.com/questions/UDM-Pro-Not-Exporting-Traffic-via-NetFlow-IPFIX-on-Network-9-3-45/09523ae8-5a34-4c54-a12b-2bd84e0c0a8d);
  [CK+ vs UOS Server Flows](https://community.ui.com/questions/986ad011-b9d0-4a5a-afe8-359760fcf8ea);
  [Network 9.1.120 UXG hosting requirement](https://community.ui.com/releases/UniFi-Network-Application-9-1-120/a5e88ae2-3c44-420a-bebb-5120bf2288b2)
- Official docs: [Traffic Flows and Traffic Logging](https://help.ui.com/hc/en-us/articles/32201256219799-Traffic-Flows-and-Traffic-Logging-in-UniFi-Network)

Out of scope for this issue: rewriting goflow2 to ClickHouse top-talkers;
SPAN/softflowd alternatives (valid escape hatch if UniFi export stays dead
after UOS Server).
