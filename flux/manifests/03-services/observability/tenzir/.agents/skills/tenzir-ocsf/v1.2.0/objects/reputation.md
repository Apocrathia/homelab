# Reputation (reputation)

The Reputation object describes the reputation/risk score of an entity (e.g. device, user, domain).

- **Extends**: [Object (object)](object.md)

## Attributes

### `base_score`

- **Type**: `float_t`
- **Requirement**: required

The reputation score as reported by the event source.

### `provider`

- **Type**: `string_t`
- **Requirement**: recommended

The provider of the reputation information.

### `score`

- **Type**: `string_t`
- **Requirement**: optional

The reputation score, normalized to the caption of the score_id value. In the case of 'Other', it is defined by the event source.

### `score_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `score`

#### Enum values

- `99`: `Other` - The reputation score is not mapped. See the `rep_score` attribute, which contains a data source specific value.
- `0`: `Unknown` - The reputation score is unknown.
- `1`: `Very Safe` - Long history of good behavior.
- `10`: `Malicious` - Proven evidence of maliciousness.
- `2`: `Safe` - Consistently good behavior.
- `3`: `Probably Safe` - Reasonable history of good behavior.
- `4`: `Leans Safe` - Starting to establish a history of normal behavior.
- `5`: `May not be Safe` - No established history of normal behavior.
- `6`: `Exercise Caution` - Starting to establish a history of suspicious or risky behavior.
- `7`: `Suspicious/Risky` - A site with a history of suspicious or risky behavior. (spam, scam, potentially unwanted software, potentially malicious).
- `8`: `Possibly Malicious` - Strong possibility of maliciousness.
- `9`: `Probably Malicious` - Indicators of maliciousness.

The normalized reputation score identifier.
