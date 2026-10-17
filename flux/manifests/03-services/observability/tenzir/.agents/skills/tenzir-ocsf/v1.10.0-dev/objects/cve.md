# CVE (cve)

The Common Vulnerabilities and Exposures (CVE) object represents publicly disclosed cybersecurity vulnerabilities defined in CVE Program catalog (CVE). There is one CVE Record for each vulnerability in the catalog.

- **Extends**: [Object (object)](object.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The Record Creation Date identifies when the CVE ID was issued to a CVE Numbering Authority (CNA) or the CVE Record was published on the CVE List. Note that the Record Creation Date does not necessarily indicate when this vulnerability was discovered, shared with the affected vendor, publicly disclosed, or updated in CVE.

### `cvss`

- **Type**: [`cvss`](cvss.md)
- **Requirement**: recommended

The CVSS object details Common Vulnerability Scoring System scores from the advisory that are related to the vulnerability.

### `cwe`

- **Type**: [`cwe`](cwe.md)
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use `related_cwes` attribute instead.

The CWE object represents a weakness in a software system that can be exploited by a threat actor to perform an attack. The CWE object is based on the Common Weakness Enumeration (CWE) catalog.

### `cwe_uid`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.1.0.** Use the `related_cwes[*].uid` attribute instead.

The Common Weakness Enumeration (CWE) unique identifier. For example: `CWE-787`.

### `cwe_url`

- **Type**: `url_t`
- **Requirement**: optional

> **Deprecated since v1.1.0.** Use the `related_cwes[*].src_url` attribute instead.

Common Weakness Enumeration (CWE) definition URL. For example: `https://cwe.mitre.org/data/definitions/787.html`.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

A brief description of the CVE Record.

### `epss`

- **Type**: [`epss`](epss.md)
- **Requirement**: optional

The Exploit Prediction Scoring System (EPSS) object describes the estimated probability a vulnerability will be exploited. EPSS is a community-driven effort to combine descriptive information about vulnerabilities (CVEs) with evidence of actual exploitation in-the-wild.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The Record Modified Date identifies when the CVE record was last updated.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: optional

The product where the vulnerability was discovered.

### `references`

- **Type**: `string_t`
- **Requirement**: recommended

A list of reference URLs with additional information about the CVE Record.

### `related_cwes`

- **Type**: [`cwe`](cwe.md)
- **Requirement**: optional

Describes the Common Weakness Enumeration details related to the CVE Record.

### `title`

- **Type**: `string_t`
- **Requirement**: recommended

A title or a brief phrase summarizing the CVE record.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The vulnerability type as classified in the CVE catalog.

Most frequently used vulnerability types are: `DoS`, `Code Execution`, `Overflow`, `Memory Corruption`, `Sql Injection`, `XSS`, `Directory Traversal`, `Http Response Splitting`, `Bypass something`, `Gain Information`, `Gain Privileges`, `CSRF`, `File Inclusion`. For more information see Vulnerabilities By Type distributions.

### `uid`

- **Type**: `string_t`
- **Requirement**: required
- **Observable**: 18

The Common Vulnerabilities and Exposures unique number assigned to a specific computer vulnerability. A CVE Identifier begins with 4 digits representing the year followed by a sequence of digits that acts as a unique identifier. For example: `CVE-2021-12345`.
