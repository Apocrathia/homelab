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

- **Config file**: `opencanary.conf` is generated into the `opencanary-config` ConfigMap by kustomize and mounted read-only at `/etc/opencanaryd/opencanary.conf` — OpenCanary's first config search path.
- **The daemon exits at boot without a config file**; there is no default config in the image.
- **Service set**: HTTP + SSH only for v1. Other modules (ftp, telnet, mysql, redis, ...) are disabled by absence in the config.
- **SSH host keys**: generated on first start into `/var/tmp` (a 1Gi Longhorn volume) so the host key fingerprint stays stable across pod restarts. A fresh key every restart makes repeat visitors suspicious.
- **`portscan` module stays off**: it tails `/var/log/kern.log`, which does not exist in the container.

See `helmrelease.yaml` and `opencanary.conf` for the complete configuration.

## Alerts

Alerts are single-line JSON objects on stdout (PyLogger console handler), ingested to Loki by the cluster log pipeline:

```bash
# Live alerts (every hit is a "real" alert)
kubectl -n opencanary logs deployment/opencanary -f
```

There is no dashboard UI; query Loki/Grafana for `namespace=opencanary`.

### Future: MISP/OpenCTI feed

OpenCanary ships `WebhookHandler`, `SlackHandler`, `TeamsHandler`, SMTP, socket, and hpfeeds handlers — all configured under `logger.kwargs.handlers` in `opencanary.conf`. When the security stack grows, add a `WebhookHandler` pointing at a receiver that normalizes the JSON into MISP sightings or OpenCTI indicators instead of (or alongside) the console handler.

## Security Considerations

- **Intentionally not SSO-fronted** (`authentik.enabled: false`, no HTTPRoute): a honeypot must look like a plain, unauthenticated service.
- **No probes and no gatus**: any self-traffic hitting a honeypot port generates synthetic attacker noise. Health = container process running.
- **Hardened container**: read-only root filesystem, capabilities limited to `SETUID`/`SETGID` (needed only for the in-process drop to `nobody`), `/var/run` as an emptyDir for the twistd pidfile.
- **No secrets**: the honeypot holds no credentials. Any password submitted by an attacker is logged, never validated.

## Troubleshooting

```bash
# Pod status (should be Running, 1 replica)
kubectl -n opencanary get pods

# Startup logs — config load, module start, then silence until someone knocks
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
