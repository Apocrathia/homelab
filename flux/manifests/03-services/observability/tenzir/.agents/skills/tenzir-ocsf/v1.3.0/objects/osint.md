# OSINT (osint)

The OSINT (Open Source Intelligence) object contains details related to an indicator such as the indicator itself, related indicators, geolocation, registrar information, subdomains, analyst commentary, and other contextual information. This information can be used to further enrich a detection or finding by providing decisioning support to other analysts and engineers.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The indicator type is ambiguous or there is not a related indicator for the OSINT object.
- `1`: `IP Address` - An IPv4 or IPv6 address.
- `2`: `Domain` - A full-qualified domain name (FQDN), subdomain, or partial domain.
- `3`: `Hostname` - A hostname or computer name.
- `4`: `Hash` - Any type of hash e.g., MD5, SHA1, SHA2, BLAKE, BLAKE2, etc. generated from a file, malware sample, request header, or otherwise.
- `5`: `URL` - A Uniform Resource Locator (URL) or Uniform Resource Indicator (URI).
- `6`: `User Agent` - A User Agent typically seen in HTTP request headers.
- `7`: `Digital Certificate` - The serial number, fingerprint, or full content of an X.509 digital certificate.
- `8`: `Email` - The contents of an email or any related information to an email object.
- `9`: `Email Address` - An email address.
- `10`: `Vulnerability` - A CVE ID, CWE ID, or other identifier for a weakness, exploit, bug, or misconfiguration.
- `99`: `Other` - The indicator type is not directly listed.

The OSINT indicator type ID.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The OSINT indicator type.

### `value`

- **Type**: `string_t`
- **Requirement**: required

The actual indicator value in scope, e.g., a SHA-256 hash hexdigest or a domain name.

### `tlp`

- **Type**: `string_t`
- **Requirement**: recommended

#### Enum values

- `RED`: `TLP:RED` - TLP:RED is for the eyes and ears of individual recipients only, no further disclosure. Sources may use TLP:RED when information cannot be effectively acted upon without significant risk for the privacy, reputation, or operations of the organizations involved. Recipients may therefore not share TLP:RED information with anyone else. In the context of a meeting, for example, TLP:RED information is limited to those present at the meeting.
- `AMBER`: `TLP:AMBER` - TLP:AMBER is for limited disclosure, recipients can only spread this on a need-to-know basis within their organization and its clients. Note that TLP:AMBER+STRICT restricts sharing to the organization only. Sources may use TLP:AMBER when information requires support to be effectively acted upon, yet carries risk to privacy, reputation, or operations if shared outside of the organizations involved. Recipients may share TLP:AMBER information with members of their own organization and its clients, but only on a need-to-know basis to protect their organization and its clients and prevent further harm. Note: if the source wants to restrict sharing to the organization only, they must specify TLP:AMBER+STRICT.
- `AMBER STRICT`: `TLP:AMBER+STRICT` - TLP:AMBER is for limited disclosure, recipients can only spread this on a need-to-know basis within their organization and its clients. Note that TLP:AMBER+STRICT restricts sharing to the organization only. Sources may use TLP:AMBER when information requires support to be effectively acted upon, yet carries risk to privacy, reputation, or operations if shared outside of the organizations involved. Recipients may share TLP:AMBER information with members of their own organization and its clients, but only on a need-to-know basis to protect their organization and its clients and prevent further harm. Note: if the source wants to restrict sharing to the organization only, they must specify TLP:AMBER+STRICT.
- `GREEN`: `TLP:GREEN` - TLP:GREEN is for limited disclosure, recipients can spread this within their community. Sources may use TLP:GREEN when information is useful to increase awareness within their wider community. Recipients may share TLP:GREEN information with peers and partner organizations within their community, but not via publicly accessible channels. TLP:GREEN information may not be shared outside of the community. Note: when “community” is not defined, assume the cybersecurity/defense community.
- `CLEAR`: `TLP:CLEAR` - TLP:CLEAR denotes that recipients can spread this to the world, there is no limit on disclosure. Sources may use TLP:CLEAR when information carries minimal or no foreseeable risk of misuse, in accordance with applicable rules and procedures for public release. Subject to standard copyright rules, TLP:CLEAR information may be shared without restriction.

The [Traffic Light Protocol](https://www.first.org/tlp/) was created to facilitate greater sharing of potentially sensitive information and more effective collaboration. TLP provides a simple and intuitive schema for indicating with whom potentially sensitive information can be shared.

### `confidence_id`

- **Type**: `integer_t`
- **Requirement**: recommended

#### Enum values

- `0`: `Unknown` - The normalized confidence is unknown.
- `1`: `Low`
- `2`: `Medium`
- `3`: `High`
- `99`: `Other` - The confidence is not mapped to the defined enum values. See the `confidence` attribute, which contains a data source specific value.

The normalized confidence refers to the accuracy of collected information related to the OSINT or how pertinent an indicator or analysis is to a specific event or finding. A low confidence means that the information collected or analysis conducted lacked detail or is not accurate enough to qualify an indicator as fully malicious.

### `confidence`

- **Type**: `string_t`
- **Requirement**: optional

The confidence of an indicator being malicious and/or pertinent, normalized to the caption of the confidence_id value. In the case of 'Other', it is defined by the event source or analyst.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: optional

The vendor name of a tool which generates intelligence or provides indicators.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The source URL of an indicator or OSINT analysis, e.g., a URL back to a TIP, report, or otherwise.

### `comment`

- **Type**: `string_t`
- **Requirement**: optional

Analyst commentary or source commentary about an indicator or OSINT analysis.

### `email`

- **Type**: [`email`](email.md)
- **Requirement**: optional

Any email information pertinent to an indicator or OSINT analysis.

### `email_auth`

- **Type**: [`email_auth`](email_auth.md)
- **Requirement**: optional

Any email authentication information pertinent to an indicator or OSINT analysis.

### `kill_chain`

- **Type**: [`kill_chain_phase`](kill_chain_phase.md)
- **Requirement**: optional

Lockheed Martin Kill Chain Phases pertinent to an indicator or OSINT analysis.

### `attacks`

- **Type**: [`attack`](attack.md)
- **Requirement**: optional

MITRE ATT&CK Tactics, Techniques, and/or Procedures (TTPs) pertinent to an indicator or OSINT analysis.

### `vulnerabilities`

- **Type**: [`vulnerability`](vulnerability.md)
- **Requirement**: optional

Any vulnerabilities related to an indicator or OSINT analysis.

### `signatures`

- **Type**: [`digital_signature`](digital_signature.md)
- **Requirement**: optional

Any digital signatures or hashes related to an indicator or OSINT analysis.

### `subdomains`

- **Type**: `string_t`
- **Requirement**: optional

Any pertinent subdomain information - such as those generated by a Domain Generation Algorithm - related to an indicator or OSINT analysis.

### `answers`

- **Type**: [`dns_answer`](dns_answer.md)
- **Requirement**: optional

Any pertinent DNS answers information related to an indicator or OSINT analysis.

### `whois`

- **Type**: [`whois`](whois.md)
- **Requirement**: optional

Any pertinent WHOIS information related to an indicator or OSINT analysis.

### `autonomous_system`

- **Type**: [`autonomous_system`](autonomous_system.md)
- **Requirement**: optional

Any pertinent autonomous system information related to an indicator or OSINT analysis.

### `location`

- **Type**: [`location`](location.md)
- **Requirement**: optional

Any pertinent geolocation information related to an indicator or OSINT analysis.
