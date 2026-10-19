# Function Index

## Aggregation

- [all](functions/all.md): Computes the conjunction (AND) of all grouped boolean values.
- [any](functions/any.md): Computes the disjunction (OR) of all grouped boolean values.
- [collect](functions/collect.md): Creates a list of all non-null grouped values, preserving duplicates.
- [collect_record](functions/collect_record.md): Collects key/value entries or record fragments into a record.
- [count](functions/count.md): Counts the events or non-null grouped values.
- [count_distinct](functions/count_distinct.md): Counts all distinct non-null grouped values.
- [count_if](functions/count_if.md): Counts the events or non-null grouped values matching a given predicate.
- [distinct](functions/distinct.md): Creates a sorted list without duplicates of non-null grouped values.
- [entropy](functions/entropy.md): Computes the Shannon entropy of all grouped values.
- [first](functions/first.md): Takes the first non-null grouped value.
- [frequency_table](functions/frequency_table.md): Builds an exact, mergeable table of categorical value counts.
- [histogram](functions/histogram.md): Builds a fixed-width histogram of all grouped numeric values.
- [hll](functions/hll.md): Builds a mergeable HyperLogLog model for approximate distinct counts.
- [last](functions/last.md): Takes the last non-null grouped value.
- [mad](functions/mad.md): Computes the median absolute deviation of all grouped values.
- [max](functions/max.md): Computes the maximum of all grouped values.
- [mean](functions/mean.md): Computes the mean of all grouped values.
- [median](functions/median.md): Computes the approximate median of all grouped values using a t-digest algorithm.
- [min](functions/min.md): Computes the minimum of all grouped values.
- [mode](functions/mode.md): Takes the most common non-null grouped value.
- [otherwise](functions/otherwise.md): Returns a `fallback` value if `primary` is `null`.
- [quantile](functions/quantile.md): Computes the specified quantile of all grouped values.
- [skewness](functions/skewness.md): Computes the skewness of all grouped values.
- [stddev](functions/stddev.md): Computes the standard deviation of all grouped values.
- [sum](functions/sum.md): Computes the sum of all values.
- [tdigest](functions/tdigest.md): Builds a mergeable t-digest model of a numeric distribution.
- [value_counts](functions/value_counts.md): Returns a list of all grouped values alongside their frequency.
- [variance](functions/variance.md): Computes the variance of all grouped values.

## Bit Operations

- [bit_and](functions/bit_and.md): Computes the bit-wise AND of its arguments.
- [bit_not](functions/bit_not.md): Computes the bit-wise NOT of its argument.
- [bit_or](functions/bit_or.md): Computes the bit-wise OR of its arguments.
- [bit_xor](functions/bit_xor.md): Computes the bit-wise XOR of its arguments.
- [shift_left](functions/shift_left.md): Performs a bit-wise left shift.
- [shift_right](functions/shift_right.md): Performs a bit-wise right shift.

## Decoding

- [decode_base58](functions/decode_base58.md): Decodes bytes as Base58.
- [decode_base64](functions/decode_base64.md): Decodes bytes as Base64.
- [decode_hex](functions/decode_hex.md): Decodes bytes from their hexadecimal representation.
- [decode_url](functions/decode_url.md): Decodes URL encoded strings.

## Distributions

- [ecdf](functions/ecdf.md): Evaluates an empirical cumulative distribution function at a value.
- [jensen_shannon](functions/jensen_shannon.md): Computes the Jensen-Shannon divergence between aligned weight vectors.
- [kolmogorov_smirnov](functions/kolmogorov_smirnov.md): Computes the two-sample Kolmogorov-Smirnov distance.
- [wasserstein](functions/wasserstein.md): Computes the first Wasserstein distance between empirical distributions.

## Encoding

- [encode_base58](functions/encode_base58.md): Encodes bytes as Base58.
- [encode_base64](functions/encode_base64.md): Encodes bytes as Base64.
- [encode_hex](functions/encode_hex.md): Encodes bytes into their hexadecimal representation.
- [encode_url](functions/encode_url.md): Encodes strings using URL encoding.

## Encryption

