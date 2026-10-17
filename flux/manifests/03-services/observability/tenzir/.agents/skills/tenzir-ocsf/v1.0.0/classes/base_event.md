# Base Event (base_event)

The base event is a generic and concrete event. It also defines a set of attributes available in most event classes. As a generic event that does not belong to any event category, it could be used to log events that are not otherwise defined by the schema.

- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Attributes

### `enrichments`

- **Type**: [`enrichment`](../objects/enrichment.md)
- **Group**: context

The additional information from an external data source, which is associated with the event. For example add location information for the IP address in the DNS answers:`[{"name": "answers.ip", "value": "92.24.47.250", "type": "location", "data": {"city": "Socotra", "continent": "Asia", "coordinates": [-25.4153, 17.0743], "country": "YE", "desc": "Yemen"}}]`

### `message`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The description of the event, as defined by the event source.

### `metadata`

- **Type**: [`metadata`](../objects/metadata.md)
- **Requirement**: required
- **Group**: context

The metadata associated with the event.

### `observables`

- **Type**: [`observable`](../objects/observable.md)
- **Requirement**: optional
- **Group**: primary

The observables associated with the event.

### `raw_data`

- **Type**: `string_t`
- **Group**: context

The event data as received from the event source.

### `severity`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: classification

The event severity, normalized to the caption of the severity_id value. In the case of 'Other', it is defined by the event source.

### `severity_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: classification
- **Sibling**: `severity`

#### Enum values

- `99`: `Other` - The event severity is not mapped. See the `severity` attribute, which contains a data source specific value.
- `0`: `Unknown` - The event severity is not known.
- `1`: `Informational` - Informational message. No action required.
- `2`: `Low` - The user decides if action is needed.
- `3`: `Medium` - Action is required but the situation is not serious at this time.
- `4`: `High` - Action is required immediately.
- `5`: `Critical` - Action is required immediately and the scope is broad.
- `6`: `Fatal` - An error occurred but it is too late to take remedial action.

The normalized identifier of the event severity.

The normalized severity is a measurement the effort and expense required to manage and resolve an event or incident. Smaller numerical values represent lower impact events, and larger numerical values represent higher impact events.

### `status`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: primary

The event status, normalized to the caption of the status_id value. In the case of 'Other', it is defined by the event source.

### `status_code`

- **Type**: `string_t`
- **Group**: primary

The event status code, as reported by the event source.

For example, in a Windows Failed Authentication event, this would be the value of 'Failure Code', e.g. 0x18.

### `status_detail`

- **Type**: `string_t`
- **Group**: primary

The status details contains additional information about the event outcome.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `status`

#### Enum values

- `99`: `Other` - The event status is not mapped. See the `status` attribute, which contains a data source specific value.
- `0`: `Unknown`
- `1`: `Success`
- `2`: `Failure`

The normalized identifier of the event status.

### `unmapped`

- **Type**: [`object`](../objects/object.md)
- **Group**: context

The attributes that are not mapped to the event schema. The names and values of those attributes are specific to the event source.
