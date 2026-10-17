# Base Event (base_event)

The base event is a generic and concrete event. It also defines a set of attributes available in most event classes. As a generic event that does not belong to any event category, it could be used to log events that are not otherwise defined by the schema.

- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Record Integrity](../profiles/record_integrity.md), [Security Control](../profiles/security_control.md)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `activity_name`

#### Enum values

- `0`: `Unknown`
- `99`: `Other`

The normalized identifier of the activity that triggered the event. Each event class defines its own set of activity values. Use `0` (Unknown) when the activity cannot be determined. Use `99` (Other) when the activity does not match any defined value, in which case `activity_name` must be populated with the source-specific label.

### `activity_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event activity name, as defined by the `activity_id`. When `activity_id` is `99` (Other), this attribute must contain the source-specific activity label. For all other `activity_id` values, this must match the caption defined for that `activity_id` enum value.

### `category_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event category name, as defined by the `category_uid` value. The value must match the caption defined for the corresponding `category_uid` enum value (e.g., `"Findings"` for `category_uid: 2`).

### `category_uid`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `category_name`

#### Enum values

- `0`: `Uncategorized`

The category unique identifier of the event. Each event class belongs to exactly one category. Producers and mappers must set this to the category defined by the event class being used.

### `class_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event class name, as defined by the `class_uid` value. The value must match the caption defined for the corresponding `class_uid` (e.g., `"Detection Finding"` for `class_uid: 2004`).

### `class_uid`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `class_name`

#### Enum values

- `0`: `Base Event`

The unique identifier of a class. A class describes the attributes available in an event. Producers and mappers must set this to the `uid` defined in the event class definition. For example, `Detection Finding` is `2004`.

### `count`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: occurrence

The number of events aggregated into this single record. Only populate for aggregate events. When set, `start_time` and `end_time` should also be provided to define the aggregation window.

### `duration`

- **Type**: `long_t`
- **Requirement**: optional
- **Group**: occurrence

The elapsed time of the aggregation window in milliseconds, from `start_time` to `end_time`. Only populate for aggregate events (`count` > 1). The value should equal `end_time - start_time`.

### `end_time`

- **Type**: `timestamp_t`
- **Requirement**: optional
- **Group**: occurrence

The time of the most recent event in an aggregate (`count` > 1). Do not populate for discrete, point-in-time events - use `time` alone. Subclasses such as findings may redefine this for their own time-range semantics.

### `enrichments`

- **Type**: [`enrichment`](../objects/enrichment.md)
- **Requirement**: optional
- **Group**: context

The additional information from an external data source, which is associated with the event or a finding. For example add location information for the IP address in the DNS answers:`[{"name": "answers.ip", "value": "92.24.47.250", "type": "location", "data": {"city": "Socotra", "continent": "Asia", "coordinates": [-25.4153, 17.0743], "country": "YE", "desc": "Yemen"}}]`

### `message`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

A human-readable description of the event, as defined by the source. This should be a concise, meaningful summary suitable for display in a UI or alert notification - not a raw log line. For example: `"User john_doe logged in from 10.0.0.1."` rather than a raw syslog string.

### `metadata`

- **Type**: [`metadata`](../objects/metadata.md)
- **Requirement**: required
- **Group**: context

The metadata object describes the event producer, schema version, and processing information. Producers and mappers must populate `metadata.product` to identify the data source, and `metadata.version` to indicate the OCSF schema version used. Consumers rely on this to interpret the event correctly.

### `observables`

- **Type**: [`observable`](../objects/observable.md)
- **Requirement**: recommended
- **Group**: primary

The observables array surfaces key indicators and entities from the event or finding in a single, consistent location for downstream correlation and detection. Each entry references an attribute path within the event (e.g., `src_endpoint.ip`) along with its type and value, enabling consumers to extract IOCs without parsing the full event structure.

### `raw_data`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The original event/finding data as received from the source, before normalization into OCSF. Populate this with the verbatim log line, JSON payload, or other native format for forensic and debugging purposes. This field is not intended for structured querying - use the normalized OCSF attributes instead.

### `raw_data_hash`

- **Type**: [`fingerprint`](../objects/fingerprint.md)
- **Requirement**: optional
- **Group**: context

A fingerprint (hash) of the `raw_data` content. Use this to verify the integrity of the original event data or to deduplicate events.

### `raw_data_size`

- **Type**: `long_t`
- **Requirement**: optional
- **Group**: context

