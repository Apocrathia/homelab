# CWE (cwe)

The CWE object represents a weakness in a software system that can be exploited by a threat actor to perform an attack. The CWE object is based on the [Common Weakness Enumeration (CWE)](https://cwe.mitre.org/) catalog.

- **Extends**: [Object (object)](object.md)

## Attributes

### `caption`

- **Type**: `string_t`
- **Requirement**: optional

The caption assigned to the Common Weakness Enumeration unique identifier.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

URL pointing to the CWE Specification. For more information see [CWE.](https://cwe.mitre.org/)

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The Common Weakness Enumeration unique number assigned to a specific weakness. A CWE Identifier begins "CWE" followed by a sequence of digits that acts as a unique identifier. For example: `CWE-123`.
