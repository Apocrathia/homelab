---
title: "Wazuh integration"
description: "Collects security telemetry and runs detections."
canonical: https://tenzir.com/integrations/wazuh
source: https://tenzir.com/integrations/wazuh.md
section: "Integrations"
---

# Wazuh integration

> Collects security telemetry and runs detections.

[Wazuh](https://wazuh.com/) is an open source XDR and SIEM platform. Tenzir can forward events to Wazuh over Syslog and query Wazuh alerts from the Wazuh indexer API.

Wazuh

## Configure Wazuh to receive Syslog

Wazuh can receive Syslog messages on the Wazuh server with a `<remote>` configuration in `/var/ossec/etc/ossec.conf`. For example, this configuration accepts TCP Syslog from a Tenzir node at `10.0.0.5`:

/var/ossec/etc/ossec.conf

```xml
<ossec_config>
  <remote>
    <connection>syslog</connection>
    <port>514</port>
    <protocol>tcp</protocol>
    <allowed-ips>10.0.0.5</allowed-ips>
    <local_ip>0.0.0.0</local_ip>
  </remote>
</ossec_config>
```

Restart the Wazuh manager after changing the configuration:

```bash
systemctl restart wazuh-manager
```

See Wazuh’s [Syslog server documentation](https://documentation.wazuh.com/current/user-manual/capabilities/log-data-collection/syslog.html) for the complete Wazuh configuration. For Wazuh Cloud, Wazuh documents a [relay pattern](https://documentation.wazuh.com/current/cloud-service/your-environment/send-syslog-data.html) where rsyslog or Logstash receives Syslog on an endpoint that runs a Wazuh agent.

## Examples

### Send events to Wazuh over Syslog

Use [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md) with [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md) to forward events to the Wazuh manager. This keeps Wazuh in the analysis path, so Wazuh decoders and rules can process the event stream.

```tql
subscribe "detections"
payload = this.print_json(strip_null_fields=true)
hostname = "tenzir-node"
app_name = "tenzir"
message = payload
to_tcp "wazuh-manager.example.com:514" {
  write_syslog
}
```

Replace `wazuh-manager.example.com` with the Wazuh manager host. If Wazuh listens on a different port, replace `514` with that port.

Wazuh alerting and dashboards depend on matching decoders and rules. When you send structured JSON in the Syslog message body, configure Wazuh’s [JSON decoder](https://documentation.wazuh.com/current/user-manual/ruleset/decoders/json-decoder.html) or a custom decoder for the event shape that you forward from Tenzir.

### Query Wazuh alerts from the indexer

Wazuh stores alerts in `wazuh-alerts-*` indices and, when archives are enabled, raw archived events in `wazuh-archives-*` indices. You can query these indices through the Wazuh indexer API with [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md):

```tql
let $auth = f"{secret("WAZUH_INDEXER_USER")}:{secret("WAZUH_INDEXER_PASSWORD")}"
let $headers = {
  "Authorization": f"Basic {$auth.encode_base64()}",
  "Content-Type": "application/json",
}
let $body = {
  size: 100,
  query: {match_all: {}},
  sort: [{"@timestamp": {order: "desc"}}],
}


from_http "https://wazuh-indexer.example.com:9200/wazuh-alerts-*/_search",
  headers=$headers,
  body=$body {
  read_json
}
unroll hits.hits
this = hits.hits._source
```

Replace `wazuh-indexer.example.com` with the Wazuh indexer host and store the indexer credentials as Tenzir secrets. See the Wazuh documentation for [index names](https://documentation.wazuh.com/current/user-manual/wazuh-indexer/wazuh-indexer-indices.html) and [indexer API authentication](https://documentation.wazuh.com/current/user-manual/indexer-api/getting-started.html).

For larger exports, use the same request-record pagination pattern as OpenSearch. The Wazuh indexer response includes the `sort` values for each hit when you request a stable sort. Return a request record from `paginate` to add `search_after` for the next page:

```tql
let $auth = f"{secret("WAZUH_INDEXER_USER")}:{secret("WAZUH_INDEXER_PASSWORD")}"
let $headers = {
  "Authorization": f"Basic {$auth.encode_base64()}",
  "Content-Type": "application/json",
}


from_http "https://wazuh-indexer.example.com:9200/wazuh-alerts-*/_search",
  headers=$headers,
  body={
    size: 1000,
    query: {match_all: {}},
    sort: [{"@timestamp": "asc"}, {"_id": "asc"}],
  },
  paginate=(x => {
    body: {
      size: 1000,
      query: {match_all: {}},
      sort: [{"@timestamp": "asc"}, {"_id": "asc"}],
      search_after: x.hits.hits[-1].sort,
    },
  } if x.hits.hits != []) {
  read_json
}
unroll hits.hits
this = hits.hits._source
```

Keep `unroll` after [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md) so the pagination lambda can inspect the whole search response. Follow-up requests inherit the `POST` method and headers from the first request and replace only the request body.

### Write directly to the Wazuh indexer

The Wazuh indexer exposes an OpenSearch-compatible API. You can use [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md) to write already-shaped documents to a custom index:

```tql
subscribe "detections"
to_opensearch "https://wazuh-indexer.example.com:9200",
  action="create",
  index="tenzir-detections",
  user=secret("WAZUH_INDEXER_USER"),
  passwd=secret("WAZUH_INDEXER_PASSWORD")
```

Use this path for custom index storage or other indexer-specific workflows. It bypasses the Wazuh manager, so Wazuh decoders and rules won’t analyze those events as incoming log data.

## See Also

* [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)
* [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md)
* [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md)
* [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md)
* [Fetch via HTTP and APIs](../guides/collect/fetch-via-http-and-apis.md)
* [OpenSearch](opensearch.md)
* [Syslog](syslog.md)
