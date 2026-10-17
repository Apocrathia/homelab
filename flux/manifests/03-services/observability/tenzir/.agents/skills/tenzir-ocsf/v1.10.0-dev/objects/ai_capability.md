# AI Capability (ai_capability)

The AI Capability object describes a callable capability invoked by or on behalf of an AI system: a tool, a resource, or a prompt, in the sense of the Model Context Protocol (MCP) primitives. It records the invariant, advertised description of the capability - its identity, kind, provenance, declared contracts, and declared safety hints - not the per-call argument values or results, which are carried by the transport objects (e.g., `api.request.data` / `api.response.data`). The object is protocol-neutral: MCP is the motivating binding, but a framework-native function tool or a model provider's built-in tool populates the same shape, omitting the MCP-specific attributes. Distinguished from the `product` object, which describes the security product that generated the telemetry.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `baseline_fingerprint`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: optional

A fingerprint of the capability's declared contract as recorded at registration or approval time, identifying the approved contract version without embedding the contract body in the event. Compared against the contract fingerprints presented at invocation to detect a declared contract that changed after approval, such as supply-chain "rug pull" changes. Carries the approved value rather than a match verdict; consumers diff, the object does not assess.

### `cache_scope`

- **Type**: `string_t`
- **Requirement**: optional
- **Sibling**: `cache_scope_id`

The declared cache scope, normalized to the caption of `cache_scope_id`. In the case of `Other`, it is defined by the event source.

### `cache_scope_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `cache_scope`

#### Enum values

- `0`: `Unknown` - The cache scope is unknown or was not declared.
- `1`: `Public` - The result may be cached by shared intermediaries and served across users, per MCP `cacheScope: public`.
- `2`: `Private` - The result is specific to a single user or client and must not be served from a shared cache, per MCP `cacheScope: private`.
- `99`: `Other` - The cache scope is not mapped. See the `cache_scope` attribute, which contains a data source specific value.

The normalized identifier of the cache scope the serving system declared for this capability's results, modeled on the MCP `cacheScope` field (itself modeled on HTTP Cache-Control). Determines whether shared intermediaries may cache the result - a data-exposure signal: a `Private` result cached in a shared scope is a cross-user exposure. Note this is declared caching metadata observed on the serving response, not an invariant property of the capability itself.

### `cache_ttl`

- **Type**: `long_t`
- **Requirement**: optional

The declared freshness window for this capability's results, in milliseconds, per the MCP `ttlMs` field. Bounds how long a cached result was treated as valid by the consuming system.

### `desc_fingerprint`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: optional

A fingerprint of the capability's declared natural-language description or instructions (e.g., the tool docstring or manifest description presented at discovery), identifying the description version without embedding the description body in the event. The object carries no `desc` attribute; this fingerprints the model-visible description by reference. Enables detecting description poisoning, where the description is altered without any schema change.

### `input_schema_fingerprint`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: optional

A fingerprint of the capability's declared input contract (e.g., its JSON Schema), identifying the contract version without embedding the schema body in the event. Enables grouping by tool-contract version and detecting contract drift, including "rug pull" changes where a tool's schema changes after initial approval. Use `serialization_id: JCS` when the fingerprint is computed over canonicalized JSON.

### `is_destructive`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates the capability declared that it may perform destructive updates, per the MCP `destructiveHint` tool annotation. This is a self-declared, unverified hint from the serving system: it supports triage and pivoting but must not be treated as an enforced property.

### `is_idempotent`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates the capability declared that repeated calls with the same arguments have no additional effect, per the MCP `idempotentHint` tool annotation. This is a self-declared, unverified hint from the serving system.

### `is_open_world`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates the capability declared that it may interact with an open world of external entities (e.g., the web), rather than a closed domain, per the MCP `openWorldHint` tool annotation. This is a self-declared, unverified hint from the serving system.

### `is_readonly`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates the capability declared that it does not modify its environment, per the MCP `readOnlyHint` tool annotation. This is a self-declared, unverified hint from the serving system: it supports triage and pivoting (e.g., "every write-capable tool an agent invoked") but must not be treated as an enforced property, and a mismatch between this hint and observed behavior is itself a signal.

### `mime_type`

- **Type**: `string_t`
- **Requirement**: optional

The declared MIME type of the capability's content. Primarily for `Resource` primitives, e.g. `text/markdown` or `application/json`.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The name of the capability as advertised by its provider: the MCP tool, resource, or prompt name, the function name of a framework-native tool, or the identifier of a built-in tool. For example: `get_weather`.

### `namespace`

- **Type**: `string_t`
- **Requirement**: optional

