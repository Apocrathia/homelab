# Firewall Rule (firewall_rule)

The Firewall Rule object represents a specific rule within a firewall policy or event. It contains information about a rule's configuration, properties, and associated actions that define how network traffic is handled by the firewall.

- **Extends**: [Rule (rule)](rule.md)

## Attributes

### `condition`

- **Type**: `string_t`
- **Requirement**: optional

The rule trigger condition for the rule. For example: SQL_INJECTION.

### `sensitivity`

- **Type**: `string_t`
- **Requirement**: optional

The sensitivity of the firewall rule in the matched event. For example: HIGH.

### `match_location`

- **Type**: `string_t`
- **Requirement**: optional

The location of the matched data in the source which resulted in the triggered firewall rule. For example: HEADER.

### `match_details`

- **Type**: `string_t`
- **Requirement**: optional

The data in a request that rule matched. For example: '["10","and","1"]'.

### `rate_limit`

- **Type**: `integer_t`
- **Requirement**: optional

The rate limit for a rate-based rule.

### `duration`

- **Type**: `integer_t`
- **Requirement**: optional

The rule response time duration, usually used for challenge completion time.
