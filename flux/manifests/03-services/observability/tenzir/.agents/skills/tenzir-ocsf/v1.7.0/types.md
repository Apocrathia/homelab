# Types (1.7.0)

## `boolean_t`

- **Caption**: Boolean
- **Values**: `False`, `True`

Boolean value. One of `true` or `false`.

## `bytestring_t`

- **Caption**: Byte String
- **Base type**: `String`
- **Regex**: `^(?:(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)|(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}==|[A-Za-z0-9_-]{3}=))?$`

Base 64 encoded immutable byte sequence. Traditional Base 64 is preferred but publishers may use URL-safe Base 64 when known to be acceptable to consumers. These encodings are described in RFC 4648.

## `datetime_t`

- **Caption**: Datetime
- **Base type**: `String`
- **Regex**: `^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?([Zz]|[\+-]\d{2}:\d{2})?$`

The Internet Date/Time format as defined in [RFC-3339](https://www.rfc-editor.org/rfc/rfc3339.html). For example:
`2024-09-10T23:20:50.520Z`,
`2024-09-10 23:20:50.520789Z`.

## `email_t`

- **Caption**: Email Address
- **Base type**: `String`
- **Regex**: `^[a-zA-Z0-9!#$%&'*+-/=?^_`{|}~.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$`

Email address. For example:
`john_doe@example.com`.

## `file_name_t`

- **Caption**: File Name
- **Base type**: `String`

File name. For example:
`text-file.txt`.

## `file_path_t`

- **Caption**: File Path
- **Base type**: `String`

The full path to the file. For example: For example:
`c:\windows\system32\svchost.exe`.

## `float_t`

- **Caption**: Float

Real floating-point value. For example:
`3.14`.

## `file_hash_t`

- **Caption**: Hash
- **Base type**: `String`
- **Regex**: `^[a-fA-F0-9]+$`

Hash. A unique value that corresponds to the content of the file, image, ja3_hash or hassh found in the schema. For example:
 MD5: `3172ac7e2b55cbb81f04a6e65855a628`.

## `hostname_t`

- **Caption**: Hostname
- **Base type**: `String`

Unique name assigned to a device connected to a computer network. It may be a fully qualified domain name (FQDN). For example:
`r2-d2.example.com.`,
`mx.example.com`

## `integer_t`

- **Caption**: Integer

Signed integer value.

## `ip_t`

- **Caption**: IP Address
- **Base type**: `String`
- **Regex**: `((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))`

Internet Protocol address (IP address), in either IPv4 or IPv6 format. For example:
`192.168.200.24`,
 `2001:0db8:85a3:0000:0000:8a2e:0370:7334`.

## `json_t`

- **Caption**: JSON

Embedded JSON value. A value can be a string, or a number, or true or false or null, or an object or an array. These structures can be nested. See [www.json.org](https://www.json.org).

## `long_t`

- **Caption**: Long

8-byte long, signed integer value.

## `mac_t`

- **Caption**: MAC Address
- **Base type**: `String`
- **Regex**: `^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$`

Media Access Control (MAC) address. For example:
`18:36:F3:98:4F:9A`.

## `port_t`

- **Caption**: Port
- **Base type**: `Integer`
- **Range**: `0` to `65535`

The TCP/UDP port number. For example:
`80`,
`22`.

## `process_name_t`

- **Caption**: Process Name
- **Base type**: `String`

Process name. For example:
`Notepad`.

## `resource_uid_t`

- **Caption**: Resource UID
- **Base type**: `String`

Resource unique identifier. For example, S3 Bucket name or EC2 Instance ID.

## `string_t`

- **Caption**: String

UTF-8 encoded byte sequence.

## `subnet_t`

- **Caption**: Subnet
- **Base type**: `String`

The subnet represented in a CIDR notation, using the format network_address/prefix_length. The network_address can be in either IPv4 or IPv6 format. The prefix length indicates the number of bits used for the network portion, and the remaining bits are available for host addresses within that subnet. For example:
`192.168.1.0/24`,
`2001:0db8:85a3:0000::/64`

## `timestamp_t`

- **Caption**: Timestamp
- **Base type**: `Long`

The timestamp format is the number of milliseconds since the Epoch 01/01/1970 00:00:00 UTC. For example:
`1618524549901`.

## `url_t`

- **Caption**: URL String
- **Base type**: `String`

Uniform Resource Locator (URL) string. For example:
`http://www.example.com/download/trouble.exe`.

## `username_t`

- **Caption**: User Name
- **Base type**: `String`

User name. For example:
`john_doe`.

## `uuid_t`

- **Caption**: UUID
- **Base type**: `String`
- **Regex**: `[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`

128-bit universal unique identifier. For example:
`123e4567-e89b-12d3-a456-42661417400`.
