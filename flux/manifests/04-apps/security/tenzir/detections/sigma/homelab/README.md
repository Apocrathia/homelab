# homelab sigma rules

Starter rules written against OCSF API Activity field paths so they
evaluate under `mapping="auto"` on the detection bus:

- [`k8s-audit-secret-created.yml`](./k8s-audit-secret-created.yml):
  `api.operation: create secrets`
- [`k8s-audit-pod-portforward.yml`](./k8s-audit-pod-portforward.yml):
  `api.operation: create pods/portforward`