The size of the original event data (as captured in `raw_data`) in bytes, before OCSF normalization. Useful for metering and capacity planning.

### `severity`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event/finding severity label, normalized to the caption of the `severity_id` value. When `severity_id` is `99` (Other), this attribute must contain the source-specific severity label. For all other values, this should match the caption defined for that `severity_id` enum value (e.g., `"High"` for `severity_id: 4`).

### `severity_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `severity`

#### Enum values

- `0`: `Unknown` - The event/finding severity is unknown.
- `1`: `Informational` - Informational message. No action required.
- `2`: `Low` - The user decides if action is needed.
- `3`: `Medium` - Action is required but the situation is not serious at this time.
- `4`: `High` - Action is required immediately.
- `5`: `Critical` - Action is required immediately and the scope is broad.
- `6`: `Fatal` - An error occurred but it is too late to take remedial action.
- `99`: `Other` - The event/finding severity is not mapped. See the `severity` attribute, which contains a data source specific value.

The normalized identifier of the event/finding severity.

The normalized severity is a measurement the effort and expense required to manage and resolve an event or incident. Smaller numerical values represent lower impact events, and larger numerical values represent higher impact events.

### `start_time`

- **Type**: `timestamp_t`
- **Requirement**: optional
- **Group**: occurrence

The time of the earliest event in an aggregate (`count` > 1). Do not populate for discrete, point-in-time events - use `time` alone. Subclasses such as findings may redefine this for their own time-range semantics.

### `status`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The event status label, normalized to the caption of the `status_id` value. When `status_id` is `99` (Other), this attribute must contain the source-specific status label. For all other values, this must match the caption defined for that `status_id` enum value (e.g., `"Success"` for `status_id: 1`).

### `status_code`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The source-specific status or error code as reported by the event source. For example, a Windows logon failure code (`0x18`), an HTTP response code (`403`), or an AWS API error code. This preserves the original code for detailed troubleshooting beyond what `status_id` conveys.

### `status_detail`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

A human-readable description providing additional context about the event outcome. Use this to convey details that go beyond the normalized `status_id` and source-specific `status_code`, such as a failure reason or error message. For example: `"Account locked after 5 failed attempts."`.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `status`

#### Enum values

- `1`: `Success` - The activity completed successfully.
- `2`: `Failure` - The activity failed.

The normalized status of the event outcome. Use this family of attributes to convey the outcome of the activity described by the event. Producers should map their source outcome to `1` (Success) or `2` (Failure). Use `0` (Unknown) when the outcome cannot be determined, and `99` (Other) with a populated `status` string when the source value does not map cleanly.

### `time`

- **Type**: `timestamp_t`
- **Requirement**: required
- **Group**: occurrence

The primary timestamp of the event - when the activity actually occurred at the source. This does not capture when the event record was created or serialized by the source system; for event lifecycle timestamps such as ingestion and processing, use `metadata.logged_time` and `metadata.processed_time` respectively, or the equivalent attributes in the `metadata.loggers` array when recording pipeline stages. For aggregate events (`count` > 1), set this to `start_time` (the earliest OCSF `time` in the aggregate) to preserve causal ordering and consistent timeline alignment. Note: finding classes redefine `time` as the finding creation time rather than the activity occurrence time. This must be a UTC epoch value in milliseconds (e.g., `1776881335332`). Mappers should use the most precise and authoritative timestamp available from the source.

### `timezone_offset`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: occurrence

The number of minutes that the reported event `time` is ahead or behind UTC, in the range -1,080 to +1,080. This allows consumers to reconstruct the local time at the event source. For example, US Eastern Standard Time is `-300`. Populate this when the source provides local time zone information.

### `type_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event/finding type name, combining the class and activity (e.g., `"Detection Finding: Create"`). The value must match the `class_name` and `activity_name` joined by `": "`.

### `type_uid`

- **Type**: `long_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `type_name`

The event/finding type ID. It identifies the event's semantics and structure. Producers and mappers must compute this as `class_uid * 100 + activity_id`. It uniquely identifies the combination of event class and activity across the entire schema. For example, `Detection Finding: Create` is `200401`.

### `unmapped`

- **Type**: [`object`](../objects/object.md)
- **Requirement**: optional
- **Group**: context

A container for source-specific attributes that do not map to any defined OCSF attribute. Use this to preserve valuable source data that would otherwise be lost during normalization. The keys and values are specific to the event source.

Note: Consumers should not rely on a stable structure within this field. The preferred approach to unmapped attributes is to create a custom extension with the desired structure.
