# Types (1.0.0)

## `boolean_t`

- **Caption**: Boolean
- **Values**: `False`, `True`

Boolean value. One of `true` or `false`.

## `bytestring_t`

- **Caption**: Byte String
- **Base type**: `String`

Base64 encoded immutable byte sequence.

## `datetime_t`

- **Caption**: Datetime
- **Base type**: `String`
- **Regex**: `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}%3A\d{2}(?:.\d+)?[A-Z]?(?:[.-](?:08:\d{2}|\d{2}[A-Z]))?$`

The Internet Date/Time format as defined in [RFC-3339](https://www.rfc-editor.org/rfc/rfc3339.html). For example `1985-04-12T23:20:50.52Z`.

## `email_t`

- **Caption**: Email Address
- **Base type**: `String`
- **Regex**: `^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$`

Email address. For example: `john_doe@example.com`.

## `file_hash_t`

- **Caption**: File Hash
- **Base type**: `String`

File hash. A unique value that corresponds to the content of the file.

## `file_name_t`

- **Caption**: File Name
- **Base type**: `String`

File name. For example: `text-file.txt`.

## `float_t`

- **Caption**: Float

Real floating-point value. For example: `3.14`.

## `hostname_t`

- **Caption**: Hostname
- **Base type**: `String`
- **Regex**: `^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$`

Unique name assigned to a device connected to a computer network. A domain name in general is an Internet address that can be resolved through the Domain Name System (DNS). For example: `r2-d2.example.com`.

## `integer_t`

- **Caption**: Integer

Signed integer value.

## `ip_t`

- **Caption**: IP Address
- **Base type**: `String`
- **Regex**: `/^(?>(?>([a-f0-9]{1,4})(?>:(?1)){7}|(?!(?:.*[a-f0-9](?>:|$)){8,})((?1)(?>:(?1)){0,6})?::(?2)?)|(?>(?>(?1)(?>:(?1)){5}:|(?!(?:.*[a-f0-9]:){6,})(?3)?::(?>((?1)(?>:(?1)){0,4}):)?)?(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(?>\.(?4)){3}))$/iD`

Internet Protocol address (IP address), in either IPv4 or IPv6 format.

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

Media Access Control (MAC) address. For example: `18:36:F3:98:4F:9A`.

## `port_t`

- **Caption**: Port
- **Base type**: `Integer`
- **Range**: `0` to `65535`

The TCP/UDP port number. For example: `80` or `22`.

## `process_name_t`

- **Caption**: Process Name
- **Base type**: `String`

Process name. For example: `Notepad`.

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

Subnet mask in Classless Inter-Domain Routing (CIDR) notation. For example `192.168.200.0/24`.

## `timestamp_t`

- **Caption**: Timestamp
- **Base type**: `Long`

The timestamp format is the number of milliseconds since the Epoch 01/01/1970 00:00:00 UTC. For example `1618524549901`.

## `url_t`

- **Caption**: URL String
- **Base type**: `String`

Uniform Resource Locator (URL) string. For example: `http://www.example.com/download/trouble.exe`.

## `username_t`

- **Caption**: User Name
- **Base type**: `String`

User name. For example: `john_doe`.

## `uuid_t`

- **Caption**: UUID
- **Base type**: `String`
- **Regex**: `[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`

128-bit universal unique identifier. For example: `123e4567-e89b-12d3-a456-42661417400`.