- [decrypt_aes_gcm](functions/decrypt_aes_gcm.md): Decrypts a value that was encrypted with AES-GCM.
- [decrypt_aes_gcm_siv](functions/decrypt_aes_gcm_siv.md): Decrypts a value that was encrypted with AES-GCM-SIV.
- [decrypt_aes_siv](functions/decrypt_aes_siv.md): Decrypts a value that was encrypted with AES-SIV.
- [decrypt_cryptopan](functions/decrypt_cryptopan.md): Decrypts an IP address via Crypto-PAn.
- [decrypt_ff1](functions/decrypt_ff1.md): Decrypts a string that was encrypted with format-preserving encryption (FF1).
- [decrypt_hpke](functions/decrypt_hpke.md): Decrypts a value that was encrypted with HPKE.
- [encrypt_aes_gcm](functions/encrypt_aes_gcm.md): Encrypts a value with AES-GCM.
- [encrypt_aes_gcm_siv](functions/encrypt_aes_gcm_siv.md): Encrypts a value with AES-GCM-SIV.
- [encrypt_aes_siv](functions/encrypt_aes_siv.md): Encrypts a value deterministically with AES-SIV.
- [encrypt_cryptopan](functions/encrypt_cryptopan.md): Encrypts an IP address via Crypto-PAn.
- [encrypt_ff1](functions/encrypt_ff1.md): Encrypts a string with format-preserving encryption (FF1).
- [encrypt_hpke](functions/encrypt_hpke.md): Encrypts a value for the holder of a private key with HPKE.

## Hashing

- [hash_crc32](functions/hash_crc32.md): Computes a CRC-32 checksum.
- [hash_md5](functions/hash_md5.md): Computes an MD5 hash digest.
- [hash_sha1](functions/hash_sha1.md): Computes a SHA-1 hash digest.
- [hash_sha224](functions/hash_sha224.md): Computes a SHA-224 hash digest.
- [hash_sha256](functions/hash_sha256.md): Computes a SHA-256 hash digest.
- [hash_sha3_224](functions/hash_sha3_224.md): Computes a SHA3-224 hash digest.
- [hash_sha3_256](functions/hash_sha3_256.md): Computes a SHA3-256 hash digest.
- [hash_sha3_384](functions/hash_sha3_384.md): Computes a SHA3-384 hash digest.
- [hash_sha3_512](functions/hash_sha3_512.md): Computes a SHA3-512 hash digest.
- [hash_sha384](functions/hash_sha384.md): Computes a SHA-384 hash digest.
- [hash_sha512](functions/hash_sha512.md): Computes a SHA-512 hash digest.
- [hash_xxh3](functions/hash_xxh3.md): Computes an XXH3 hash digest.
- [hmac](functions/hmac.md): Computes an HMAC (Hash-based Message Authentication Code).

## IP

- [ip_category](functions/ip_category.md): Returns the type classification of an IP address.
- [is_global](functions/is_global.md): Checks whether an IP address is a global address.
- [is_link_local](functions/is_link_local.md): Checks whether an IP address is a link-local address.
- [is_loopback](functions/is_loopback.md): Checks whether an IP address is a loopback address.
- [is_multicast](functions/is_multicast.md): Checks whether an IP address is a multicast address.
- [is_private](functions/is_private.md): Checks whether an IP address is a private address.
- [is_v4](functions/is_v4.md): Checks whether an IP address has version number 4.
- [is_v6](functions/is_v6.md): Checks whether an IP address has version number 6.
- [network](functions/network.md): Retrieves the network address of a subnet.

## List

- [add](functions/add.md): Adds an element into a list if it doesn’t already exist (set-insertion).
- [append](functions/append.md): Inserts an element at the back of a list.
- [autocorrelation](functions/autocorrelation.md): Computes normalized autocorrelation coefficients of a list.
- [dominant_period](functions/dominant_period.md): Recovers the strongest period from a list of timestamps.
- [periodogram](functions/periodogram.md): Computes the spectral power of a list per period.
- [concatenate](functions/concatenate.md): Merges two lists.
- [deltas](functions/deltas.md): Computes the successive differences between list elements.
- [ewma](functions/ewma.md): Computes an exponentially weighted moving average over a list.
- [ewm_variance](functions/ewm_variance.md): Computes an exponentially weighted moving variance over a list.
- [ewm_stddev](functions/ewm_stddev.md): Computes an exponentially weighted moving standard deviation over a list.
- [get](functions/get.md): Gets a field from a record or an element from a list.
- [length](functions/length.md): Retrieves the length of a list.
- [map](functions/map.md): Maps each list element to an expression.
- [prepend](functions/prepend.md): Inserts an element at the start of a list.
- [remove](functions/remove.md): Removes all occurrences of an element from a list.
- [sort](functions/sort.md): Sorts lists and record fields.
- [where](functions/where.md): Filters list elements based on a predicate.
- [zip](functions/zip.md): Combines two lists into a list of pairs.

