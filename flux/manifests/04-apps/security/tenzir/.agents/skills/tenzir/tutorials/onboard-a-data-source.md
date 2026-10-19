---
title: "Onboard a data source"
canonical: https://tenzir.com/docs/tutorials/onboard-a-data-source
source: https://tenzir.com/docs/tutorials/onboard-a-data-source.md
section: "Docs"
---

# Onboard a data source

> Onboarding a data source means turning one product’s output into events that every later stage of the data lifecycle can use. Parsing produces structured events that keep the product’s own field names, and mapping translates them into a target schema, which for us means OCSF first.

Onboarding a data source means turning one product’s output into events that every later stage of the [data lifecycle](learn-the-data-lifecycle.md) can use. **Parsing** produces structured events that keep the product’s own field names, and **mapping** translates them into a target schema, which for us means [OCSF](../explanations/normalization.md) first.

This tutorial starts with five log lines and ends with an installable [package](../explanations/packages.md). You build a parser, then a mapper, then assemble both into the package. We use Amazon VPC Flow Logs, and everything here applies to any product that arrives as text.

## Parse the log lines

Getting the parsing right on a single line is the whole problem. Work it out in a pipeline first, where every intermediate result is visible, then move it into an operator that everyone can call.

### Look at the data

Amazon writes VPC Flow Logs to S3 as gzipped text, one record per line:

```text
2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 198.51.100.20 51514 443 6 10 840 1767225600 1767225660 ACCEPT OK
2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 93.184.216.34 44231 80 6 4 216 1767225601 1767225661 REJECT OK
2 123456789012 eni-0a1b2c3d4e5f67890 10.0.2.20 198.51.100.30 51515 443 6 12 980 1767225720 1767225780 ACCEPT OK
2 123456789012 eni-0a1b2c3d4e5f67890 172.31.0.5 10.0.1.10 53 40194 17 2 148 1767225725 1767225725 ACCEPT OK
2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 198.51.100.20 51514 443 6 0 0 1767225780 1767225840 ACCEPT NODATA
```

Every line is 14 space-separated fields in an order Amazon documents: version, account, interface, the two addresses, the two ports, protocol, packets, bytes, start, end, action, and status. Position carries all the meaning. `443` is a port because it sits seventh, `6` means TCP, and the two long numbers are Unix epochs.

`NODATA` in the last line means Amazon captured no traffic in that window, so its zero counters are not measurements. A `-` appears wherever Amazon cannot fill a field.

### Parse one line

Take the first line into a pipeline, split it on the documented field order with `parse_ssv`, and turn the two epochs into timestamps:

```tql
from {
  message: "2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 198.51.100.20 51514 443 6 10 840 1767225600 1767225660 ACCEPT OK",
}
vpc_flow = message.parse_ssv(
  header="version account_id interface_id srcaddr dstaddr srcport dstport protocol packets bytes start end action log_status",
  null_value="-",
)
vpc_flow.start = vpc_flow.start.seconds().from_epoch()
vpc_flow.end = vpc_flow.end.seconds().from_epoch()
```

```tql
{
  message: "2 123456789012 eni-0a1b2c3d4e5f67890 …",
  vpc_flow: {
    version: 2,
    account_id: 123456789012,
    interface_id: "eni-0a1b2c3d4e5f67890",
    srcaddr: 10.0.1.10,
    dstaddr: 198.51.100.20,
    srcport: 51514,
    dstport: 443,
    protocol: 6,
    packets: 10,
    bytes: 840,
    start: 2026-01-01T00:00:00Z,
    end: 2026-01-01T00:01:00Z,
    action: "ACCEPT",
    log_status: "OK",
  },
}
```

Addresses are `ip` values, ports and counters are numbers, and `start` and `end` are timestamps. The `parse_ssv` call produced the fields, and the last two lines produced the types. Both halves are necessary: `where vpc_flow.start > now() - 1h` needs a `time`, and `where vpc_flow.srcaddr in 10.0.0.0/8` needs an `ip`.

Cleaning belongs to parsing

Parsing owns the types. It also owns the `-` that Amazon writes for a field it cannot fill, which `null_value="-"` handled above, along with the placeholders other products emit such as `"None"` and `"N/A"`, strings that should be numbers or durations, and values that need trimming or a default. Our guide on [cleaning up values](../guides/parse/clean-up-values.md) works through each conversion.

