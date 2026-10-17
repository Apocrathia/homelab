# Application (application)

An Application describes the details for an inventoried application as reported by an Application Security tool or other Developer-centric tooling. Applications can be defined as Kubernetes resources, Containerized resources, or application hosting-specific cloud sources such as AWS Elastic BeanStalk, AWS Lightsail, or Azure Logic Apps.

- **Extends**: [Object (object)](object.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the application was known to have been created.

### `criticality`

- **Type**: `string_t`
- **Requirement**: optional

Criticality or relative importance of a resource/object in question, normalized to the caption of `criticality_id`. In the case of Other, the value is defined by the event source.

### `criticality_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `criticality`

#### Enum values

- `0`: `Unknown` - The criticality level is unknown.
- `1`: `Low` - Minimal operational or security importance.
- `2`: `Medium` - Affects localized functions or specific business processes.
- `3`: `High` - Critical to core operations. Compromise leads to significant, but recoverable disruptions.
- `4`: `Very High` - Mission critical, essential to business survival. Compromise could result in catastrophic consequences.
- `99`: `Other` - The criticality level is not mapped. See the `criticality` attribute, which contains a data source specific value.

Criticality or relative importance of a resource/object in question.

### `data`

- **Type**: `json_t`
- **Requirement**: optional

Additional data describing the application.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

A description or commentary for an application, usually retrieved from an upstream system.

### `first_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The initial discovery time of the application.

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The name of the related application or associated resource group.

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: optional

The fully qualified name of the application.

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels associated to the application.

### `last_seen_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent discovery time of the application.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the application was last known to have been modified.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the application.

### `owner`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

The identity of the service or user account that owns the application.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: optional

The software product that this application is an instance of, carrying product identity such as `vendor_name`, `cpe_name`, and canonical `version`.

### `region`

- **Type**: `string_t`
- **Requirement**: optional

The cloud region of the resource.

### `resource_relationship`

- **Type**: [`graph`](graph.md)
- **Requirement**: optional

A graph representation showing how this application relates to and interacts with other entities in the environment. This can include parent/child relationships, dependencies, or other connections.

### `risk_level`

- **Type**: `string_t`
- **Requirement**: optional

The risk level, normalized to the caption of the risk_level_id value.

### `risk_level_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `risk_level`

#### Enum values

- `0`: `Info`
- `1`: `Low`
- `2`: `Medium`
- `3`: `High`
- `4`: `Critical`
- `99`: `Other` - The risk level is not mapped. See the `risk_level` attribute, which contains a data source specific value.

The normalized risk level id.

### `risk_score`

- **Type**: `integer_t`
- **Requirement**: optional

The risk score as reported by the event source.

### `sbom`

- **Type**: [`sbom`](sbom.md)
- **Requirement**: optional

The Software Bill of Materials (SBOM) associated with the application

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The URL to the application's record or detail page within the reporting event source (e.g., a link to the application in the security tool's UI).

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the application.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of application as defined by the event source, e.g., `GitHub`, `Azure Logic App`, or `Amazon Elastic BeanStalk`.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier for the application.

### `uid_alt`

- **Type**: `string_t`
- **Requirement**: optional

An alternative or contextual identifier for the application, such as a configuration, organization, or license UID.

### `url`

- **Type**: [`url`](url.md)
- **Requirement**: optional

The URL of the application.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The semantic version of the application, e.g., `1.7.4`.