## Math

- [abs](functions/abs.md): Returns the absolute value.
- [ceil](functions/ceil.md): Computes the ceiling of a number or a time/duration with a specified unit.
- [exp](functions/exp.md): Computes the natural exponential function.
- [floor](functions/floor.md): Computes the floor of a number or a time/duration with a specified unit.
- [log](functions/log.md): Computes a logarithm with an optional base.
- [pow](functions/pow.md): Raises a number to a power.
- [round](functions/round.md): Rounds a number or a time/duration with a specified unit.
- [sqrt](functions/sqrt.md): Computes the square root of a number.

## Models

- [histogram_bucket](functions/histogram_bucket.md): Returns the histogram bucket containing a value.
- [hll_cardinality](functions/hll_cardinality.md): Estimates the distinct cardinality of a [HyperLogLog](https://en.wikipedia.org/wiki/HyperLogLog) model.
- [frequency_table_count](functions/frequency_table_count.md): Returns the exact count of a value in a frequency-table model.
- [model_distance](functions/model_distance.md): Computes a distance between compatible statistical models.
- [model_divergence](functions/model_divergence.md): Computes a divergence between compatible statistical models.
- [model_merge](functions/model_merge.md): Merges compatible statistical model records.
- [tdigest_cdf](functions/tdigest_cdf.md): Estimates a cumulative probability from a t-digest model.
- [tdigest_quantile](functions/tdigest_quantile.md): Estimates a quantile from a t-digest model.

## Networking

- [community_id](functions/community_id.md): Computes the Community ID for a network connection/flow.
- [decapsulate](functions/decapsulate.md): Decapsulates packet data at link, network, and transport layer.

## OCSF

- [ocsf_cast](functions/ocsf_cast.md): Casts an OCSF event record to its OCSF type.
- [ocsf_category_name](functions/ocsf_category_name.md): Returns the `category_name` for a given `category_uid`.
- [ocsf_category_uid](functions/ocsf_category_uid.md): Returns the `category_uid` for a given `category_name`.
- [ocsf_class_name](functions/ocsf_class_name.md): Returns the `class_name` for a given `class_uid`.
- [ocsf_class_uid](functions/ocsf_class_uid.md): Returns the `class_uid` for a given `class_name`.
- [ocsf_derive](functions/ocsf_derive.md): Assigns enum strings of an OCSF event record from their integer counterparts and vice versa.
- [ocsf_trim](functions/ocsf_trim.md): Drops fields from an OCSF event record to reduce its size.
- [ocsf_type_name](functions/ocsf_type_name.md): Returns the `type_name` for a given `type_uid`.
- [ocsf_type_uid](functions/ocsf_type_uid.md): Returns the `type_uid` for a given `type_name`.

## Parsing

- [parse_avro](functions/parse_avro.md): Parses an Apache Avro binary datum.
- [parse_cef](functions/parse_cef.md): Parses a string as a CEF message
- [parse_csv](functions/parse_csv.md): Parses a string as CSV (Comma-Separated Values).
- [parse_grok](functions/parse_grok.md): Parses a string according to a grok pattern.
- [parse_json](functions/parse_json.md): Parses a string as a JSON value.
- [parse_kv](functions/parse_kv.md): Parses a string as key-value pairs.
- [parse_leef](functions/parse_leef.md): Parses a string as a LEEF message
- [parse_ssv](functions/parse_ssv.md): Parses a string as space separated values.
- [parse_syslog](functions/parse_syslog.md): Parses a string as a Syslog message.
- [parse_tsv](functions/parse_tsv.md): Parses a string as tab separated values.
- [parse_winlog](functions/parse_winlog.md): Parses a string as a Windows Event Log XML record.
- [parse_xml](functions/parse_xml.md): Parses a string as XML and extracts elements matching an XPath expression.
- [parse_xsv](functions/parse_xsv.md): Parses a string as delimiter separated values.
- [parse_yaml](functions/parse_yaml.md): Parses a string as a YAML value.

## Printing

- [print_avro](functions/print_avro.md): Encodes a value as an Apache Avro binary datum.
- [print_cef](functions/print_cef.md): Prints records as Common Event Format (CEF) messages
- [print_csv](functions/print_csv.md): Prints a record as a comma-separated string of values.
- [print_json](functions/print_json.md): Transforms a value into a JSON string.
- [print_kv](functions/print_kv.md): Prints records in a key-value format.
- [print_leef](functions/print_leef.md): Prints records as LEEF messages
- [print_ndjson](functions/print_ndjson.md): Transforms a value into a single-line JSON string.
- [print_ssv](functions/print_ssv.md): Prints a record as a space-separated string of values.
- [print_tsv](functions/print_tsv.md): Prints a record as a tab-separated string of values.
- [print_xsv](functions/print_xsv.md): Prints a record as a delimited sequence of values.
- [print_yaml](functions/print_yaml.md): Prints a value as a YAML document.

## Record

- [drop_matching](functions/drop_matching.md): Removes top-level fields from a record when their names match a regular expression.
- [drop_null_fields](functions/drop_null_fields.md): Returns a record with fields whose value is `null` removed.
- [entries](functions/entries.md): Converts a record into a list of key/value entries.
- [get](functions/get.md): Gets a field from a record or an element from a list.
- [has](functions/has.md): Checks whether a record has a specified field.
- [keys](functions/keys.md): Retrieves a list of field names from a record.
- [map_keys](functions/map_keys.md): Renames the top-level fields of a record by applying a lambda to each field name.
- [merge](functions/merge.md): Combines two records into a single record by merging their fields.
- [select_matching](functions/select_matching.md): Selects top-level fields from a record when their names match a regular expression.
- [sort](functions/sort.md): Sorts lists and record fields.
- [values](functions/values.md): Retrieves a list of field values from a record.

## Runtime

- [config](functions/config.md): Reads Tenzir’s configuration file.
- [env](functions/env.md): Reads an environment variable.
- [secret](functions/secret.md): Use the value of a secret.

## Subnet

- [network](functions/network.md): Retrieves the network address of a subnet.

## Time & Date

- [count_days](functions/count_days.md): Counts the number of `days` in a duration.
- [count_hours](functions/count_hours.md): Counts the number of `hours` in a duration.
- [count_microseconds](functions/count_microseconds.md): Counts the number of `microseconds` in a duration.
- [count_milliseconds](functions/count_milliseconds.md): Counts the number of `milliseconds` in a duration.
- [count_minutes](functions/count_minutes.md): Counts the number of `minutes` in a duration.
- [count_months](functions/count_months.md): Counts the number of `months` in a duration.
- [count_nanoseconds](functions/count_nanoseconds.md): Counts the number of `nanoseconds` in a duration.
- [count_seconds](functions/count_seconds.md): Counts the number of `seconds` in a duration.
- [count_weeks](functions/count_weeks.md): Counts the number of `weeks` in a duration.
- [count_years](functions/count_years.md): Counts the number of `years` in a duration.
- [day](functions/day.md): Extracts the day component from a timestamp.
- [days](functions/days.md): Converts a number to equivalent days.
- [format_time](functions/format_time.md): Formats a time into a string that follows a specific format.
- [from_epoch](functions/from_epoch.md): Interprets a duration as Unix time.
- [hour](functions/hour.md): Extracts the hour component from a timestamp.
- [hours](functions/hours.md): Converts a number to equivalent hours.
- [microseconds](functions/microseconds.md): Converts a number to equivalent microseconds.
- [milliseconds](functions/milliseconds.md): Converts a number to equivalent milliseconds.
- [minute](functions/minute.md): Extracts the minute component from a timestamp.
- [minutes](functions/minutes.md): Converts a number to equivalent minutes.
- [month](functions/month.md): Extracts the month component from a timestamp.
- [months](functions/months.md): Converts a number to equivalent months.
- [nanoseconds](functions/nanoseconds.md): Converts a number to equivalent nanoseconds.
- [now](functions/now.md): Gets the current wallclock time.
- [parse_time](functions/parse_time.md): Parses a time from a string that follows a specific format.
- [second](functions/second.md): Extracts the second component from a timestamp with subsecond precision.
- [seconds](functions/seconds.md): Converts a number to equivalent seconds.
- [since_epoch](functions/since_epoch.md): Interprets a time value as duration since the Unix epoch.
- [weeks](functions/weeks.md): Converts a number to equivalent weeks.
- [year](functions/year.md): Extracts the year component from a timestamp.
- [years](functions/years.md): Converts a number to equivalent years.

## Utility

- [search](functions/search.md): Searches recursively for a value within data structures.
- [contains_null](functions/contains_null.md): Checks whether the input contains any `null` values.
- [is_empty](functions/is_empty.md): Checks whether a value is empty.
- [random](functions/random.md): Generates a random number in *\[0,1]*.
- [uuid](functions/uuid.md): Generates a Universally Unique Identifier (UUID) string.

## String

- [file_contents](functions/file_contents.md): Reads a file’s contents.
- [file_name](functions/file_name.md): Extracts the file name from a file path.
- [parent_dir](functions/parent_dir.md): Extracts the parent directory from a file path.
- [ends_with](functions/ends_with.md): Checks whether a string ends with a specified substring.
- [equals](functions/equals.md): Checks whether two strings are equal.
- [is_alnum](functions/is_alnum.md): Checks if a string is alphanumeric.
- [is_alpha](functions/is_alpha.md): Checks if a string contains only alphabetic characters.
- [is_lower](functions/is_lower.md): Checks if a string is in lowercase.
- [is_luhn_valid](functions/is_luhn_valid.md): Checks if a string of digits has a valid Luhn checksum.
- [is_numeric](functions/is_numeric.md): Checks if a string contains only numeric characters.
- [is_printable](functions/is_printable.md): Checks if a string contains only printable characters.
- [is_title](functions/is_title.md): Checks if a string follows title case.
- [is_upper](functions/is_upper.md): Checks if a string is in uppercase.
- [length_bytes](functions/length_bytes.md): Returns the length of a string in bytes.
- [length_chars](functions/length_chars.md): Returns the length of a string in characters.
- [luhn_check_digit](functions/luhn_check_digit.md): Computes the Luhn check digit of a string of digits.
- [match_regex](functions/match_regex.md): Checks if a string partially matches a regular expression.
- [slice](functions/slice.md): Slices a string or list with offsets and strides.
- [starts_with](functions/starts_with.md): Checks whether a string starts with a specified substring.
- [capitalize](functions/capitalize.md): Capitalizes the first character of a string.
- [join](functions/join.md): Joins a list of strings into a single string using a separator.
- [pad_end](functions/pad_end.md): Pads a string at the end to a specified length.
- [pad_start](functions/pad_start.md): Pads a string at the start to a specified length.
- [replace](functions/replace.md): Replaces literal substrings within a string.
- [replace_regex](functions/replace_regex.md): Replaces characters within a string based on a regular expression.
- [repeat](functions/repeat.md): Repeats a string a specified number of times.
- [reverse](functions/reverse.md): Reverses the characters of a string.
- [split](functions/split.md): Splits a string into substrings.
- [split_regex](functions/split_regex.md): Splits a string into substrings with a regex.
- [to_lower](functions/to_lower.md): Converts a string to lowercase.
- [to_title](functions/to_title.md): Converts a string to title case.
- [to_upper](functions/to_upper.md): Converts a string to uppercase.
- [trim](functions/trim.md): Trims whitespace or specified characters from both ends of a string.
- [trim_end](functions/trim_end.md): Trims whitespace or specified characters from the end of a string.
- [trim_start](functions/trim_start.md): Trims whitespace or specified characters from the start of a string.

## Type System

- [blob](functions/blob.md): Converts a UTF-8 string to a blob without encoding it first.
- [duration](functions/duration.md): Casts an expression to a duration value.
- [float](functions/float.md): Casts an expression to a float.
- [int](functions/int.md): Casts an expression to an integer.
- [ip](functions/ip.md): Casts an expression to an IP address.
- [string](functions/string.md): Casts an expression to a string.
- [subnet](functions/subnet.md): Converts an expression to a subnet value.
- [time](functions/time.md): Casts an expression to a time value.
- [uint](functions/uint.md): Casts an expression to an unsigned integer.
- [internal_memory_size](functions/internal_memory_size.md): Estimates the internal memory size of a value in bytes.
- [type_id](functions/type_id.md): Retrieves the type id of an expression.
- [type_of](functions/type_of.md): Retrieves the type definition of an expression.
- [flatten](functions/flatten.md): Flattens nested data.
- [unflatten](functions/unflatten.md): Unflattens nested data.

## Additional Pages

- [contains](functions/contains.md): The `contains` function is a deprecated alias for [`search`](https://tenzir.com/docs/reference/functions/search.md). It still works, but emits a deprecation warning. Replace `contains(input, target)` with `search(input, target)`, or `input.contains(target)` with `input.search(target)`. The `exact` and `ignore_case` options are unchanged.
- [geo_distance](functions/geo_distance.md): Computes the surface distance between two geographic coordinates.
