# Base Event (base_event)

The base event is a generic and concrete event. It also defines a set of attributes available in most event classes. As a generic event that does not belong to any event category, it could be used to log events that are not otherwise defined by the schema.

- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `activity_name`

#### Enum values

- `0`: `Unknown`
- `99`: `Other`

The normalized identifier of the activity that triggered the event.

### `activity_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event activity name, as defined by the activity_id.

### `category_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event category name, as defined by category_uid value.

### `category_uid`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `category_name`

#### Enum values

- `0`: `Uncategorized`

The category unique identifier of the event.

### `class_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event class name, as defined by class_uid value.

### `class_uid`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `class_name`

#### Enum values

- `0`: `Base Event`

The unique identifier of a class. A class describes the attributes available in an event.

### `count`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: occurrence

The number of times that events in the same logical group occurred during the event Start Time to End Time period.

### `duration`

- **Type**: `long_t`
- **Requirement**: optional
- **Group**: occurrence

The event duration or aggregate time, the amount of time the event covers from `start_time` to `end_time` in milliseconds.

### `end_time`

- **Type**: `timestamp_t`
- **Requirement**: optional
- **Group**: occurrence

The end time of a time period, or the time of the most recent event included in the aggregate event.

### `enrichments`

- **Type**: [`enrichment`](../objects/enrichment.md)
- **Requirement**: optional
- **Group**: context

The additional information from an external data source, which is associated with the event or a finding. For example add location information for the IP address in the DNS answers:`[{"name": "answers.ip", "value": "92.24.47.250", "type": "location", "data": {"city": "Socotra", "continent": "Asia", "coordinates": [-25.4153, 17.0743], "country": "YE", "desc": "Yemen"}}]`

### `message`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The description of the event/finding, as defined by the source.

### `metadata`

- **Type**: [`metadata`](../objects/metadata.md)
- **Requirement**: required
- **Group**: context

The metadata associated with the event or a finding.

### `observables`

- **Type**: [`observable`](../objects/observable.md)
- **Requirement**: recommended
- **Group**: primary

The observables associated with the event or a finding.

### `raw_data`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The raw event/finding data as received from the source.

### `raw_data_size`

- **Type**: `long_t`
- **Requirement**: optional
- **Group**: context

The size of the raw data which was transformed into an OCSF event, in bytes.

### `severity`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event/finding severity, normalized to the caption of the `severity_id` value. In the case of 'Other', it is defined by the source.

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

The start time of a time period, or the time of the least recent event included in the aggregate event.

### `status`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The event status, normalized to the caption of the status_id value. In the case of 'Other', it is defined by the event source.

### `status_code`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The event status code, as reported by the event source.

For example, in a Windows Failed Authentication event, this would be the value of 'Failure Code', e.g. 0x18.

### `status_detail`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The status detail contains additional information about the event/finding outcome.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `status`

#### Enum values

- `0`: `Unknown` - The status is unknown.
- `1`: `Success`
- `2`: `Failure`
- `99`: `Other` - The event status is not mapped. See the `status` attribute, which contains a data source specific value.

The normalized identifier of the event status.

### `time`

- **Type**: `timestamp_t`
- **Requirement**: required
- **Group**: occurrence

The normalized event occurrence time or the finding creation time.

### `timezone_offset`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: occurrence

The number of minutes that the reported event `time` is ahead or behind UTC, in the range -1,080 to +1,080.

### `type_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event/finding type name, as defined by the type_uid.

### `type_uid`

- **Type**: `long_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `type_name`

The event/finding type ID. It identifies the event's semantics and structure. The value is calculated by the logging system as: `class_uid * 100 + activity_id`.

### `unmapped`

- **Type**: [`object`](../objects/object.md)
- **Requirement**: optional
- **Group**: context

The attributes that are not mapped to the event schema. The names and values of those attributes are specific to the event source.
