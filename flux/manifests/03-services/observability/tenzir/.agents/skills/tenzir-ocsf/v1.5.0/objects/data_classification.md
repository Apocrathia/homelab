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

### `classifier_details`

- **Type**: [`classifier_details`](classifier_details.md)
- **Requirement**: recommended

Describes details about the classifier used for data classification.

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

### `discovery_details`

- **Type**: [`discovery_details`](discovery_details.md)
- **Requirement**: optional

Details about the data discovered by classification job.

### `policy`

- **Type**: [`policy`](policy.md)
- **Requirement**: optional

Details about the data policy that governs data handling and security measures related to classification.

### `size`

- **Type**: `long_t`
- **Requirement**: optional

Size of the data classified.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The source URL pointing towards the full classifcation job details.

### `status`

- **Type**: `string_t`
- **Requirement**: recommended

The resultant status of the classification job normalized to the caption of the `status_id` value. In the case of 'Other', it is defined by the event source.

### `status_details`

- **Type**: `string_t`
- **Requirement**: optional

The contextual description of the `status, status_id` value.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `status`

#### Enum values

- `0`: `Unknown`
- `1`: `Complete` - The classification job completed for the evaluated resource.
- `2`: `Partial` - The classification job partially completed for the evaluated resource.
- `3`: `Fail` - The classification job failed for the evaluated resource.
- `99`: `Other` - The classification job type id is not mapped.

The normalized status identifier of the classification job.

### `total`

- **Type**: `integer_t`
- **Requirement**: optional

The total count of discovered entities, by the classification job.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the classification job.
