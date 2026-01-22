# SNMP Monitoring

Prometheus scrapes SNMP devices (UPS, PDU, switches) through snmp-exporter.

## Files

| File                 | What it does                                           |
| -------------------- | ------------------------------------------------------ |
| `snmp.yml`           | Generated modules - don't edit, run `mibs/generate.sh` |
| `ups-01.yaml`        | Scrapes the APC UPS                                    |
| `pdu-01.yaml`        | Scrapes the APC PDU                                    |
| `kustomization.yaml` | Builds the ConfigMap from snmp.yml                     |
| `mibs/`              | MIB files and the generator                            |

## Modules

| Module     | For                 | Auth                     |
| ---------- | ------------------- | ------------------------ |
| `apc_ups`  | Smart-UPS, Symmetra | snmpv3 (SHA/AES)         |
| `apc_pdu`  | Older rack PDUs     | snmpv3-nopriv (MD5 only) |
| `apc_pdu2` | Newer rack PDUs     | snmpv3                   |
| `unifi`    | UniFi gear          | not set up yet           |

## Adding a device

Copy an existing ScrapeConfig, change the target and module:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: ScrapeConfig
metadata:
  name: my-device
  namespace: prometheus-system
  labels:
    release: kube-prometheus-stack
spec:
  staticConfigs:
    - targets:
        - my-device.example.com
      labels:
        job: snmp
        module: apc_ups
        device_type: ups
  scrapeInterval: 60s
  scrapeTimeout: 30s
  metricsPath: /snmp
  params:
    module:
      - apc_ups
    auth:
      - snmpv3
  relabelings:
    - sourceLabels: [__address__]
      targetLabel: __param_target
    - sourceLabels: [__param_target]
      targetLabel: instance
    - targetLabel: __address__
      replacement: snmp-exporter.prometheus-system.svc:9116
```

Add it to `kustomization.yaml`, then `kubectl apply -k .`

## Auth profiles

These live in 1Password and sync to the `snmp-secrets` secret.

| Profile         | Level      | Auth | Priv | When to use                                           |
| --------------- | ---------- | ---- | ---- | ----------------------------------------------------- |
| `snmpv3`        | authPriv   | SHA  | AES  | Default for modern devices                            |
| `snmpv3-legacy` | authPriv   | MD5  | DES  | Old firmware that doesn't support SHA/AES             |
| `snmpv3-nopriv` | authNoPriv | MD5  | none | When encryption doesn't work (looking at you, AP7801) |

## Regenerating modules

After editing `mibs/generator.yml` or adding MIB files:

```bash
cd mibs/
./generate.sh
```

See `mibs/README.md` for the full process.

## Troubleshooting

Test if snmp-exporter can reach something:

```bash
kubectl port-forward -n prometheus-system svc/snmp-exporter 9116:9116
curl "http://localhost:9116/snmp?target=DEVICE&module=MODULE&auth=AUTH"
```

Test SNMP directly from your machine:

```bash
snmpwalk -v3 -l authPriv -u USER -a SHA -A PASS -x AES -X PRIV DEVICE OID
```

Check Prometheus targets at Status → Targets, look for `scrapeconfig/prometheus-system/*` entries.