Parsing keeps the source’s own vocabulary. The field names are still Amazon’s, and the `NODATA` record’s zero counters stay zeroes, because the parser reports what the source said. The schema decision comes later, which is what lets the same parsing feed OCSF today and something else tomorrow.

### Create the parser

That pipeline works only where it is typed. A colleague who needs VPC Flow Logs copies the `parse_ssv` call and the two timestamp conversions, and a header fix then has to reach every copy.

Move those lines into a user-defined operator. The file path becomes the operator name, so `operators/vpc_flow/parse_v2.tql` is `amazon::vpc_flow::parse_v2`. Start with what goes in and out:

amazon/operators/vpc\_flow/parse\_v2.tql

```tql
---
description: |
  Parses AWS VPC Flow Logs in the default v2 format (14 fields). The operator
  reads the first field and writes the parsed record to the second.
args:
  positional:
    - name: log
      type: field
      description: The field holding the VPC Flow Log line.
    - name: vpc_flow
      type: field
      description: The field that receives the parsed record.
---
```

The operator takes the field it reads and the field it writes, in that order, so a call reads from left to right. The body is the pipeline code with `$log` and `$vpc_flow` in place of the field names:

amazon/operators/vpc\_flow/parse\_v2.tql

```tql
$vpc_flow = $log.parse_ssv(
  header=amazon::$vpc_flow_v2_header,
  null_value="-",
)
// AWS account IDs are 12-digit strings, and `parse_ssv` infers an integer
// that drops leading zeroes.
$vpc_flow.account_id = $vpc_flow.account_id?.string().pad_start(12, "0")
// Convert Unix epoch seconds to timestamps.
$vpc_flow.start = $vpc_flow.start?.seconds().from_epoch()
$vpc_flow.end = $vpc_flow.end?.seconds().from_epoch()
```

The header moved to `constants.tql` as `amazon::$vpc_flow_v2_header`, which a pipeline with an unsupported layout can pass to a plain `parse_ssv` call.

Each layout gets its own operator, so the 24-field v7 format is `amazon::vpc_flow::parse_v7_ecs`. One more operator classifies a line and delegates to the parser that fits, which keeps every caller free of format logic:

amazon/operators/vpc\_flow/parse.tql

```tql
---
description: |
  Parses a VPC Flow Log line in any layout the package supports.
  Classifies the exact layout and delegates to the matching versioned parser.
  The output is `null` when the line matches no supported layout. Callers that
  know the layout can invoke that parser directly.
args:
  positional:
    - name: log
      type: field
      description: The field holding the VPC Flow Log line.
    - name: vpc_flow
      type: field
      description: The field that receives the parsed record.
---


// Classify exact known layouts instead of trusting the version token alone,
// because custom formats can share it.
if $log.starts_with("2 ") and $log.split(" ").length() == 14 {
  amazon::vpc_flow::parse_v2 $log, $vpc_flow
} else if $log.starts_with("7 ") and $log.split(" ").length() == 24 {
  amazon::vpc_flow::parse_v7_ecs $log, $vpc_flow
} else {
  $vpc_flow = null
}
```

Each branch identifies one exact layout, matching the version token together with the field count, and the package grows a branch per layout it learns. The final `else` yields `null`, which tells a caller that the line matches no supported layout.

Parsing any supported layout is now one call. It reads `message` and writes the parsed record to `vpc_flow`, because the caller chooses where the output lands:

```tql
from {
  message: "2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 198.51.100.20 51514 443 6 10 840 1767225600 1767225660 ACCEPT OK",
}
amazon::vpc_flow::parse message, vpc_flow
```

```tql
{
  message: "2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 198.51.100.20 51514 443 6 10 840 1767225600 1767225660 ACCEPT OK",
  vpc_flow: {
    version: 2,
    account_id: "123456789012",
    interface_id: "eni-0a1b2c3d4e5f67890",
    srcaddr: 10.0.1.10,
    dstaddr: 198.51.100.20,
    srcport: 51514,
    dstport: 443,
    protocol: 6,
    packets: 10,
    bytes: 840,
    start: 2026-01-01T00:00:00Z,
    end: 2026-01-01T00:01:00Z,
    action: "ACCEPT",
    log_status: "OK",
  },
}
```

That is the parsing layer finished: Amazon’s own field names, with `ip`, `port`, and `time` types, ready for any pipeline in the estate. One value improved on the inline version, because the operator pads `account_id` back to the 12 digits that `parse_ssv` had inferred as a number. Our guide on [adding operators](../guides/packages/add-operators.md) covers frontmatter, arguments, and the rules for operators that need scratch state.

