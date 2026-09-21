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

## Resolution (2026-09-20)

The hosting gate is met: the controller migrated from CK+ to UniFi OS
Server on the unifi-os NUC (10.0.1.3 native / 10.10.0.3 management;
unifi.apocrathia.com CNAMEs here via nftables 443→11443). A full site
restore (not a rebuild) carried the config; 13/13 devices migrated with
set-inform. Architecture is split: the NUC hosts the Network app only;
the UXG-Pro stays the gateway and serves DHCP/DNS; Protect runs
standalone on the UNVR-Pro. The CK+ is powered off.

The Problem / desired state text above describes the pre-migration
world and is retained as history.

Remaining acceptance before closing: confirm live IPFIX receipt
post-cutover — UXG's restored netflow config (enabled, v10, port 2055,
target `ingest.services.apocrathia.com`, seven networks) provisions the
exporter and the goflow2 ingest path is up; one Grafana flows-dashboard
glance confirms the series. Close on confirmation.

## Resolution (2026-09-21): flows live via manual NETFLOW section — stock export is controller-broken

Flows confirmed end-to-end: UXG → goflow2 (`10.100.1.96:2055`) →
Prometheus → Mimir → Grafana `goflow2-collector`. Series:
`goflow2_flow_traffic_packets_total{remote_ip="10.100.1.1"}`. The
remaining acceptance above is answered — but not the way anyone expected.

### Root cause (primary): renderer omission

Network 10.6.106 never emits the `NETFLOW` section into the device config
it pushes (`/data/udapi-config/udapi-net-cfg*.json` on the gateway; zero
netflow in any config, current or historical). The CK+ era harvest shows the
same omission — the bug predates the migration, and the "gimped flows"
complaint was never DNS alone. The UI still renders NetFlow settings pages
(frontend locale strings only); the backend has zero netflow references —
no code on disk, no log lines. The setting key is dead weight: the
controller re-renders on every netflow change (cfgversion bumps) and drops
the section at output time.

The device side is fully capable: firmware 5.1.26 ships
`iptables-netflow` + `ipt_NETFLOW.ko`, and `ubios-udapi-server` accepts a
hand-fed `NETFLOW` section — module loads, rules land, flows egress within
seconds of a `udapi-server` restart.

### Root cause (secondary): gateway-internal DNS

Gateway-internal services resolve via the UTM coredns chain (NextDNS
upstreams), which cannot see the internal zone. `svc-flow-accounting`
logs `got error on hostname resolving` on `ingest.services.apocrathia.com`
— LAN clients resolve it fine via the gateway's DHCP/DNS, but the
gateway cannot resolve it for itself. **Gateway-internal destinations
must be raw IPs** (hence `10.100.1.96` in the section). Same trap applies
to any gateway-internal setting that takes a hostname.

### Vendor

Support ticket opened 2026-09-21: renderer omits NETFLOW; device side
proven working with a manual section. Community evidence: same silent
failure on UDM-Pro / UCG-Ultra since Network ~9.4 (locked thread, no
Ubiquiti response).

### Manual re-apply runbook

The section dies on every controller config push (any gateway-affecting
setting change re-renders `udapi-net-cfg.json`). Flows stop; re-apply:

1. SSH to the UXG (`root@10.10.0.1`).
2. `ls -l /data/udapi-config/udapi-net-cfg.json` — resolve the symlink to
   the current versioned file.
3. Back it up, then add the section (tested shape; `engineID` showed as 0
   in logs — field consumed as auto or ignored):

   ```json
   "NETFLOW": {
     "destination": { "address": "10.100.1.96", "port": 2055 },
     "engineID": 1,
     "refreshRate": 20,
     "timeoutRate": 300,
     "samplingRate": 0,
     "version": 9
   }
   ```

4. `systemctl restart udapi-server` — **bounces SSH (management plane
   rides udapi-server); reconnect after ~30 s.**
5. Confirm: `lsmod | grep NETFLOW`; `journalctl -u udapi-server | grep
flow-accounting` (no resolving errors); Grafana `goflow2-collector`
   series from `remote_ip="10.100.1.1"`.

### Re-test trigger (vendor-fix check)

After every Network Application upgrade:
`grep -c NETFLOW /data/udapi-config/udapi-net-cfg.json` on the gateway.
Non-zero = renderer learned the feature — retire the runbook, move the
destination to the UI setting (raw IP), delete the workaround.

**Status: stays open** — flows run on a workaround that any config push
kills; closing waits on the vendor renderer fix.
