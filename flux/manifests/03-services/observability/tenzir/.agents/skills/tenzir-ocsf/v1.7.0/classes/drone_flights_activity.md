# Drone Flights Activity (drone_flights_activity)

Drone Flights Activity events report the activity of Unmanned Aerial Systems (UAS), their Operators, and mission-planning and authorization metadata as reported by the UAS platforms themselves, by Counter-UAS (CUAS) systems, or other remote monitoring or sensing infrastructure. Based on the Remote ID defined in Standard Specification for Remote ID and Tracking (ASTM Designation: F3411-22a) [ASTM F3411-22a](https://cdn.standards.iteh.ai/samples/112830/71297057ac42432880a203654f213709/ASTM-F3411-22a.pdf)

- **Class UID**: `8001`
- **Category**: Unmanned Systems
- **Extends**: [Unmanned Systems (unmanned_systems)](unmanned_systems.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `src_endpoint`, `unmanned_aerial_system`, `unmanned_system_operator`, `unmanned_system_operating_area`

## Inherited attributes

**From Unmanned Systems:**
- `dst_endpoint` (required)
- `connection_info` (recommended)
- `proxy_endpoint` (recommended)

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: primary
- **Sibling**: `activity_name`

#### Enum values

- `0`: `Unknown` - The event activity is unknown.
- `1`: `Capture` - Remote ID information from an Unmanned System is being captured (collected).
- `2`: `Record` - Unmanned System activity is being recorded.
- `99`: `Other` - The event activity is not mapped. See the `activity_name` attribute, which contains a data source specific value.

The normalized identifier of the activity that triggered the event.

### `auth_protocol`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The authentication type as defined by the caption of `auth_protocol_id`. In the case of 'Other', it is defined by the event source.

### `auth_protocol_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context
- **Sibling**: `auth_protocol`

#### Enum values

- `0`: `Unknown` - The authentication type is unknown.
- `1`: `None`
- `2`: `UAS ID Signature`
- `3`: `Operator ID Signature`
- `4`: `Message Set Signature`
- `5`: `Authentication Provided by Network Remote ID`
- `6`: `Specific Authentication Method`
- `7`: `Reserved`
- `8`: `Private User`
- `99`: `Other` - The authentication type is not mapped. See the `auth_protocol` attribute, which contains a data source specific value.

The normalized identifier of the authentication type used to authorize a flight plan or mission.

### `classification`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

UA Classification - Allows a region to classify UAS in a regional specific manner. The format may differ from region to region.

### `comment`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

This optional, free-text field enables the operator to describe the purpose of a flight, if so desired.

### `protocol_name`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The networking protocol associated with the Remote ID device or beacon. E.g. `BLE`, `LTE`, `802.11`.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: optional
- **Group**: context

The network source endpoint.

### `status`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The normalized Operational status for the Unmanned Aerial System (UAS) normalized to the caption of the `status_id` value. In the case of 'Other', it is defined by the source.

### `status_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `status`

#### Enum values

- `1`: `Undeclared` - The operational status is not reported.
- `2`: `Ground` - The Unmanned Aerial System (UAS) is grounded.
- `3`: `Airborne` - The Unmanned Aerial System (UAS) is airborne.
- `4`: `Emergency` - The Unmanned Aerial System (UAS) is reporting an emergency status.
- `5`: `Remote ID System Failure` - The Unmanned Aerial System (UAS) is reporting the Remote ID beacon or device is malfunctioning or has failed.
- `6`: `Reserved` - An ASTM Reserved status is reported.

The normalized Operational status identifier for the Unmanned Aerial System (UAS).

### `traffic`

- **Type**: [`network_traffic`](../objects/network_traffic.md)
- **Requirement**: optional
- **Group**: context

Traffic refers to the amount of data transmitted from a Unmanned Aerial System (UAS) or Counter Unmanned Aerial System (UAS) (CUAS) system at a given point of time. Ex: `bytes_in` and `bytes_out`.

### `unmanned_aerial_system`

- **Type**: [`unmanned_aerial_system`](../objects/unmanned_aerial_system.md)
- **Requirement**: required
- **Group**: primary

The Unmanned Aerial System object describes the characteristics, Position Location Information (PLI), and other metadata of Unmanned Aerial Systems (UAS) and other unmanned and drone systems used in Remote ID. Remote ID is defined in the Standard Specification for Remote ID and Tracking (ASTM Designation: F3411-22a) [ASTM F3411-22a](https://cdn.standards.iteh.ai/samples/112830/71297057ac42432880a203654f213709/ASTM-F3411-22a.pdf).

### `unmanned_system_operating_area`

- **Type**: [`unmanned_system_operating_area`](../objects/unmanned_system_operating_area.md)
- **Requirement**: recommended
- **Group**: primary

The UAS Operating Area object describes details about a precise area of operations for a UAS flight or mission.

### `unmanned_system_operator`

- **Type**: [`user`](../objects/user.md)
- **Requirement**: required
- **Group**: primary

The human or machine operator of an Unmanned System.