The namespace or grouping the capability belongs to, when the provider organizes capabilities into named collections. For example: `weather`.

### `output_schema_fingerprint`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: optional

A fingerprint of the capability's declared structured-output contract, identifying the contract version without embedding the schema body in the event. Use `serialization_id: JCS` when the fingerprint is computed over canonicalized JSON.

### `service`

- **Type**: [`service`](service.md)
- **Requirement**: recommended

The logical serving system that advertised and served the capability - for MCP, the MCP server. This is provenance, not a network endpoint: when a gateway or proxy sits in the path, `dst_endpoint` identifies the gateway that was contacted, while this attribute identifies the logical server that actually served the primitive behind it. For `stdio`-transported servers there is no network endpoint at all, and this attribute is the only record of the serving system.

### `source`

- **Type**: `string_t`
- **Requirement**: optional

The tool source, normalized to the caption of `source_id`. In the case of `Other`, it is defined by the event source.

### `source_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `source`

#### Enum values

- `0`: `Unknown` - The tool source is unknown.
- `1`: `MCP` - The capability was provided by a Model Context Protocol server.
- `2`: `Function` - The capability is a framework-native or application-defined function tool, registered directly with the agent or model call (e.g., function calling / tool-use definitions).
- `3`: `Built-in` - The capability is built into the model provider's platform (e.g., a provider-hosted web search or code execution tool).
- `99`: `Other` - The tool source is not mapped. See the `source` attribute, which contains a data source specific value.

The normalized identifier of the mechanism through which the capability was provided to the AI system. Orthogonal to `type_id`, which is the kind of primitive: a `Tool` may be sourced via MCP, via framework-native function calling, or as a model provider's built-in. In the case of 'Other', it is defined by the event source and carried by the `source` attribute.

### `task_uid`

- **Type**: `string_t`
- **Requirement**: optional

The task handle returned for a long-running invocation, per the MCP Tasks extension. Correlates the originating call with subsequent task lifecycle events (get, update, cancel) so an asynchronous tool invocation remains a single thread of activity across events.

### `transaction_uid`

- **Type**: `string_t`
- **Requirement**: optional

The capability-layer invocation identifier that correlates a request with its result across events - for MCP, the JSON-RPC request id of the call. Distinct from `api.request.uid`, which is transport-scoped, and from `uid`, which identifies the capability itself rather than an invocation of it.

### `transport`

- **Type**: `string_t`
- **Requirement**: optional
- **Sibling**: `transport_id`

The transport, normalized to the caption of `transport_id`. In the case of `Other`, it is defined by the event source.

### `transport_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `transport`

#### Enum values

- `0`: `Unknown` - The transport is unknown.
- `1`: `stdio` - The server runs as a local subprocess and communicates over standard input/output, per the MCP stdio transport.
- `2`: `Streamable HTTP` - The server is reached over HTTP using the MCP Streamable HTTP transport.
- `3`: `HTTP+SSE` - The server is reached over the deprecated MCP HTTP with Server-Sent Events transport, retained for producers observing legacy servers.
- `99`: `Other` - The transport is not mapped, e.g. a custom transport. See the `transport` attribute, which contains a data source specific value.

The normalized identifier of the transport binding the client used to reach the serving system. Distinguishes a local subprocess server from a remote networked server - a real trust boundary, and the reason an event's network endpoint attributes may legitimately be absent (a `stdio` server has no network endpoint). Not an IP-layer protocol: `protocol_name` does not apply, and `stdio` is not a network protocol at all.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The kind of capability primitive, normalized to the caption of the `type_id` value. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The primitive kind is unknown.
- `1`: `Tool` - A model-invocable executable function; it may retrieve data or cause side effects.
- `2`: `Resource` - Application-controlled contextual data or content, typically identified by a URI.
- `3`: `Prompt Template` - A reusable, user-selectable prompt template; this is not the end user's prompt text.
- `99`: `Other` - The primitive kind is not mapped. See the `type` attribute, which contains a data source specific value.

The normalized identifier of the kind of capability primitive, per the Model Context Protocol primitive taxonomy. The three primitives carry different risk profiles; a first-class discriminator makes questions like "resource reads vs. tool calls" queryable rather than buried in free-text operation names.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The stable identifier of the capability itself, when one exists: a registry or catalog identifier, or a producer-derived stable key (e.g., serving server identity plus capability name). Identifies the capability across invocations; per-invocation correlation is carried by `transaction_uid` instead.

### `uri`

- **Type**: `url_t`
- **Requirement**: optional

The URI of the capability. For `Resource` primitives this is the resource URI that was read, e.g. `file:///project/README.md`.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The version of the capability as advertised by its provider, when versioned.
