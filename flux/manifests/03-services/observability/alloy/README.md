# Grafana Alloy

Three Alloy releases live under this folder, one per subfolder:

- [`logs/`](./logs/) — release `alloy` (`alloy-system`): the shared log
  collector for pod logs, OTLP traces, and external syslog/CEF ingestion.
- [`tetragon/`](./tetragon/) — release `alloy-tetragon`
  (`alloy-tetragon-system`): tails the tetragon agents' export files into
  the Tenzir tetragon node.
- [`kube-audit/`](./kube-audit/) — release `alloy-kube-audit`
  (`alloy-kube-audit-system`): dual-writes the kube-apiserver audit log
  into Loki and Tenzir.

> **Navigation**: [← Back to Observability README](../README.md)
