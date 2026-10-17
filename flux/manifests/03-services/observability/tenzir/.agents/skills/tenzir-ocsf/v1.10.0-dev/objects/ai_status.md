# AI Status (ai_status)

Container for per-operation outcome scalars contributed by the `ai_operation` profile. Holds outcomes reported by the model or agent runtime, such as why a completion stopped or the result of a permission check, so they do not proliferate as discrete attributes at the event root. Additional outcome attributes may be added to this object in later versions.

- **Extends**: [Object (object)](object.md)

## Attributes

### `stop_reason`

- **Type**: `string_t`
- **Requirement**: optional

The reason the model completion ended, as reported by the event source. Normalized to the caption of the `stop_reason_id` value; when the value is 'Other', this carries the event source's native label (e.g. `end_turn`, `max_tokens`).

### `stop_reason_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `stop_reason`

#### Enum values

- `0`: `Unknown` - The completion ended without the producer being able to determine why, so the state of the operation at termination is not established.
- `1`: `End of Turn` - The model reached the end of its turn: it completed its response naturally or emitted a configured stop sequence, and is not waiting on anything further.
- `2`: `Token Limit` - The completion was truncated by a token or length limit before the model finished, so the response is incomplete.
- `3`: `Tool Use` - The completion paused to invoke a tool. The turn is not finished; the model expects the tool result and will continue.
- `4`: `Session Stop` - The completion ended because the session or connection carrying it terminated - for example the caller cancelled, the client disconnected, or the transport closed - rather than because the model reached a stopping point. The session state at termination is therefore known, which distinguishes this from `Unknown` and lets a consumer decide whether the operation needs investigation or can simply be reclaimed.
- `5`: `Content Filter` - The completion was stopped by a safety, policy, or content moderation mechanism rather than by the model reaching a stopping point or by the caller. This includes a refusal raised by a safety classifier and a guardrail intervening on the request or the response.
- `99`: `Other` - The stop reason is not mapped. See the `stop_reason` attribute, which contains a data source specific value.

The normalized reason the model completion ended. Producers map their runtime's native value into this set. Populate on completion events; when the value is 'Other', set `stop_reason` to the event source's native label. Because completion behavior is bound to the configuration that produced it, a shift in this attribute's distribution is more meaningful when weighed against that configuration: `ai_model.version` for direct model invocations, and `ai_agent.version`, `ai_agent.charter`, and `ai_agent.instance_uid` for agent-mediated operations.

### `permission_result`

- **Type**: `string_t`
- **Requirement**: optional

The outcome of the agent runtime's permission check for this operation, as reported by the runtime. Normalized to the caption of the `permission_result_id` value; when the value is 'Other', this carries the runtime's native label.

### `permission_result_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `permission_result`

#### Enum values

- `0`: `Unknown` - The permission check outcome could not be determined, so the authorization state of the operation is not established.
- `1`: `Allowed` - The agent runtime's permission check permitted the operation to proceed.
- `2`: `Denied` - The agent runtime's permission check refused the operation.
- `99`: `Other` - The permission result is not mapped. See the `permission_result` attribute, which contains a data source specific value.

The normalized outcome of the agent runtime's permission check for this operation, as reported by the runtime. Producers map their runtime's native value into this set; when the value is 'Other', set `permission_result` to the runtime's native label.
