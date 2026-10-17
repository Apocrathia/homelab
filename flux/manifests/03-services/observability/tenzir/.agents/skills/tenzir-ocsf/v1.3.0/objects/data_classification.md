# Data Classification (data_classification)

The Data Classification object includes information about data classification levels and data category types.

- **Extends**: [Object (object)](object.md)

## Attributes

### `category`

- **Type**: `string_t`
- **Requirement**: optional

The name of the data classification category that data matched into, e.g. Financial, Personal, Governmental, etc.

### `category_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `category`

#### Enum values

- `0`: `Unknown` - The type is not mapped. See the `data_type` attribute, which contains a data source specific value.
- `1`: `Personal` - Any Personally Identifiable Information (PII), Electronic Personal Health Information (ePHI), or similarly personal information. E.g., full name, home address, date of birth, etc.
- `2`: `Governmental` - Any sensitive government identification number related to a person or other classified material. E.g., Passport numbers, driver license numbers, business identification, taxation identifiers, etc.
- `3`: `Financial` - Any financially-related sensitive information or Cardholder Data (CHD). E.g., banking account numbers, credit card numbers, International Banking Account Numbers (IBAN), SWIFT codes, etc.
- `4`: `Business` - Any business-specific sensitive data such as intellectual property, trademarks, copyrights, human resource data, Board of Directors meeting minutes, and similar.
- `5`: `Military and Law Enforcement` - Any mission-specific sensitive data for military, law enforcement, or other government agencies such as specifically classified data, weapon systems information, or other planning data.
- `6`: `Security` - Any sensitive security-related data such as passwords, passkeys, IP addresses, API keys, credentials and similar secrets. E.g., AWS Access Secret Key, SaaS API Keys, user passwords, database credentials, etc.
- `99`: `Other` - Any other type of data classification or a multi-variate classification made up of several other classification categories.

The normalized identifier of the data classification category.

### `confidentiality`

- **Type**: `string_t`
- **Requirement**: optional

The file content confidentiality, normalized to the confidentiality_id value. In the case of 'Other', it is defined by the event source.

### `confidentiality_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `confidentiality`

#### Enum values

- `0`: `Unknown` - The confidentiality is unknown.
- `1`: `Not Confidential`
- `2`: `Confidential`
- `3`: `Secret`
- `4`: `Top Secret`
- `5`: `Private`
- `6`: `Restricted`
- `99`: `Other` - The confidentiality is not mapped. See the `confidentiality` attribute, which contains a data source specific value.

The normalized identifier of the file content confidentiality indicator.

### `policy`

- **Type**: [`policy`](policy.md)
- **Requirement**: optional

Details about the data policy that governs data handling and security measures related to classification.