## Map to OCSF

Parsing kept Amazon’s vocabulary. Mapping translates it into a target schema, and VPC Flow Logs describe network connections, so they become [OCSF Network Activity](https://schema.ocsf.io/1.9.0/classes/network_activity). Our guide on [mapping to OCSF](../guides/normalize/map-to-ocsf.md) covers choosing a class and working through the attribute groups.

### Create the mapper

The parser established what an operator looks like, so the mapper starts as one. It follows the same contract, with an input that is already structured:

amazon/operators/vpc\_flow/ocsf/map.tql

```tql
---
description: |
  AWS VPC Flow Log events → OCSF Network Activity (class 4001).
  Transforms parsed VPC Flow Log records into OCSF-compliant Network Activity
  events with support for traffic path, flow direction, and security control
  dispositions.
  The operator consumes the source record: what it maps becomes OCSF, and what
  it cannot map becomes `unmapped` inside the OCSF event.
args:
  positional:
    - name: vpc_flow
      description: The parsed VPC Flow Log record to read.
      type: field
    - name: ocsf
      description: The OCSF event to build.
      type: field
---


// --- OCSF: shared context attributes ----------
// Every event carries the product identity, whatever its class.


$ocsf.metadata = {
  version: "1.9.0",
  product: {
    name: "Amazon VPC",
    vendor_name: "AWS",
    feature: {
      name: "Flow Logs",
    },
  },
}
$ocsf.severity_id = 1


// --- Unparsed payloads ------------------------


if $vpc_flow == null {
  // Nothing parsed the payload, so all we can say is that an event happened.
  @name = "ocsf.base_event"
  $ocsf.category_uid = 0
  $ocsf.class_uid = 0
  $ocsf.activity_id = 0
} else {
  amazon::vpc_flow::ocsf::events::network_activity $vpc_flow, $ocsf
}


// --- Finalize ---------------------------------
// Both branches end here: the event type derives from what the arm set, and
// whatever the mapping did not consume becomes the residue.


$ocsf.type_uid = $ocsf.class_uid * 100 + $ocsf.activity_id
$ocsf.unmapped = move $vpc_flow
```

Reading one field and writing another means the two can never be the same field, so the body needs no snapshot and every line names its side, as in `$ocsf.start_time = move $vpc_flow.start?`.

Three things bracket the class-specific work. The product identity and the severity come first, because every class carries them. A `null` input, which is what `amazon::vpc_flow::parse` yields for an unknown layout, becomes an OCSF Base Event, so no line is dropped. And the closing statements derive `type_uid` from whichever arm ran, then report the residue.

The mapper consumes the whole source record. What it maps becomes OCSF, and what it cannot map becomes `unmapped` inside the OCSF event, so the residue travels with the thing it belongs to. That leaves the caller one decision, provenance, because only the caller knows which representation is worth keeping. Parsing and mapping a line therefore takes three calls:

```tql
from {
  message: "2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 198.51.100.20 51514 443 6 10 840 1767225600 1767225660 ACCEPT OK",
}
amazon::vpc_flow::parse_v2 message, vpc_flow
amazon::vpc_flow::ocsf::map vpc_flow, ocsf
this = {
  ...ocsf,
  raw_data: message,
  raw_data_size: message.length_bytes(),
}
```

```tql
{
  metadata: {
    version: "1.9.0",
    product: {
      name: "Amazon VPC",
      vendor_name: "AWS",
      feature: {
        name: "Flow Logs",
      },
      version: "2",
    },
    profiles: [
      "cloud",
      "security_control",
    ],
  },
  severity_id: 1,
  category_uid: 4,
  class_uid: 4001,
  cloud: {
    account: {
      uid: "123456789012",
    },
    region: null,
    zone: null,
    provider: "AWS",
  },
  start_time: 2026-01-01T00:00:00Z,
  end_time: 2026-01-01T00:01:00Z,
  time: 2026-01-01T00:00:00Z,
  duration: 60000,
  traffic: {
    bytes: 840,
    packets: 10,
  },
  connection_info: {
    protocol_num: 6,
    tcp_flags: null,
    boundary_id: null,
    protocol_ver_id: 4,
  },
  status_code: "OK",
  src_endpoint: {
    port: 51514,
    svc_name: null,
    interface_uid: "eni-0a1b2c3d4e5f67890",
    ip: 10.0.1.10,
  },
  dst_endpoint: {
    port: 443,
    svc_name: null,
    ip: 198.51.100.20,
  },
  activity_id: 6,
  action_id: 1,
  disposition_id: 1,
  type_uid: 400106,
  unmapped: {},
  raw_data: "2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 198.51.100.20 51514 443 6 10 840 1767225600 1767225660 ACCEPT OK",
  raw_data_size: 111,
}
```

That is a complete OCSF Network Activity event. The `unmapped` record is empty because this layout maps entirely, and the line survives beside it, so an analyst can compare the two.

### Map each event class

Amazon’s mapper delegates the mapping itself to [`amazon::vpc_flow::ocsf::events::network_activity`](https://tenzir.com/packages/amazon/operators/vpc_flow/ocsf/events/network_activity.tql), which receives the same two fields and fills in the class. One event type needs one leaf.

A product that emits several keeps the same shape and dispatches. Leaving Amazon aside for a moment, here is that mapper for a `vendor` package with three event types:

operators/ocsf/map.tql

```tql
---
args:
  positional:
    - name: input
      description: The structured source event to read.
      type: field
    - name: ocsf
      description: The OCSF event to build.
      type: field
---


// Every event carries the product identity, whatever its class.
$ocsf.metadata = {
  product: {
    name: "Product",
    vendor_name: "Vendor",
  },
  version: "1.9.0",
}
$ocsf.severity_id = 1


match $input.event_type? {
  "dns" => {
    vendor::ocsf::events::dns $input, $ocsf
  }
  "http" | "https" => {
    vendor::ocsf::events::http $input, $ocsf
  }
  "auth" => {
    vendor::ocsf::events::auth $input, $ocsf
  }
  _ => {
    @name = "ocsf.base_event"
    $ocsf.category_uid = 0
    $ocsf.class_uid = 0
    $ocsf.activity_id = 0
  }
}


$ocsf.type_uid = $ocsf.class_uid * 100 + $ocsf.activity_id
$ocsf.unmapped = move $input
```

Use `|` to give one arm several patterns. Each arm passes its operator the same two fields the mapper received, so a leaf has the mapper’s signature and delegation is a pass-through. The event-specific operators `move` fields out of the source as they map them, so whatever they leave behind is what the closing statement reports as `unmapped`.

Whatever every class shares belongs around the dispatch. The product identity and the severity come before it, and `type_uid` follows from `class_uid` and `activity_id`, so one statement after the `match` covers every class, including the Base Event whose zeroed identifiers give `0`.

The wildcard arm comes last, where it catches both an unrecognized event type and the `null` that a classifier yields for an unknown layout. Each event then pays for exactly one classification, the arm that runs owns it, and a dispatcher that falls back to `@name` reads the name its input arrived with. A mapper with a single class guards `null` first instead, as `amazon::vpc_flow::ocsf::map` does, which keeps the remaining statements free of the exceptional case.

The Base Event carries no `time`, and [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) accepts it that way. A payload nobody parsed has no timestamp to report, so the mapper reports none, which keeps baselines deterministic and saves a [`now`](https://tenzir.com/docs/reference/functions/now.md) call per event.

Each arm calls an internal operator that maps one event type. It takes the same two fields as the mapper, named after the shapes they hold, so every line of the body says which vocabulary it reads and which it writes:

operators/ocsf/events/dns.tql

```tql
---
args:
  positional:
    - name: input
      description: The source record to read.
      type: field
    - name: ocsf
      description: The OCSF event to build.
      type: field
---


@name = "ocsf.dns_activity"
$ocsf.category_uid = 4
$ocsf.class_uid = 4003
$ocsf.activity_id = 1


$ocsf.query.hostname = move $input.query_name
$ocsf.query.type = move $input.query_type
$ocsf.answers = move $input.dns_answers
// ... additional field mappings
```

A real package names the source parameter after the shape it holds, so amazon’s leaf reads `$vpc_flow` and openssh’s reads `$openssh`, while these placeholder examples call it `input`. The rule has no special case: a product’s own shape takes the product’s name and a schema takes the schema’s name, so `splunk::cim::ocsf::dns_activity` reads `$ocsf` and writes `$cim`. Each leaf is also callable on its own, which a test can drive directly.

### Create the normalizer

Back to Amazon, which now has a parser and a mapper. Most users want the result rather than the steps, so a third operator, the **normalizer**, runs the whole path for them. It stays short because each layer below it does one job:

amazon/operators/vpc\_flow/ocsf/normalize.tql

```tql
---
description: |
  Normalizes one raw Amazon VPC Flow Log line to OCSF Network Activity
  (class 4001).
  One call takes the line all the way: it parses the line, maps the structured
  event, and stores the line as provenance. A line in an unsupported layout
  becomes an OCSF Base Event that carries the payload.
  A VPC Flow Log line arrives inside a field, so name that field. Sources whose
  whole event is the payload leave the argument off.
  Callers that already hold a structured VPC Flow Log event use
  `amazon::vpc_flow::ocsf::map` instead.
args:
  positional:
    - name: line
      type: field
      description: The field holding the raw VPC Flow Log line.
  named:
    - name: into
      type: field
      default: this
      description: The field that receives the OCSF event.
---


assert type_of($line).kind == "string", message="expected a raw VPC Flow Log line"


amazon::vpc_flow::parse $line, $into.vpc_flow
amazon::vpc_flow::ocsf::map $into.vpc_flow, $into.ocsf


$into = {
  ...$into.ocsf,
  raw_data: $line,
  raw_data_size: $line.length_bytes(),
}
```

Onboarding the source is then a single call, which produces the same event as the three staged ones:

```tql
amazon::vpc_flow::ocsf::normalize message
```

The parser and the mapper stay public next to it, for pipelines that have to inspect, enrich, or route the structured event before mapping.

The normalizer is the one operator that produces a whole event rather than filling a field, which is why it keeps a named `into` that defaults to `this`. It is therefore also the one operator that stages anything: it gives the parser and the mapper two fields of its own to work in, then lifts the OCSF event and adds the provenance.

Its input is whatever the product delivers. A VPC Flow Log line arrives inside a field, so the call names that field. A source whose whole event is the payload, such as `sshd` messages arriving as Syslog events, gives its normalizer a positional input that defaults to `this` and takes no argument at all:

```tql
where app_name == "sshd"
openssh::ocsf::normalize
```

A pipeline that already holds a structured event, whether from a JSON reader or from a package parser it called itself, continues with the mapper instead, in the staged form from [creating the mapper](onboard-a-data-source.md#create-the-mapper).

After normalizing or mapping, callers run the shared OCSF helpers. The package produces minimal OCSF, [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md) adds derived sibling fields, and [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) validates the final shape:

```tql
amazon::vpc_flow::ocsf::normalize message
ocsf_derive
ocsf_cast
```

A caller that writes the result into an envelope uses the function forms of the same helpers, [`ocsf_derive`](https://tenzir.com/docs/reference/functions/ocsf_derive.md) and [`ocsf_cast`](https://tenzir.com/docs/reference/functions/ocsf_cast.md), which work on a field and leave the rest of the envelope in place:

```tql
amazon::vpc_flow::ocsf::normalize message, into=ocsf
ocsf = ocsf_cast(ocsf_derive(ocsf))
```

## Fit it into the data lifecycle

Onboarding a source covers three steps of the [data lifecycle](learn-the-data-lifecycle.md), and only two of them belong to the package:

| Step    | What runs it                                                            |
| ------- | ----------------------------------------------------------------------- |
| Collect | The deployment’s pipeline, which knows the bucket and the credentials   |
| Parse   | `amazon::vpc_flow::parse`, with one parser per layout below it          |
| Map     | `amazon::vpc_flow::ocsf::map`, with one mapper per event class below it |

The `amazon::vpc_flow::ocsf::normalize` operator is our opinion about how to combine the last two: classify the layout, map the result, and keep the line as `raw_data`. A caller who wants a different opinion calls the parser and the mapper directly.

Every source package in our [library](https://github.com/tenzir/library) exposes those same three operators, which is what lets a user learn one package and predict the rest. A package whose product Tenzir reads natively skips the parse layer, so `zeek` starts at the mapper because [`read_zeek_tsv`](https://tenzir.com/docs/reference/operators/read_zeek_tsv.md) already produces events.

## Assemble the package

Operators become a package once a manifest names them, tests pin their output, and a changelog records what they do.

### Write the manifest

One file turns the directory you filled into a package:

amazon/package.yaml

```yaml
id: amazon
name: Amazon Web Services
author: Tenzir
description: |
  Parse Amazon VPC Flow Logs and map them to OCSF Network Activity.
categories:
  - sources
  - mappings
```

* amazon/

  * changelog/unreleased/

    * …

  * examples/

    * vpc-flow-line-to-ocsf.tql
    * vpc-flow-line-to-ocsf-staged.tql

  * operators/vpc\_flow/

    * parse.tql

    * parse\_v2.tql

    * parse\_v7\_ecs.tql

    * ocsf/

      * map.tql
      * normalize.tql

  * tests/vpc\_flow/

    * …

  * constants.tql

  * package.yaml

Ship the pipelines you wrote as examples. They run the public API on a fixed input, with no AWS access:

amazon/examples/vpc-flow-line-to-ocsf.tql

```tql
---
name: Map a VPC Flow Log line to OCSF
description: |
  Normalizes one default-format VPC Flow Log line to OCSF Network Activity. The
  normalizer selects the parser, maps the structured record, and preserves the
  line as OCSF provenance.
---


from {
  message: "2 123456789012 eni-0a1b2c3d4e5f67890 10.0.1.10 198.51.100.20 51514 443 6 10 840 1767225600 1767225660 ACCEPT OK",
}
amazon::vpc_flow::ocsf::normalize message
ocsf_derive
```

The second example, `vpc-flow-line-to-ocsf-staged.tql`, is the staged version from [creating the mapper](onboard-a-data-source.md#create-the-mapper). Both produce the same event.

The pipeline that reads a bucket and picks a topic belongs to the deployment:

```tql
from_file "s3://example-flow-logs/AWSLogs/**/*.log.gz", watch=true {
  decompress_gzip
  read_lines
}
amazon::vpc_flow::ocsf::normalize line
publish "ocsf"
```

Expose what varies as operator arguments. They are typed, checked when a pipeline compiles, and free to differ per call.

### Test it

Every public operator needs a test with a fixed input and a recorded output. The parser test reads that input and writes the result to its own field:

amazon/tests/vpc\_flow/parse-default.tql

```tql
from_file env("TENZIR_INPUT") {
  read_ndjson
}
amazon::vpc_flow::parse_v2 message, vpc_flow
this = move vpc_flow
sort start
```

The end-to-end test feeds raw lines to the normalizer, so one run covers layout classification, parsing, mapping, and provenance:

amazon/tests/vpc\_flow/normalize.tql

```tql
from_file env("TENZIR_INPUT") {
  read_lines
}
amazon::vpc_flow::ocsf::normalize line
ocsf_cast
sort time, type_uid
```

Three more tests cover the rest: `normalize-unsupported.tql` checks that an unknown layout becomes an OCSF Base Event with its payload, `parse-v7-ecs.tql` pins the second parser, and `map-structured.tql` calls the mapper on records that arrive already structured.

Record the baselines, then compare against them:

```sh
uvx tenzir-test amazon --passthrough
uvx tenzir-test amazon --update
uvx tenzir-test amazon
```

The guide to [testing packages](../guides/packages/test-packages.md) covers inline inputs, shared fixtures, expected errors, and ordered suites.

### Ship it

Record the new capability from the package directory:

```sh
uvx tenzir-ship add \
  --title "VPC Flow Log normalization" \
  --type feature
```

Then install it by putting the directory where Tenzir looks for packages, which is the `packages` directory next to `tenzir.yaml`:

* /opt/tenzir/etc/tenzir/

  * packages/

    * amazon/ The directory you just built

      * …

  * tenzir.yaml

The directory name matches the package id, and the operators arrive under the `amazon` namespace on the next start. Installing this way keeps the package in version control with everything else that defines the deployment, so a review precedes every change and a fresh machine gets the same set of packages from the same commit.

Check what registered:

```tql
package_list
where id == "amazon"
```

Run both examples to check the transformation without AWS access, then point your own collection pipeline at the normalizer. Our guides on [maintaining a changelog](../guides/packages/maintain-a-changelog.md) and [installing a package](../guides/packages/install-a-package.md) cover releases, the Library, and the remaining install paths, including [`package_add`](https://tenzir.com/docs/reference/operators/package_add.md) for trying something out interactively.

## Next

* [Add enrichment contexts](add-enrichment-contexts.md) adds a context package and enriches the endpoints you just mapped.
* Our guide on [mapping to OCSF](../guides/normalize/map-to-ocsf.md) goes deeper on classes, attribute groups, and validation.
* Our guides on [normalizing data](../guides/normalize.md) cover the other target schemas, which start from the OCSF event this package produces.
