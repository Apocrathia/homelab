---
title: "Add enrichment contexts"
canonical: https://tenzir.com/docs/tutorials/add-enrichment-contexts
source: https://tenzir.com/docs/tutorials/add-enrichment-contexts.md
section: "Docs"
---

# Add enrichment contexts

> A context is state, not code. Tenzir holds it, pipelines look things up in it, and somebody has to keep it current. This tutorial adds the Geo Open package next to the Amazon package from the earlier Development tutorials and enriches the OCSF Network Activity events from Onboard a data source with country and ASN data.

A context is state, not code. Tenzir holds it, pipelines look things up in it, and somebody has to keep it current. This tutorial adds the Geo Open package next to the Amazon package from the earlier Development tutorials and enriches the OCSF Network Activity events from [Onboard a data source](onboard-a-data-source.md) with country and ASN data.

Geo Open publishes daily country and ASN data from [CIRCL](https://www.circl.lu/), the Computer Incident Response Center Luxembourg. Two packages keep the two jobs apart. Amazon turns a VPC Flow Log line into OCSF, Geo Open owns the database and its refresh, and neither one has to know about the other.

## Declare the context

The manifest declares one GeoIP context, and that is all the package exposes:

geo\_open/package.yaml

```yaml
id: geo_open
name: Geo Open
author: Tenzir
author_icon: https://raw.githubusercontent.com/tenzir/library/main/.tenzir.svg
package_icon: https://raw.githubusercontent.com/tenzir/library/main/geo_open/package.svg


description: |
  Free IP geolocation using Geo Open MMDB databases from CIRCL, the Computer
  Incident Response Center Luxembourg. Geo Open provides daily snapshots of
  IP-to-country and IP-to-ASN mappings in MaxMind database format, offering a
  privacy-respecting alternative to commercial geolocation services.


  This package provides a GeoIP context for IP enrichment. The examples show
  how to fetch Geo Open MMDB snapshots and enrich IP addresses with
  `context_enrich`.


categories:
  - contexts


contexts:
  geo-open:
    type: geoip
    description: GeoIP context for country and optional ASN lookups using Geo Open data.
```

Installing the package creates `geo-open`. Creation arguments apply only at that moment, so editing them later leaves an existing context unchanged. Our guide on [adding contexts](../guides/packages/add-contexts.md#define-contexts-in-the-manifest) lists the context types and manifest options.

## Fill the context

Geo Open distributes a precompiled MMDB file, which the GeoIP context stores as it is. One pipeline fetches it and loads it:

```tql
from_http "https://cra.circl.lu/opendata/geo-open/mmdb-country-asn/latest.mmdb" {
  read_all binary=true
}
write_all data
context_load "geo-open"
```

The middle two lines look redundant, and they are a round trip: `from_http` needs a parser to hand it events, so `read_all binary=true` wraps the whole download in one event, and `write_all data` unwraps it into the byte stream that `context_load` consumes.

The MMDB file already encodes IP networks, country fields, and ASN fields, so it *is* the context value, and the GeoIP context needs the file itself to match longest prefixes. Decoding it into one event per network and rebuilding a lookup table would be slower and less accurate.

Other context types work the other way around. A `lookup-table` context has no precompiled file, so the pipeline shapes each entry and hands a stable key to `context_update`:

```tql
from_http "https://inventory.example.net/assets.json" {
  read_json
}
asset = {
  uid: move id,
  owner: move team,
  environment: move environment,
}
context_update "assets", key=ip, value=asset
```

The package ships the Geo Open loader as an example, wrapped in `every 24h` so the database stays current:

geo\_open/examples/update-geo-open-context.tql

```tql
---
name: Update Geo Open context
description: |
  Fetches the latest country+ASN MMDB file daily and loads it into the Geo Open
  context.
---


every 24h {
  from_http "https://cra.circl.lu/opendata/geo-open/mmdb-country-asn/latest.mmdb" {
    read_all binary=true
  }
  write_all data
  context_load "geo-open"
}
```

Keeping the download in its own pipeline means a slow or failed fetch never stalls enrichment. For a GeoIP context, `context_inspect` does not list one event per stored network, so check the load with `context_list` and then look up an address you know.

## Enrich events

Apply the context to both endpoints of an OCSF Network Activity event:

geo\_open/examples/enrich-ocsf-network-activity.tql

```tql
---
name: Enrich OCSF Network Activity with Geo Data
description: |
  Enriches OCSF Network Activity events with raw Geo Open context data.
---


from {src_endpoint: {ip: 1.1.1.1}, dst_endpoint: {ip: 8.8.8.8}},
     {src_endpoint: {ip: 9.9.9.9}, dst_endpoint: {ip: 208.67.222.222}}
context_enrich "geo-open", key=src_endpoint?.ip, into=src_endpoint.geo
context_enrich "geo-open", key=dst_endpoint?.ip, into=dst_endpoint.geo
```

In the Amazon workflow, place these operations after OCSF mapping:

```tql
subscribe "ocsf"
where category_uid == 4
context_enrich "geo-open", key=src_endpoint?.ip, into=src_endpoint.geo
context_enrich "geo-open", key=dst_endpoint?.ip, into=dst_endpoint.geo
publish "ocsf-geo"
```

A miss leaves the target field absent. The `?` on the key keeps that silent when an event has only one endpoint IP, which happens often enough that a warning per event would drown out real ones.

## Leave the schedule to the user

The refresh above ships as an example, not as a pipeline that installation starts. Users read the URL and see what the pipeline writes before they run it, and they point a copy at a pinned snapshot or an internal mirror by editing one line. The URL therefore never enters the manifest, and the package needs no installation input at all.

## Test the context lifecycle

Context tests need the `node` fixture, and they only pass in order. Name the files so they sort the way they have to run:

* geo\_open/tests/download/

  * test.yaml
  * 01-load.tql
  * 01-load.txt
  * 02-enrich.tql
  * 02-enrich.txt

Configure one shared fixture:

geo\_open/tests/download/test.yaml

```yaml
fixtures:
  - node
suite: download
timeout: 120
skip: requires downloading MMDB from external server
```

Pin a database snapshot in the first test so the expected data does not change:

geo\_open/tests/download/01-load.tql

```tql
// Pick one DB for deterministic results.
let $mmdb = "https://cra.circl.lu/opendata/geo-open/mmdb-country-asn/2025-12-03-GeoOpen-Country-ASN.mmdb"


from_http $mmdb {
  read_all binary=true
}
write_all data
context_load "geo-open"
```

The second test consumes the context state left by the first:

geo\_open/tests/download/02-enrich.tql

```tql
from {src_endpoint: {ip: 1.1.1.1}}
context_enrich "geo-open", key=src_endpoint.ip, into=src_endpoint.geo
where src_endpoint.geo? != null
select enriched=true
```

Run the complete suite in lexical order when network access is available:

```sh
uvx tenzir-test geo_open/tests/download --run-skipped --passthrough
uvx tenzir-test geo_open/tests/download --run-skipped --update
uvx tenzir-test geo_open/tests/download --run-skipped
```

Offline runs skip the suite, because it downloads a file. Keep the numeric prefixes when you add another stage, so the shared fixture always sees the same order.

## Install and verify the package

Install Amazon and Geo Open side by side, by placing both directories where Tenzir looks for packages:

* /opt/tenzir/etc/tenzir/

  * packages/

    * amazon/

      * …

    * geo\_open/

      * …

  * tenzir.yaml

Verify the context declaration:

```tql
context_list
where name == "geo-open"
```

Run `examples/update-geo-open-context.tql`, then verify a lookup:

```tql
from {ip: 1.1.1.1}
context_enrich "geo-open", key=ip, into=geo
where geo? != null
```

## See it end to end

Both packages installed, one pipeline takes a raw VPC Flow Log line to a geolocated OCSF event. Start from the line, which describes a host talking to a public DNS resolver:

```text
2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 8.8.8.8 51514 53 17 2 148 1767225600 1767225660 ACCEPT OK
```

The Amazon package turns it into OCSF, and Geo Open adds context to both endpoints:

```tql
from {
  message: "2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 8.8.8.8 51514 53 17 2 148 1767225600 1767225660 ACCEPT OK",
}
amazon::vpc_flow::ocsf::normalize message
context_enrich "geo-open", key=src_endpoint?.ip, into=src_endpoint.geo
context_enrich "geo-open", key=dst_endpoint?.ip, into=dst_endpoint.geo
```

The result carries the mapped event plus the two lookups, highlighted below:

```tql
{
  metadata: {version: "1.9.0", product: {name: "Amazon VPC", vendor_name: "AWS"}},
  time: 2026-01-01T00:00:00Z,
  category_uid: 4,
  class_uid: 4001,
  activity_id: 6,
  src_endpoint: {
    ip: 10.0.1.10,
    port: 51514,
    geo: null,
  },
  dst_endpoint: {
    ip: 8.8.8.8,
    port: 53,
    geo: {
      country: {
        iso_code: "US",
        AutonomousSystemNumber: "15169",
        AutonomousSystemOrganization: "GOOGLE",
      },
    },
  },
  traffic: {bytes: 148, packets: 2},
  raw_data: "2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 8.8.8.8 …",
}
```

Everything else came from the Amazon package. The private source address shows the miss case: Geo Open has no entry for `10.0.1.10`, so that lookup contributes nothing and the pipeline continues.

The shape under `geo` comes from the MMDB rather than from OCSF, which is why it sits under a field of its own. Mapping it into `src_endpoint.location` and `src_endpoint.autonomous_system`, for which OCSF has attributes, is a separate decision that belongs to whoever consumes the events.

Two packages now cover the path from an opaque line to a geolocated OCSF event, and either one can change without touching the other. Return to [Onboard a data source](onboard-a-data-source.md) for the parsing, mapping, and packaging contracts that produced those events.
