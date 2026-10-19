---
title: "alphaMountain integration"
description: "Enrich DNS, web, and network telemetry with real-time threat intelligence."
canonical: https://tenzir.com/integrations/alphamountain
source: https://tenzir.com/integrations/alphamountain.md
section: "Integrations"
---

# alphaMountain integration

> Enrich DNS, web, and network telemetry with real-time threat intelligence.

[alphaMountain](https://www.alphamountain.ai) provides AI-powered domain and IP reputation, URL classification, and threat intelligence through APIs and feeds. Tenzir brings that intelligence into the pipeline so you can enrich DNS, web, and network telemetry before it reaches the SIEM.

The alphaMountain package maps API and feed responses to OCSF [OSINT Inventory Info](https://schema.ocsf.io/classes/osint_inventory_info). This gives pipelines a common shape for indicator risk, reputation, confidence, categories, WHOIS, GeoIP, ASN, and DNS answer context.

## What you can do

* Fetch alphaMountain threat feeds on a schedule.
* Map threat intelligence to OCSF for downstream analytics.
* Keep an indicator lookup table fresh without per-event API calls.
* Enrich DNS, web, and network events while they are still moving.
* Route high-risk events to the SIEM and keep the full OCSF stream in a lake.
* Run live lookups during investigations or automation workflows.

## Prerequisites

To use this integration, you need alphaMountain API access and the alphaMountain package from the [Tenzir Library](https://app.tenzir.com/library). Store the license as a Tenzir secret before running production pipelines.

## Map threat intelligence to OCSF

Use the package to fetch the alphaMountain threat feed and translate it into OCSF OSINT Inventory Info events:

```tql
every 1h {
  alphamountain::threat::feed license=secret("alphamountain_license"),
    risk_min=8.5,
    risk_max=10.0
  alphamountain::ocsf::map
  ocsf_derive
  ocsf_cast
}
publish "ocsf"
```

The mapper preserves the alphaMountain score in `osint.reputation.base_score`, rounds it into `osint.risk_score`, and assigns OCSF reputation and severity fields. When an indicator ages out of a feed, the mapper emits a removal event so context can expire cleanly.

## Keep context fresh

Feed-based enrichment scales well because it avoids a live API call for every telemetry event. Populate an indicator-keyed lookup table from the feed:

```tql
every 1h {
  alphamountain::threat::feed license=secret("alphamountain_license")
  alphamountain::ocsf::map
  tenzir::osint::update_context max_age=30d
}
```

The `tenzir::osint::update_context` operator keeps the lookup table current with OCSF OSINT objects.

## Route enriched events

After the context is available, enrich the OCSF telemetry stream and route only high-risk matches to the SIEM:

```tql
subscribe "ocsf"
tenzir::osint::enrich
where osint?.map(x => x.severity_id >= 4).any()
publish "siem"
```

A second pipeline can keep the full-fidelity telemetry stream in a lake for retention and retrospective hunting:

```tql
subscribe "ocsf"
// Exclude OSINT Inventory Info events; the context already captures them.
where class_uid != 5021
publish "lake"
```

This pattern turns threat intelligence into a streaming decision layer. The SIEM receives cleaner, higher-value data, while lower-risk events remain available in long-term storage.

## Use live lookups

For investigations, call the live alphaMountain API operators and map the result to the same OCSF shape:

```tql
alphamountain::intelligence::hostname license=secret("alphamountain_license"),
  hostname="suspicious.example"
alphamountain::ocsf::map
ocsf_derive
ocsf_cast
```

Use live lookups when you need deeper context for a specific indicator, such as WHOIS, passive DNS, DGA probability, impersonation signals, DNS answers, GeoIP, ASN data, or shared infrastructure.

## See also

* [Install a package](../guides/packages/install-a-package.md)
* [Enrichment](../explanations/enrichment.md)
