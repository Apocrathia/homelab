# OpenCanary

OpenCanary is a network honeypot: a daemon that fakes vulnerable services and raises a JSON alert whenever an attacker interacts with them. This deployment exposes a fake NAS web login and an SSH server to the LAN and ships alerts to Loki.

> **Navigation**: [← Back to Security README](../README.md)

## Overview

This deployment includes:

- HTTP honeypot on port 80 serving a fake Synology NAS login page (`nasLogin` skin)
- SSH honeypot on port 22 that logs every login attempt
- JSON alerts on container stdout, ingested by Loki via alloy
- Cilium L2 LoadBalancer exposure with attacker source IPs preserved

## Exposed Honeypot Ports

LoadBalancer IP `10.100.1.98` (Cilium L2 announcement, `externalTrafficPolicy: Local` so alerts carry the attacker's real source IP):

| LB Port | Container Port | Service    | What triggers an alert                                       |
| ------- | -------------- | ---------- | ------------------------------------------------------------ |
| 80/TCP  | 8080           | HTTP login | POST to the fake NAS login form (logtype 3001)               |
| 22/TCP  | 2222           | SSH        | New connection (4000), version exchange (4001), login (4002) |

Container ports are `>1023` because the daemon drops to `nobody:nogroup` before binding; the LoadBalancer maps them back to attacker-expected standard ports.

## Configuration

- **Config file**: `opencanary.conf` is generated into the `opencanary-config` ConfigMap by kustomize and mounted read-only at `/etc/opencanaryd/opencanary.conf`; OpenCanary's first config search path.
- **The daemon exits at boot without a config file**; there is no default config in the image.
- **Service set**: HTTP + SSH only for v1. Other modules (ftp, telnet, mysql, redis, ...) are disabled by absence in the config.
- **SSH host keys**: generated on first start into `/var/tmp` (a Longhorn volume) so the host key fingerprint stays stable across pod restarts. A fresh key every restart makes repeat visitors suspicious.
- **`portscan` module stays off**: it tails `/var/log/kern.log`, which does not exist in the container.

See `helmrelease.yaml` and `opencanary.conf` for the complete configuration.

## Alerts

Alerts are single-line JSON objects on stdout (PyLogger console handler), ingested to Loki by the cluster log pipeline:

```bash
# Live alerts (every hit is a "real" alert)
kubectl -n opencanary logs deployment/opencanary -f
```

The [Dashboard](#dashboard) section renders these alerts in Grafana; for ad-hoc queries use the Loki selector `namespace=opencanary`.

### STIX push to OpenTAXII (`opencanary-stix-push`)

CronJob `opencanary-stix-push` (`stix-push-cronjob.yaml`, script
`stix_push.py` mounted from a ConfigMap) is the canary lane of the OpenTAXII
feed-sources [issue](../../../../../docs/issues/opentaxii-feed-sources.md):
every 15 minutes it queries Loki for attacker alerts (`logtype >= 2000`,
same selector as the dashboard) from the last 20 minutes, builds one STIX 2.1
indicator per alert, and POSTs it to the public-write `stix-feed` collection
on OpenTAXII; OpenCTI's taxii2 connector polls that collection hourly, so an
alert reaches OpenCTI within one polling cycle.

- **Indicator shape**: deterministic `uuid5` id over `utc_time|logtype|src_host`,
  pattern on the attacker source IP (`ipv4-addr`/`ipv6-addr` by family),
  `valid_from` = alert time, `indicator_types: ["malicious-activity"]`.
- **`logdata` is never read**: HTTP 3001 and SSH 4002 alerts carry
  attacker-submitted passwords; the indicator holds only source IP, logtype,
  and time.
- **Stateless and idempotent**: no PVC, no secrets (the push is anonymous,
  the collection has `is_public_write`), and the 20 min lookback overlapping
  the 15 min schedule makes re-seen alerts storage no-ops server-side
  (OpenTAXII skips inserts whose STIX id + version already exist).
- **Failure contract**: per-alert count-and-continue; the job exits non-zero
  on any push failure or skipped (malformed / source-less) alert, and
  `backoffLimit: 3` plus the next run's overlapping window retry both.

The daemon-side handler alternative (OpenCanary's `WebhookHandler` and
friends under `logger.kwargs.handlers` in `opencanary.conf`) stays unused:
the CronJob keeps the alert path decoupled from the honeypot process and
needs no `opencanary.conf` change.

Verify the lane:

```bash
# Job history (failedJobsHistoryLimit 3)
kubectl -n opencanary get jobs

# Last run: matched/pushed/failed counts
kubectl -n opencanary logs job/opencanary-stix-push-<timestamp>

# Trigger a manual run
kubectl -n opencanary create job --from=cronjob/opencanary-stix-push \
  opencanary-stix-push-manual

# Objects landed in the collection (see the opentaxii README)
kubectl exec -n opentaxii opentaxii-postgres-1 -- psql -U postgres -d opentaxii \
  -t -c "select count(*) from opentaxii_stixobject"

# Behavior test (no cluster access needed): fake Loki + fake TAXII
python3 flux/manifests/04-apps/security/opencanary/tests/test_stix_push.py
```

## Security Considerations

- **Intentionally not SSO-fronted** (`authentik.enabled: false`, no HTTPRoute): a honeypot must look like a plain, unauthenticated service.
- **No probes and no gatus**: any self-traffic hitting a honeypot port generates synthetic attacker noise. Health = container process running.
- **Hardened container**: read-only root filesystem, capabilities limited to `SETUID`/`SETGID` (needed only for the in-process drop to `nobody`), `/var/run` as an emptyDir for the twistd pidfile.
- **No secrets**: the honeypot holds no credentials. Any password submitted by an attacker is logged, never validated.

## Dashboard

`grafana/dashboard.json` ships "OpenCanary Alerts", a Grafana dashboard in the **Security** folder, managed by grafana-operator:

- Alerts (24h) stat + alert rate by logtype
- Top attacker source IPs (7d) bar gauge
- Raw alert JSON, newest first

Queries filter `logtype >= 2000`, so only attacker events count (3000-3003 HTTP, 4000-4002 SSH); 1000-series daemon/boot lines are excluded.

## Troubleshooting

```bash
# Pod status (should be Running)
kubectl -n opencanary get pods

# Startup logs: config load, module start, then silence until someone knocks
kubectl -n opencanary logs deployment/opencanary --tail=50

# LoadBalancer IP announcement
kubectl -n opencanary get svc opencanary-external

# Test the honeypot from inside the cluster (this fires a real alert)
kubectl -n opencanary run -it --rm curl-test --image=curlimages/curl -- curl -s http://opencanary.opencanary.svc.cluster.local:8080/
```

## References

- **[OpenCanary Documentation](https://opencanary.readthedocs.io/)** - Configuration reference
- **[thinkst/opencanary](https://github.com/thinkst/opencanary)** - Source code and issues
- **[thinkst/opencanary on Docker Hub](https://hub.docker.com/r/thinkst/opencanary)** - Container image
