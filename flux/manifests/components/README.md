# Flux Components

Shared [kustomize
components](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/components/)
consumed by app kustomizations via their `components:` field. Not a Flux
layer: nothing here is applied directly, and the root `kustomization.yaml`
does not reference it. Components are pulled in relatively by each consumer.

| Component      | Renders                                                             |
| -------------- | ------------------------------------------------------------------- |
| `cnpg-backup/` | CNPG barman backup wiring (ScheduledBackup, secret, Cluster stanza) |

> **Navigation**: [← Back to Flux Manifests README](../README.md)
