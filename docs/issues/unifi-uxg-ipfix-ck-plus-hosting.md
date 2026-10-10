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

The UDP/2055 ingest path is healthy (LB VIP `10.100.1.96` /
`ingest.services.apocrathia.com`). At filing time the collector was goflow2 —
healthy, scrapable (Mimir `up{job="goflow2"}=1`), and reached by cluster
probes. goflow2 has since been removed (SIEM lap C): NetFlow collection is
moving to the Tenzir detection node's `read_netflow` listener (lap-C part 2,
same LB pool IP `10.100.1.96`, UDP :2055).

UniFi Network UI has NetFlow (IPFIX) configured (v10, collector hostname/port
2055, networks selected), but the **UXG-Pro emits nothing**. Gateway
`tcpdump -ni any udp port 2055` is silent. The collector (goflow2 at the
time) had only ever seen our own probe packet.

Root cause is UniFi product gating, not Cilium or the collector:

- Gateway is **UXG-Pro** (`unpoller` model `UXGPRO`, firmware `5.0.16.x`)
- Controller is a **Cloud Key Gen2 Plus (CK+)**
- For UXG models, full Traffic Flows / “All Traffic” (and the IPFIX exporter
  that hangs off that stack) requires **UniFi OS Server**, **Official
  Hosting**, or **UCK-Enterprise** — not CK+
- CK+ + UXG only gets stub Flows (blocked/threat theater). UI can still show
  NetFlow form fields without a working exporter

Desired: run UniFi Network on a host that unlocks UXG Traffic Flows (spare NUC
→ UniFi OS Server preferred over paid Official Hosting / UCK-Enterprise), then
confirm the UXG actually emits IPFIX to the collector.

Related in-repo: the Tenzir detection node owns NetFlow via its
`read_netflow` listener (lap-C part 2,
`flux/manifests/03-services/observability/tenzir/`), keeping the
`ingest.services.apocrathia.com:2055` / `10.100.1.96` pool IP for flow
exporters. The old goflow2 collector and its Grafana dashboard were removed
with it (SIEM lap C).

## Repro

1. UniFi → Settings → CyberSecure → Traffic Logging → NetFlow (IPFIX) enabled
   (v10, collector `ingest.services.apocrathia.com:2055`).
2. SSH to Gateway: `tcpdump -ni any udp port 2055` → no packets.
3. Cluster (at filing time, on goflow2): `Udp: InDatagrams` stayed flat
   except artificial probes; no flow records from the UXG `remote_ip`.
   Post-removal equivalent: the Tenzir `read_netflow` listener (lap-C part 2)
   shows no records from the UXG's IP.

## Acceptance

- Controller is no longer CK+ for this site; UXG is adopted on **UniFi OS
  Server** (or Official Hosting / UCK-Enterprise if chosen instead)
- Insights → Flows offers **All Traffic** (not blocked/threats-only stub)
- With NetFlow (IPFIX) enabled, Gateway `tcpdump` shows UDP/2055 toward
  `10.100.1.96` (or the configured collector)
- The flow collector exposes non-probe records labeled with the UXG as
  exporter — i.e. the Tenzir `read_netflow` listener (lap-C part 2) ingests
  flow records from the UXG. There is no Grafana collector dashboard since
  the goflow2 removal; flows are Tenzir-side.

## Feedback loop

- Gateway: `tcpdump -ni any udp port 2055` (must leave silence)
- Cluster: the Tenzir `read_netflow` intake (lap-C part 2) shows flow
  records from the UXG's exporter IP
- UniFi UI: Insights → Flows shows All Traffic after hosting change

## Implementation hint

Stage spare NUC with UniFi OS Server (self-hosted, free). Backup CK+, restore /
re-adopt UXG, then re-test IPFIX before spending time on the collector. Note: even on
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

Out of scope for this issue: ClickHouse top-talkers analytics over the
collected flows; SPAN/softflowd alternatives (valid escape hatch if UniFi
export stays dead after UOS Server).

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
exporter and the ingest path to the flow collector is up. With goflow2
removed (SIEM lap C), the confirming check is the Tenzir `read_netflow`
listener (lap-C part 2, same pool IP `10.100.1.96:2055`) showing flow
records from the UXG — there is no Grafana flows dashboard anymore. Close
on confirmation.

## Resolution (2026-09-21): flows live via manual NETFLOW section — stock export is controller-broken

Flows confirmed end-to-end: UXG → goflow2 (`10.100.1.96:2055`) →
Prometheus → Mimir → Grafana `goflow2-collector`. Series:
`goflow2_flow_traffic_packets_total{remote_ip="10.100.1.1"}`. The
remaining acceptance above is answered — but not the way anyone expected.
(That goflow2 → Mimir → Grafana chain was removed in SIEM lap C; the same
UXG → `10.100.1.96:2055` path now feeds the Tenzir `read_netflow`
listener, lap-C part 2.)

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
flow-accounting` (no resolving errors); the Tenzir `read_netflow`
   listener (lap-C part 2, `10.100.1.96:2055`) shows flow records from
   the UXG's exporter IP.

### Re-test trigger (vendor-fix check)

After every Network Application upgrade:
`grep -c NETFLOW /data/udapi-config/udapi-net-cfg.json` on the gateway.
Non-zero = renderer learned the feature — retire the runbook, move the
destination to the UI setting (raw IP), delete the workaround.

**Status: stays open** — flows run on a workaround that any config push
kills; closing waits on the vendor renderer fix.
