# Additional Restriction (additional_restriction)

The Additional Restriction object describes supplementary access controls and guardrails that constrain or limit granted permissions beyond the primary policy. These restrictions are typically applied through hierarchical policy frameworks, organizational controls, or conditional access mechanisms. Examples include AWS Service Control Policies (SCPs), Resource Control Policies (RCPs), Azure Management Group policies, GCP Organization policies, conditional access policies, IP restrictions, time-based constraints, and MFA requirements.

- **Extends**: [Object (object)](object.md)

## Attributes

### `policy`

- **Type**: [`policy`](policy.md)
- **Requirement**: required

Detailed information about the policy document that defines this restriction, including policy metadata, type, scope, and the specific rules or conditions that implement the access control.

### `status`

- **Type**: `string_t`
- **Requirement**: optional

The current status of the policy restriction, normalized to the caption of the `status_id` enum value.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `status`

#### Enum values

- `1`: `Applicable` - This restriction is currently applicable and being enforced.
- `2`: `Inapplicable` - This restriction is not applicable.
- `3`: `Evaluation Error` - This restriction could not be properly evaluated due to an error.

The normalized status identifier indicating the applicability of this policy restriction.
