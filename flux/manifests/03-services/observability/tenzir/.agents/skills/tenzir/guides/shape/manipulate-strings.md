---
title: "Manipulate strings"
canonical: https://tenzir.com/docs/guides/shape/manipulate-strings
source: https://tenzir.com/docs/guides/shape/manipulate-strings.md
section: "Docs"
---

# Manipulate strings

> String manipulation is essential for cleaning, formatting, and transforming text data. This guide covers TQL’s comprehensive string functions, from simple case changes to complex pattern matching and encoding operations.

String manipulation is essential for cleaning, formatting, and transforming text data. This guide covers TQL’s comprehensive string functions, from simple case changes to complex pattern matching and encoding operations.

## Change text case

Transform strings to different cases for consistency and formatting:

```tql
from {name: "john smith", title: "data ENGINEER", code: "xyz-123"}
lower_name = name.to_lower()
upper_code = code.to_upper()
title_case = title.to_title()
cap_name = name.capitalize()
```

```tql
{
  name: "john smith",
  title: "data ENGINEER",
  code: "xyz-123",
  lower_name: "john smith",
  upper_code: "XYZ-123",
  title_case: "Data Engineer",
  cap_name: "John smith",
}
```

Functions explained:

* [`to_lower`](https://tenzir.com/docs/reference/functions/to_lower.md) - Converts all characters to lowercase
* [`to_upper`](https://tenzir.com/docs/reference/functions/to_upper.md) - Converts all characters to uppercase
* [`to_title`](https://tenzir.com/docs/reference/functions/to_title.md) - Capitalizes first letter of each word
* [`capitalize`](https://tenzir.com/docs/reference/functions/capitalize.md) - Capitalizes only the first letter

## Trim whitespace

Clean up strings by removing unwanted whitespace:

```tql
from {
  raw: "  hello world  ",
  prefix: "\t\tdata",
  suffix: "value   \n"
}
trimmed = raw.trim()
no_prefix = prefix.trim_start()
no_suffix = suffix.trim_end()
```

```tql
{
  raw: "  hello world  ",
  prefix: "\t\tdata",
  suffix: "value   \n",
  trimmed: "hello world",
  no_prefix: "data",
  no_suffix: "value"
}
```

Functions:

* [`trim`](https://tenzir.com/docs/reference/functions/trim.md) - Removes whitespace from both ends
* [`trim_start`](https://tenzir.com/docs/reference/functions/trim_start.md) - Removes whitespace from beginning
* [`trim_end`](https://tenzir.com/docs/reference/functions/trim_end.md) - Removes whitespace from end

## Split and join strings

Break strings apart and combine them back together:

```tql
from {
  path: "/home/user/documents/report.pdf",
  tags: "security,network,alert"
}
parts = path.split("/")
tag_list = tags.split(",")
rejoined = parts.join("-")
```

```tql
{
  path: "/home/user/documents/report.pdf",
  tags: "security,network,alert",
  parts: [
    "",
    "home",
    "user",
    "documents",
    "report.pdf",
  ],
  tag_list: [
    "security",
    "network",
    "alert",
  ],
  rejoined: "-home-user-documents-report.pdf",
}
```

### Split with regular expressions

Use [`split_regex`](https://tenzir.com/docs/reference/functions/split_regex.md) for complex splitting:

```tql
from {text: "error:42|warning:7|info:125"}
entries = text.split_regex("[:|]")
```

```tql
{
  text: "error:42|warning:7|info:125",
  entries: [
    "error",
    "42",
    "warning",
    "7",
    "info",
    "125",
  ],
}
```

## Find and replace text

Replace specific text or patterns within strings:

### Simple replacement

```tql
from {
  log: "User 192.168.1.1 accessed /admin",
  template: "Hello {name}, welcome to {place}"
}
masked = log.replace("192.168.1.1", "xxx.xxx.xxx.xxx")
filled = template.replace("{name}", "Alice").replace("{place}", "Tenzir")
```

```tql
{
  log: "User 192.168.1.1 accessed /admin",
  template: "Hello {name}, welcome to {place}",
  masked: "User xxx.xxx.xxx.xxx accessed /admin",
  filled: "Hello Alice, welcome to Tenzir",
}
```

### Pattern-based replacement

Use [`replace_regex`](https://tenzir.com/docs/reference/functions/replace_regex.md) for complex replacements:

```tql
from {
  text: "Contact us at 555-1234 or 555-5678",
  log: "Error at 2024-01-15 10:30:45: Connection failed"
}
redacted = text.replace_regex("\\d{3}-\\d{4}", "XXX-XXXX")
simple_log = log.replace_regex(
  "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}",
  "TIMESTAMP"
)
```

```tql
{
  text: "Contact us at 555-1234 or 555-5678",
  log: "Error at 2024-01-15 10:30:45: Connection failed",
  redacted: "Contact us at XXX-XXXX or XXX-XXXX",
  simple_log: "Error at TIMESTAMP: Connection failed",
}
```

## Match patterns

Check if strings match specific patterns:

```tql
from {
  email: "alice@example.com",
  url: "https://tenzir.com",
  file: "report_2024.pdf"
}
is_email = email.match_regex("^[^@]+@[^@]+\\.[^@]+$")
is_https = url.starts_with("https://")
is_pdf = file.ends_with(".pdf")
```

```tql
{
  email: "alice@example.com",
  url: "https://tenzir.com",
  file: "report_2024.pdf",
  is_email: true,
  is_https: true,
  is_pdf: true,
}
```

Pattern matching functions:

* [`match_regex`](https://tenzir.com/docs/reference/functions/match_regex.md) - Test against regular expression
* [`starts_with`](https://tenzir.com/docs/reference/functions/starts_with.md) - Check string prefix
* [`ends_with`](https://tenzir.com/docs/reference/functions/ends_with.md) - Check string suffix

## Match case-insensitively

Many string functions accept an `ignore_case` argument so you can match without first normalizing case with [`to_lower`](https://tenzir.com/docs/reference/functions/to_lower.md). Comparison uses full Unicode case folding, so it handles cases like the German `ß` folding to `ss`:

```tql
from {
  is_get: "Get".starts_with("get", ignore_case=true),
  same_host: "Example.COM".equals("example.com", ignore_case=true),
  has_strasse: "STRASSE".search("straße", ignore_case=true),
}
```

```tql
{
  is_get: true,
  same_host: true,
  has_strasse: true,
}
```

Functions that support `ignore_case`:

* [`starts_with`](https://tenzir.com/docs/reference/functions/starts_with.md) - Check string prefix
* [`ends_with`](https://tenzir.com/docs/reference/functions/ends_with.md) - Check string suffix
* [`search`](https://tenzir.com/docs/reference/functions/search.md) - Search for a substring
* [`equals`](https://tenzir.com/docs/reference/functions/equals.md) - Compare two strings for equality
* [`replace`](https://tenzir.com/docs/reference/functions/replace.md) - Replace a literal substring
* [`split`](https://tenzir.com/docs/reference/functions/split.md) - Split on a literal delimiter

The argument defaults to `false`, preserving case-sensitive matching. For regex functions such as [`match_regex`](https://tenzir.com/docs/reference/functions/match_regex.md), [`replace_regex`](https://tenzir.com/docs/reference/functions/replace_regex.md), and [`split_regex`](https://tenzir.com/docs/reference/functions/split_regex.md), use the inline `(?i)` flag instead.

## Validate string content

Check what type of characters a string contains:

```tql
from {
  id: "12345",
  name: "Alice",
  code: "abc123",
  mixed: "Hello World!",
  spaces: "hello world"
}
id_numeric = id.is_numeric()
name_alpha = name.is_alpha()
code_alnum = code.is_alnum()
mixed_alpha = mixed.is_alpha()
has_lower = spaces.is_lower()
has_upper = name.is_title()
```

```tql
{
  id: "12345",
  name: "Alice",
  code: "abc123",
  mixed: "Hello World!",
  spaces: "hello world",
  id_numeric: true,
  name_alpha: true,
  code_alnum: true,
  mixed_alpha: false,
  has_lower: true,
  has_upper: true,
}
```

Validation functions:

* [`is_numeric`](https://tenzir.com/docs/reference/functions/is_numeric.md) - Contains only digits
* [`is_alpha`](https://tenzir.com/docs/reference/functions/is_alpha.md) - Contains only letters
* [`is_alnum`](https://tenzir.com/docs/reference/functions/is_alnum.md) - Contains only letters and digits
* [`is_lower`](https://tenzir.com/docs/reference/functions/is_lower.md) - All cased characters are lowercase
* [`is_upper`](https://tenzir.com/docs/reference/functions/is_upper.md) - All cased characters are uppercase
* [`is_title`](https://tenzir.com/docs/reference/functions/is_title.md) - String is in title case
* [`is_printable`](https://tenzir.com/docs/reference/functions/is_printable.md) - Contains only printable characters

## Measure string properties

Get information about string characteristics:

```tql
from {
  text: "Hello 世界",
  emoji: "👋 Hello!",
  path: "/var/log/system.log"
}
char_count = text.length_chars()
byte_count = text.length_bytes()
reversed = emoji.reverse()
filename = path.file_name()
directory = path.parent_dir()
```

```tql
{
  text: "Hello 世界",
  emoji: "👋 Hello!",
  path: "/var/log/system.log",
  char_count: 8,
  byte_count: 12,
  reversed: "!olleH 👋",
  filename: "system.log",
  directory: "/var/log",
}
```

String property functions:

* [`length_chars`](https://tenzir.com/docs/reference/functions/length_chars.md) - Count Unicode characters
* [`length_bytes`](https://tenzir.com/docs/reference/functions/length_bytes.md) - Count bytes
* [`reverse`](https://tenzir.com/docs/reference/functions/reverse.md) - Reverse character order
* [`file_name`](https://tenzir.com/docs/reference/functions/file_name.md) - Extract filename from path
* [`parent_dir`](https://tenzir.com/docs/reference/functions/parent_dir.md) - Extract directory from path

## Extract substrings

Use [`slice`](https://tenzir.com/docs/reference/functions/slice.md) to extract portions of strings:

```tql
from {
  text: "Hello, World!",
  id: "USER-12345-ACTIVE",
  timestamp: "2024-01-15T10:30:45"
}
greeting = text.slice(begin=0, end=5)
user_num = id.slice(begin=5, end=10)
date_part = timestamp.slice(begin=0, end=10)
status = id.slice(begin=11)
```

```tql
{
  text: "Hello, World!",
  id: "USER-12345-ACTIVE",
  timestamp: "2024-01-15T10:30:45",
  greeting: "Hello",
  user_num: "12345",
  date_part: "2024-01-15",
  status: "ACTIVE",
}
```

The `slice()` function parameters:

* `begin` - Starting position (0-based, negative counts from end)
* `end` - Ending position (exclusive, optional)
* `stride` - Step between characters (optional, can be negative)

## Encode and decode strings

Transform strings between different encodings:

### Base64 encoding

```tql
from {secret: "my-api-key-12345"}
encoded = secret.encode_base64()
decoded = encoded.decode_base64()
```

```tql
{
  secret: "my-api-key-12345",
  encoded: "bXktYXBpLWtleS0xMjM0NQ==",
  decoded: b"my-api-key-12345",
}
```

### Hex encoding

Use [`encode_hex`](https://tenzir.com/docs/reference/functions/encode_hex.md) and [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md):

```tql
from {data: "Hello", hex_string: "48656c6c6f"}
hex = data.encode_hex()
decoded = hex.decode_hex()
decoded_blob = hex_string.decode_hex()
```

```tql
{
  data: "Hello",
  hex_string: "48656c6c6f",
  hex: "48656C6C6F",
  decoded: b"Hello",
  decoded_blob: b"Hello",
}
```

### URL encoding

```tql
from {query: "search term with spaces & special=characters"}
encoded = query.encode_url()
decoded = encoded.decode_url()
```

```tql
{
  query: "search term with spaces & special=characters",
  encoded: "search%20term%20with%20spaces%20%26%20special%3Dcharacters",
  decoded: b"search term with spaces & special=characters",
}
```

Encoding functions:

* [`encode_base64`](https://tenzir.com/docs/reference/functions/encode_base64.md) / [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md)
* [`encode_hex`](https://tenzir.com/docs/reference/functions/encode_hex.md) / [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md)
* [`encode_url`](https://tenzir.com/docs/reference/functions/encode_url.md) / [`decode_url`](https://tenzir.com/docs/reference/functions/decode_url.md)

## Pad strings

Add characters to reach a specific length:

```tql
from {
  id: "42",
  code: "ABC"
}
padded_id = id.pad_start(5, "0")
padded_code = code.pad_end(10, "-")
```

```tql
{
  id: "42",
  code: "ABC",
  padded_id: "00042",
  padded_code: "ABC-------"
}
```

Padding functions:

* [`pad_start`](https://tenzir.com/docs/reference/functions/pad_start.md) - Add characters to the beginning
* [`pad_end`](https://tenzir.com/docs/reference/functions/pad_end.md) - Add characters to the end

## Repeat strings

Use [`repeat`](https://tenzir.com/docs/reference/functions/repeat.md) to repeat a string a fixed number of times:

```tql
from {separator: "-"}
line = separator.repeat(8)
```

```tql
{
  separator: "-",
  line: "--------",
}
```

## Read file contents

Access text from files during processing:

```tql
from {}
hostname = file_contents("/etc/hostname")
```

```tql
{
  hostname: "my-server\n",
}
```

The [`file_contents`](https://tenzir.com/docs/reference/functions/file_contents.md) function reads the entire file as a string. The file path must be a constant expression. Use with caution on large files.

## Practical examples

### Clean and normalize user input

```tql
from {
  user_input: "  JOHN.SMITH@EXAMPLE.COM  ",
  phone: "(555) 123-4567"
}
email = user_input.trim().to_lower()
clean_phone = phone.replace_regex("[^0-9]", "")
```

```tql
{
  user_input: "  JOHN.SMITH@EXAMPLE.COM  ",
  phone: "(555) 123-4567",
  email: "john.smith@example.com",
  clean_phone: "5551234567"
}
```

### Extract and validate identifiers

```tql
from {
  log: "User ID: ABC-123-XYZ performed action",
  url: "https://api.example.com/v2/users/42"
}
user_id = log.split("User ID: ")[1].split(" ")[0]
valid_id = user_id.match_regex("^[A-Z]{3}-\\d{3}-[A-Z]{3}$")
api_version = url.split("/")[3]
user_num = url.split("/").last()
```

```tql
{
  log: "User ID: ABC-123-XYZ performed action",
  url: "https://api.example.com/v2/users/42",
  user_id: "ABC-123-XYZ",
  valid_id: true,
  api_version: "v2",
  user_num: "42",
}
```

### Build formatted output

```tql
from {
  first: "alice",
  last: "smith",
  dept: "engineering",
  id: 42
}
full_name = f"{first.capitalize()} {last.to_upper()}"
email = f"{first}.{last}@company.com"
badge = f"{dept.to_upper().slice(begin=0, end=3)}-{id}"
```

```tql
{
  first: "alice",
  last: "smith",
  dept: "engineering",
  id: 42,
  full_name: "Alice SMITH",
  email: "alice.smith@company.com",
  badge: "ENG-42",
}
```

## Generate hash values

Create checksums and identifiers using hash functions:

### Common hash algorithms

```tql
from {data: "Hello, World!"}
md5 = data.hash_md5()
sha1 = data.hash_sha1()
sha256 = data.hash_sha256()
xxh3 = data.hash_xxh3()
```

```tql
{
  data: "Hello, World!",
  md5: "65a8e27d8879283831b664bd8b7f0ad4",
  sha1: "0a0a9f2a6772942557ab5355d76af442f8f65e01",
  sha256: "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f",
  xxh3: "60415d5f616602aa",
}
```

Hash functions:

* [`hash_md5`](https://tenzir.com/docs/reference/functions/hash_md5.md) - MD5 digest (128-bit)
* [`hash_sha1`](https://tenzir.com/docs/reference/functions/hash_sha1.md) - SHA-1 digest (160-bit)
* [`hash_sha224`](https://tenzir.com/docs/reference/functions/hash_sha224.md) - SHA-224 digest
* [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md) - SHA-256 digest
* [`hash_sha384`](https://tenzir.com/docs/reference/functions/hash_sha384.md) - SHA-384 digest
* [`hash_sha512`](https://tenzir.com/docs/reference/functions/hash_sha512.md) - SHA-512 digest
* [`hash_sha3_224`](https://tenzir.com/docs/reference/functions/hash_sha3_224.md) - SHA3-224 digest
* [`hash_sha3_256`](https://tenzir.com/docs/reference/functions/hash_sha3_256.md) - SHA3-256 digest
* [`hash_sha3_384`](https://tenzir.com/docs/reference/functions/hash_sha3_384.md) - SHA3-384 digest
* [`hash_sha3_512`](https://tenzir.com/docs/reference/functions/hash_sha3_512.md) - SHA3-512 digest
* [`hash_xxh3`](https://tenzir.com/docs/reference/functions/hash_xxh3.md) - XXH3 digest (fast, 64-bit)

### Create unique identifiers

Use hashes to generate identifiers from multiple fields:

```tql
from {
  user_id: "alice123",
  timestamp: "2024-01-15T10:30:00",
  action: "login"
}
event_id = f"{user_id}-{timestamp}-{action}".hash_sha256().slice(begin=0, end=16)
short_hash = f"{user_id}{action}".hash_md5().slice(begin=0, end=8)
numeric_id = user_id.hash_xxh3()
```

```tql
{
  user_id: "alice123",
  timestamp: "2024-01-15T10:30:00",
  action: "login",
  event_id: "d5f456083b8fee43",
  short_hash: "1616f7f2",
  numeric_id: "ac6dfe13bd512d81",
}
```

### Verify data integrity

```tql
from {
  file_content: "Important document content here...",
  expected_checksum: "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f"
}
actual_checksum = file_content.hash_sha256()
valid = actual_checksum == expected_checksum
```

```tql
{
  file_content: "Important document content here...",
  expected_checksum: "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f",
  actual_checksum: "25f898ef7be64ead26e775e41778c6b5b5e5fe135d1b6658b6a27f9334c4f085",
  valid: false,
}
```

## Network security functions

Process network data with specialized security functions:

### Generate Community IDs

Use [`community_id`](https://tenzir.com/docs/reference/functions/community_id.md) to create standardized flow hashes:

```tql
from {
  src_ip: 192.168.1.100,
  dst_ip: 10.0.0.1,
  src_port: 54321,
  dst_port: 443,
  proto: "tcp"
}
flow_id = community_id(
  src_ip=src_ip,
  dst_ip=dst_ip,
  src_port=src_port,
  dst_port=dst_port,
  proto=proto
)
```

```tql
{
  src_ip: 192.168.1.100,
  dst_ip: 10.0.0.1,
  src_port: 54321,
  dst_port: 443,
  proto: "tcp",
  flow_id: "1:ZSU9hCO1tdr7pj3SCLkQ0XS3uvI=",
}
```

### Anonymize IP addresses

Use [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md) for consistent IP anonymization:

```tql
from {
  client_ip: 192.168.1.100,
  server_ip: 8.8.8.8,
  internal_ip: 10.0.0.5
}
anon_client = client_ip.encrypt_cryptopan(seed="mysecretkey12345")
anon_server = server_ip.encrypt_cryptopan(seed="mysecretkey12345")
anon_internal = internal_ip.encrypt_cryptopan(seed="mysecretkey12345")
```

```tql
{
  client_ip: 192.168.1.100,
  server_ip: 8.8.8.8,
  internal_ip: 10.0.0.5,
  anon_client: 206.216.1.132,
  anon_server: 110.0.51.203,
  anon_internal: 109.255.195.194,
}
```

## Best practices

1. **Chain operations efficiently**: Combine multiple string operations in one expression
2. **Validate before transforming**: Check string content before applying operations
3. **Handle edge cases**: Empty strings, null values, and special characters
4. **Use appropriate functions**: Choose `length_chars()` vs `length_bytes()` based on needs
5. **Be mindful of encoding**: Ensure correct encoding when dealing with international text

## See also

* [Parse string fields](../parse/parse-string-fields.md)
* [Transform values](transform-values.md)
* [Filter and select data](../optimize/filter-and-select-data.md)
