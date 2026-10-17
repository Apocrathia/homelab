---
title: "Prometheus integration"
description: "Send metric events to Prometheus-compatible Remote Write receivers, including Prometheus, Grafana Mimir, Cortex, Thanos Receive, and VictoriaMetrics."
canonical: https://tenzir.com/integrations/prometheus
source: https://tenzir.com/integrations/prometheus.md
section: "Integrations"
---

# Prometheus integration

> Send metric events to Prometheus-compatible Remote Write receivers, including Prometheus, Grafana Mimir, Cortex, Thanos Receive, and VictoriaMetrics.

[Prometheus](https://prometheus.io/) is an open-source monitoring system and time-series database. Tenzir can send metric events to Prometheus-compatible Remote Write receivers, including Prometheus, Grafana Mimir, Cortex, Thanos Receive, and VictoriaMetrics.

Use [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md) with `shape="prometheus"` and [`to_prometheus`](https://tenzir.com/docs/reference/operators/to_prometheus.md) to send Tenzir node metrics to a Prometheus Remote Write endpoint. This integration doesn’t expose a scrape endpoint for the Prometheus pull model.

## Prerequisites

Before you send metrics, configure your receiver to accept Remote Write traffic. For Prometheus, start the server with the Remote Write receiver enabled and use the `/api/v1/write` endpoint.

Store endpoint URLs and authentication headers as [secrets](../explanations/secrets.md) when they contain credentials.

## Examples

### Send canonical metric events

Send events that already use the default metric shape expected by [`to_prometheus`](https://tenzir.com/docs/reference/operators/to_prometheus.md):

```tql
from {
  metric: "http_requests_total",
  value: 42,
  timestamp: 2026-05-15T10:00:00Z,
  labels: {
    method: "GET",
    status: 200,
  },
}
to_prometheus "https://prometheus.example/api/v1/write"
```

### Export Tenzir node metrics

Convert live Tenzir node metrics to Prometheus samples:

```tql
metrics live=true, shape="prometheus"
to_prometheus "https://prometheus.example/api/v1/write"
```

### Add authentication headers

Pass additional HTTP headers when your receiver requires authentication. Header values are resolved as secrets.

```tql
metrics live=true, shape="prometheus"
to_prometheus "prometheus-remote-write-url",
  headers={Authorization: "prometheus-remote-write-token"}
```

## See Also

* [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md)
* [`to_prometheus`](https://tenzir.com/docs/reference/operators/to_prometheus.md)
* [Collect metrics](../guides/observability/collect-metrics.md)
