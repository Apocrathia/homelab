---
title: "Functions"
canonical: https://tenzir.com/docs/reference/functions
source: https://tenzir.com/docs/reference/functions.md
section: "Docs"
---

# Functions

> Functions appear in expressions and take positional and/or named arguments, producing a value as a result of their computation.

Functions appear in [expressions](expressions.md) and take positional and/or named arguments, producing a value as a result of their computation.

Function signatures have the following notation:

```tql
f(arg1:<type>, arg2=<type>, [arg3=type]) -> <type>
```

* `arg:<type>`: positional argument
* `arg=<type>`: named argument
* `[arg=type]`: optional (named) argument
* `-> <type>`: function return type

## Aggregation

### [all](functions/all.md)

Computes the conjunction (AND) of all grouped boolean values.

```tql
all([true,true,false])
```

### [any](functions/any.md)

Computes the disjunction (OR) of all grouped boolean values.

```tql
any([true,false,true])
```

### [collect](functions/collect.md)

Creates a list of all non-null grouped values, preserving duplicates.

```tql
collect([1,2,2,3])
```

### [collect\_record](functions/collect_record.md)

Collects key/value entries or record fragments into a record.

```tql
collect_record([
  ["a", 1],
  ["b", true],
])
```

### [count](functions/count.md)

Counts the events or non-null grouped values.

```tql
count([1,2,null])
```

### [count\_distinct](functions/count_distinct.md)

Counts all distinct non-null grouped values.

```tql
count_distinct([1,2,2,3])
```

### [count\_if](functions/count_if.md)

Counts the events or non-null grouped values matching a given predicate.

```tql
count_if([1,2,null], x => x > 1)
```

### [distinct](functions/distinct.md)

Creates a sorted list without duplicates of non-null grouped values.

```tql
distinct([1,2,2,3])
```

### [entropy](functions/entropy.md)

Computes the Shannon entropy of all grouped values.

```tql
entropy([1,1,2,3])
```

### [first](functions/first.md)

Takes the first non-null grouped value.

```tql
first([null,2,3])
```

### [frequency\_table](functions/frequency_table.md)

Builds an exact, mergeable table of categorical value counts.

```tql
frequency_table(["a","b","a"])
```

### [histogram](functions/histogram.md)

Builds a fixed-width histogram of all grouped numeric values.

```tql
histogram([1,2,3,4], bins=4, width=2.5)
```

### [hll](functions/hll.md)

Builds a mergeable HyperLogLog model for approximate distinct counts.

```tql
hll(["alice","bob","alice"])
```

### [last](functions/last.md)

Takes the last non-null grouped value.

```tql
last([1,2,null])
```

### [mad](functions/mad.md)

Computes the median absolute deviation of all grouped values.

```tql
mad([1,2,3,4,100])
```

### [max](functions/max.md)

Computes the maximum of all grouped values.

```tql
max([1,2,3])
```

### [mean](functions/mean.md)

Computes the mean of all grouped values.

```tql
mean([1,2,3])
```

### [median](functions/median.md)

Computes the approximate median of all grouped values using a t-digest algorithm.

```tql
median([1,2,3,4])
```

### [min](functions/min.md)

Computes the minimum of all grouped values.

```tql
min([1,2,3])
```

### [mode](functions/mode.md)

Takes the most common non-null grouped value.

```tql
mode([1,1,2,3])
```

### [otherwise](functions/otherwise.md)

Returns a `fallback` value if `primary` is `null`.

```tql
x.otherwise(0)
```

### [quantile](functions/quantile.md)

Computes the specified quantile of all grouped values.

```tql
quantile([1,2,3,4], q=0.5)
```

### [skewness](functions/skewness.md)

Computes the skewness of all grouped values.

```tql
skewness([1,1,1,10])
```

### [stddev](functions/stddev.md)

Computes the standard deviation of all grouped values.

```tql
stddev([1,2,3])
```

### [sum](functions/sum.md)

Computes the sum of all values.

```tql
sum([1,2,3])
```

### [tdigest](functions/tdigest.md)

Builds a mergeable t-digest model of a numeric distribution.

```tql
tdigest([1,2,3,4])
```

### [value\_counts](functions/value_counts.md)

Returns a list of all grouped values alongside their frequency.

```tql
value_counts([1,2,2,3])
```

### [variance](functions/variance.md)

Computes the variance of all grouped values.

```tql
variance([1,2,3])
```

## Bit Operations

### [bit\_and](functions/bit_and.md)

Computes the bit-wise AND of its arguments.

```tql
bit_and(lhs, rhs)
```

### [bit\_not](functions/bit_not.md)

Computes the bit-wise NOT of its argument.

```tql
bit_not(x)
```

### [bit\_or](functions/bit_or.md)

Computes the bit-wise OR of its arguments.

```tql
bit_or(lhs, rhs)
```

### [bit\_xor](functions/bit_xor.md)

Computes the bit-wise XOR of its arguments.

```tql
bit_xor(lhs, rhs)
```

### [shift\_left](functions/shift_left.md)

Performs a bit-wise left shift.

```tql
shift_left(lhs, rhs)
```

### [shift\_right](functions/shift_right.md)

Performs a bit-wise right shift.

```tql
shift_right(lhs, rhs)
```

## Decoding

### [decode\_base58](functions/decode_base58.md)

Decodes bytes as Base58.

```tql
decode_base58("JxF12TrwUP45BMd")
```

### [decode\_base64](functions/decode_base64.md)

Decodes bytes as Base64.

```tql
decode_base64("VGVuemly")
```

### [decode\_hex](functions/decode_hex.md)

Decodes bytes from their hexadecimal representation.

```tql
decode_hex("4e6f6E6365")
```

### [decode\_url](functions/decode_url.md)

Decodes URL encoded strings.

```tql
decode_url("Hello%20World")
```

## Distributions

### [ecdf](functions/ecdf.md)

Evaluates an empirical cumulative distribution function at a value.

```tql
ecdf([1,2,2,4], 2)
```

### [jensen\_shannon](functions/jensen_shannon.md)

Computes the Jensen-Shannon divergence between aligned weight vectors.

```tql
jensen_shannon([10,20,0], [5,20,5])
```

### [kolmogorov\_smirnov](functions/kolmogorov_smirnov.md)

Computes the two-sample Kolmogorov-Smirnov distance.

```tql
kolmogorov_smirnov([1,2,3], [2,3,4])
```

### [wasserstein](functions/wasserstein.md)

Computes the first Wasserstein distance between empirical distributions.

```tql
wasserstein([1,2,3], [2,3,4])
```

## Encoding

### [encode\_base58](functions/encode_base58.md)

Encodes bytes as Base58.

```tql
encode_base58("Tenzir")
```

### [encode\_base64](functions/encode_base64.md)

Encodes bytes as Base64.

```tql
encode_base64("Tenzir")
```

### [encode\_hex](functions/encode_hex.md)

Encodes bytes into their hexadecimal representation.

```tql
encode_hex("Tenzir")
```

### [encode\_url](functions/encode_url.md)

Encodes strings using URL encoding.

```tql
encode_url("Hello World")
```

## Encryption

### [decrypt\_aes\_gcm](functions/decrypt_aes_gcm.md)

Decrypts a value that was encrypted with AES-GCM.

```tql
decrypt_aes_gcm(ciphertext, key=$key)
```

### [decrypt\_aes\_gcm\_siv](functions/decrypt_aes_gcm_siv.md)

Decrypts a value that was encrypted with AES-GCM-SIV.

```tql
decrypt_aes_gcm_siv(ciphertext, key=$key)
```

### [decrypt\_aes\_siv](functions/decrypt_aes_siv.md)

Decrypts a value that was encrypted with AES-SIV.

```tql
decrypt_aes_siv(ciphertext, key=$key)
```

### [decrypt\_cryptopan](functions/decrypt_cryptopan.md)

Decrypts an IP address via Crypto-PAn.

```tql
decrypt_cryptopan(1.2.3.4, seed=$seed)
```

### [decrypt\_ff1](functions/decrypt_ff1.md)

Decrypts a string that was encrypted with format-preserving encryption (FF1).

```tql
decrypt_ff1("3480-5050-4367-0686", key=$key)
```

### [decrypt\_hpke](functions/decrypt_hpke.md)

Decrypts a value that was encrypted with HPKE.

```tql
decrypt_hpke(ciphertext, private_key=$private_key)
```

### [encrypt\_aes\_gcm](functions/encrypt_aes_gcm.md)

Encrypts a value with AES-GCM.

```tql
encrypt_aes_gcm("alice@example.com", key=$key)
```

### [encrypt\_aes\_gcm\_siv](functions/encrypt_aes_gcm_siv.md)

Encrypts a value with AES-GCM-SIV.

```tql
encrypt_aes_gcm_siv("alice@example.com", key=$key)
```

### [encrypt\_aes\_siv](functions/encrypt_aes_siv.md)

Encrypts a value deterministically with AES-SIV.

```tql
encrypt_aes_siv("alice@example.com", key=$key)
```

### [encrypt\_cryptopan](functions/encrypt_cryptopan.md)

Encrypts an IP address via Crypto-PAn.

```tql
encrypt_cryptopan(1.2.3.4, seed=$seed)
```

### [encrypt\_ff1](functions/encrypt_ff1.md)

Encrypts a string with format-preserving encryption (FF1).

```tql
encrypt_ff1("4111-1111-1111-1111", key=$key)
```

### [encrypt\_hpke](functions/encrypt_hpke.md)

Encrypts a value for the holder of a private key with HPKE.

```tql
encrypt_hpke("alice@example.com", public_key=$public_key)
```

## Hashing

### [hash\_crc32](functions/hash_crc32.md)

Computes a CRC-32 checksum.

```tql
hash_crc32("foo")
```

### [hash\_md5](functions/hash_md5.md)

Computes an MD5 hash digest.

```tql
hash_md5("foo")
```

### [hash\_sha1](functions/hash_sha1.md)

Computes a SHA-1 hash digest.

```tql
hash_sha1("foo")
```

### [hash\_sha224](functions/hash_sha224.md)

Computes a SHA-224 hash digest.

```tql
hash_sha224("foo")
```

### [hash\_sha256](functions/hash_sha256.md)

Computes a SHA-256 hash digest.

```tql
hash_sha256("foo")
```

### [hash\_sha3\_224](functions/hash_sha3_224.md)

Computes a SHA3-224 hash digest.

```tql
hash_sha3_224("foo")
```

### [hash\_sha3\_256](functions/hash_sha3_256.md)

Computes a SHA3-256 hash digest.

```tql
hash_sha3_256("foo")
```

### [hash\_sha3\_384](functions/hash_sha3_384.md)

Computes a SHA3-384 hash digest.

```tql
hash_sha3_384("foo")
```

### [hash\_sha3\_512](functions/hash_sha3_512.md)

Computes a SHA3-512 hash digest.

```tql
hash_sha3_512("foo")
```

### [hash\_sha384](functions/hash_sha384.md)

Computes a SHA-384 hash digest.

```tql
hash_sha384("foo")
```

### [hash\_sha512](functions/hash_sha512.md)

Computes a SHA-512 hash digest.

```tql
hash_sha512("foo")
```

### [hash\_xxh3](functions/hash_xxh3.md)

Computes an XXH3 hash digest.

```tql
hash_xxh3("foo")
```

### [hmac](functions/hmac.md)

Computes an HMAC (Hash-based Message Authentication Code).

```tql
hmac("foo", secret("hmac-key"))
```

## IP

### [ip\_category](functions/ip_category.md)

Returns the type classification of an IP address.

```tql
ip_category(8.8.8.8)
```

### [is\_global](functions/is_global.md)

Checks whether an IP address is a global address.

```tql
is_global(8.8.8.8)
```

### [is\_link\_local](functions/is_link_local.md)

Checks whether an IP address is a link-local address.

```tql
is_link_local(169.254.1.1)
```

### [is\_loopback](functions/is_loopback.md)

Checks whether an IP address is a loopback address.

```tql
is_loopback(127.0.0.1)
```

### [is\_multicast](functions/is_multicast.md)

Checks whether an IP address is a multicast address.

```tql
is_multicast(224.0.0.1)
```

### [is\_private](functions/is_private.md)

Checks whether an IP address is a private address.

```tql
is_private(192.168.1.1)
```

### [is\_v4](functions/is_v4.md)

Checks whether an IP address has version number 4.

```tql
is_v4(1.2.3.4)
```

### [is\_v6](functions/is_v6.md)

Checks whether an IP address has version number 6.

```tql
is_v6(::1)
```

### [network](functions/network.md)

Retrieves the network address of a subnet.

```tql
10.0.0.0/8.network()
```

## List

### [add](functions/add.md)

Adds an element into a list if it doesn't already exist (set-insertion).

```tql
xs.add(y)
```

### [append](functions/append.md)

Inserts an element at the back of a list.

```tql
xs.append(y)
```

### [autocorrelation](functions/autocorrelation.md)

Computes normalized autocorrelation coefficients of a list.

```tql
xs.autocorrelation()
```

### [dominant\_period](functions/dominant_period.md)

Recovers the strongest period from a list of timestamps.

```tql
times.dominant_period(resolution=5s)
```

### [periodogram](functions/periodogram.md)

Computes the spectral power of a list per period.

```tql
xs.periodogram()
```

### [concatenate](functions/concatenate.md)

Merges two lists.

```tql
concatenate(xs, ys)
```

### [deltas](functions/deltas.md)

Computes the successive differences between list elements.

```tql
xs.deltas()
```

### [ewma](functions/ewma.md)

Computes an exponentially weighted moving average over a list.

```tql
xs.ewma(span=3)
```

### [ewm\_variance](functions/ewm_variance.md)

Computes an exponentially weighted moving variance over a list.

```tql
xs.ewm_variance(span=3)
```

### [ewm\_stddev](functions/ewm_stddev.md)

Computes an exponentially weighted moving standard deviation over a list.

```tql
xs.ewm_stddev(span=3)
```

### [get](functions/get.md)

Gets a field from a record or an element from a list

```tql
xs.get(index, fallback)
```

### [length](functions/length.md)

Retrieves the length of a list.

```tql
[1,2,3].length()
```

### [map](functions/map.md)

Maps each list element to an expression.

```tql
xs.map(x => x + 3)
```

### [prepend](functions/prepend.md)

Inserts an element at the start of a list.

```tql
xs.prepend(y)
```

### [remove](functions/remove.md)

Removes all occurrences of an element from a list.

```tql
xs.remove(y)
```

### [sort](functions/sort.md)

Sorts lists and record fields.

```tql
xs.sort()
```

### [where](functions/where.md)

Filters list elements based on a predicate.

```tql
xs.where(x => x > 5)
```

### [zip](functions/zip.md)

Combines two lists into a list of pairs.

```tql
zip(xs, ys)
```

## Math

### [abs](functions/abs.md)

Returns the absolute value.

```tql
abs(-42)
```

### [ceil](functions/ceil.md)

Computes the ceiling of a number or a time/duration with a specified unit.

```tql
ceil(4.2)
```

### [exp](functions/exp.md)

Computes the natural exponential function.

```tql
exp(1)
```

### [floor](functions/floor.md)

Computes the floor of a number or a time/duration with a specified unit.

```tql
floor(4.8)
```

### [log](functions/log.md)

Computes a logarithm with an optional base.

```tql
log(8, 2)
```

### [pow](functions/pow.md)

Raises a number to a power.

```tql
pow(2, 10)
```

### [round](functions/round.md)

Rounds a number or a time/duration with a specified unit.

```tql
round(4.6)
```

### [sqrt](functions/sqrt.md)

Computes the square root of a number.

```tql
sqrt(49)
```

## Models

### [histogram\_bucket](functions/histogram_bucket.md)

Returns the histogram bucket containing a value.

```tql
histogram_bucket(model, x)
```

### [hll\_cardinality](functions/hll_cardinality.md)

Estimates the distinct cardinality of a HyperLogLog model.

```tql
hll_cardinality(model)
```

### [frequency\_table\_count](functions/frequency_table_count.md)

Returns the exact count of a value in a frequency-table model.

```tql
frequency_table_count(model, x)
```

### [model\_distance](functions/model_distance.md)

Computes a distance between compatible statistical models.

```tql
model_distance(p, q, method="wasserstein")
```

### [model\_divergence](functions/model_divergence.md)

Computes a divergence between compatible statistical models.

```tql
model_divergence(p, q, method="jensen_shannon")
```

### [model\_merge](functions/model_merge.md)

Merges compatible statistical model records.

```tql
model_merge([a,b,c])
```

### [tdigest\_cdf](functions/tdigest_cdf.md)

Estimates a cumulative probability from a t-digest model.

```tql
tdigest_cdf(model, x)
```

### [tdigest\_quantile](functions/tdigest_quantile.md)

Estimates a quantile from a t-digest model.

```tql
tdigest_quantile(model, 0.99)
```

## Networking

### [community\_id](functions/community_id.md)

Computes the Community ID for a network connection/flow.

```tql
community_id(src_ip=1.2.3.4, dst_ip=4.5.6.7, proto="tcp")
```

### [decapsulate](functions/decapsulate.md)

Decapsulates packet data at link, network, and transport layer.

```tql
decapsulate(this)
```

## OCSF

### [ocsf\_cast](functions/ocsf_cast.md)

Casts an OCSF event record to its OCSF type.

```tql
ocsf_cast(ocsf)
```

### [ocsf\_category\_name](functions/ocsf_category_name.md)

Returns the `category_name` for a given `category_uid`.

```tql
ocsf_category_name(2)
```

### [ocsf\_category\_uid](functions/ocsf_category_uid.md)

Returns the `category_uid` for a given `category_name`.

```tql
ocsf_category_uid("Findings")
```

### [ocsf\_class\_name](functions/ocsf_class_name.md)

Returns the `class_name` for a given `class_uid`.

```tql
ocsf_class_name(4003)
```

### [ocsf\_class\_uid](functions/ocsf_class_uid.md)

Returns the `class_uid` for a given `class_name`.

```tql
ocsf_class_uid("DNS Activity")
```

### [ocsf\_derive](functions/ocsf_derive.md)

Assigns enum strings of an OCSF event record from their integer counterparts and vice versa.

```tql
ocsf_derive(ocsf)
```

### [ocsf\_trim](functions/ocsf_trim.md)

Drops fields from an OCSF event record to reduce its size.

```tql
ocsf_trim(ocsf)
```

### [ocsf\_type\_name](functions/ocsf_type_name.md)

Returns the `type_name` for a given `type_uid`.

```tql
ocsf_type_name(400704)
```

### [ocsf\_type\_uid](functions/ocsf_type_uid.md)

Returns the `type_uid` for a given `type_name`.

```tql
ocsf_type_uid("SSH Activity: Fail")
```

## Parsing

### [parse\_avro](functions/parse_avro.md)

Parses an Apache Avro binary datum.

```tql
blob.parse_avro(schema={type: "string"})
```

### [parse\_cef](functions/parse_cef.md)

Parses a string as a CEF message

```tql
string.parse_cef()
```

### [parse\_csv](functions/parse_csv.md)

Parses a string as CSV (Comma-Separated Values).

```tql
string.parse_csv(header=["a","b"])
```

### [parse\_grok](functions/parse_grok.md)

Parses a string according to a grok pattern.

```tql
string.parse_grok("%{IP:client} …")
```

### [parse\_json](functions/parse_json.md)

Parses a string as a JSON value.

```tql
string.parse_json()
```

### [parse\_kv](functions/parse_kv.md)

Parses a string as key-value pairs.

```tql
string.parse_kv()
```

### [parse\_leef](functions/parse_leef.md)

Parses a string as a LEEF message

```tql
string.parse_leef()
```

### [parse\_ssv](functions/parse_ssv.md)

Parses a string as space separated values.

```tql
string.parse_ssv(header=["a","b"])
```

### [parse\_syslog](functions/parse_syslog.md)

Parses a string as a Syslog message.

```tql
string.parse_syslog()
```

### [parse\_tsv](functions/parse_tsv.md)

Parses a string as tab separated values.

```tql
string.parse_tsv(header=["a","b"])
```

### [parse\_winlog](functions/parse_winlog.md)

Parses a string as a Windows Event Log XML record.

```tql
string.parse_winlog()
```

### [parse\_xml](functions/parse_xml.md)

Parses a string as XML and extracts elements matching an XPath expression.

```tql
string.parse_xml(xpath="//element")
```

### [parse\_xsv](functions/parse_xsv.md)

Parses a string as delimiter separated values.

```tql
string.parse_xsv(",", ";", "", header=["a","b"])
```

### [parse\_yaml](functions/parse_yaml.md)

Parses a string as a YAML value.

```tql
string.parse_yaml()
```

## Printing

### [print\_avro](functions/print_avro.md)

Encodes a value as an Apache Avro binary datum.

```tql
value.print_avro(schema={type: "long"})
```

### [print\_cef](functions/print_cef.md)

Prints records as Common Event Format (CEF) messages

```tql
extension.print_cef(cef_version="0", device_vendor="Tenzir", device_product="Tenzir Node", device_version="5.5.0", signature_id=id, name="description", severity="7")
```

### [print\_csv](functions/print_csv.md)

Prints a record as a comma-separated string of values.

```tql
record.print_csv()
```

### [print\_json](functions/print_json.md)

Transforms a value into a JSON string.

```tql
record.print_json()
```

### [print\_kv](functions/print_kv.md)

Prints records in a key-value format.

```tql
record.print_kv()
```

### [print\_leef](functions/print_leef.md)

Prints records as LEEF messages

```tql
attributes.print_leef(vendor="Tenzir",product_name="Tenzir Node", product_name="5.5.0",event_class_id=id)
```

### [print\_ndjson](functions/print_ndjson.md)

Transforms a value into a single-line JSON string.

```tql
record.print_ndjson()
```

### [print\_ssv](functions/print_ssv.md)

Prints a record as a space-separated string of values.

```tql
record.print_ssv()
```

### [print\_tsv](functions/print_tsv.md)

Prints a record as a tab-separated string of values.

```tql
record.print_tsv()
```

### [print\_xsv](functions/print_xsv.md)

Prints a record as a delimited sequence of values.

```tql
record.print_tsv()
```

### [print\_yaml](functions/print_yaml.md)

Prints a value as a YAML document.

```tql
record.print_yaml()
```

## Record

### [drop\_matching](functions/drop_matching.md)

Removes top-level fields from a record when their names match a regular expression.

```tql
record.drop_matching("^debug_")
```

### [drop\_null\_fields](functions/drop_null_fields.md)

Removes fields whose value is null from a record.

```tql
drop_null_fields({a: null, b: 1})
```

### [entries](functions/entries.md)

Converts a record into a list of key/value entries.

```tql
record.entries()
```

### [get](functions/get.md)

Gets a field from a record or an element from a list

```tql
xs.get(index, fallback)
```

### [has](functions/has.md)

Checks whether a record has a specified field.

```tql
record.has("field")
```

### [keys](functions/keys.md)

Retrieves a list of field names from a record.

```tql
record.keys()
```

### [map\_keys](functions/map_keys.md)

Renames record fields by applying a lambda to each field name.

```tql
record.map_keys(key => key.to_lower())
```

### [merge](functions/merge.md)

Combines two records into a single record by merging their fields.

```tql
merge(foo, bar)
```

### [select\_matching](functions/select_matching.md)

Selects top-level fields from a record when their names match a regular expression.

```tql
record.select_matching("^src_")
```

### [sort](functions/sort.md)

Sorts lists and record fields.

```tql
xs.sort()
```

### [values](functions/values.md)

Retrieves a list of field values from a record.

```tql
record.values()
```

## Runtime

### [config](functions/config.md)

Reads Tenzir's configuration file.

```tql
config()
```

### [env](functions/env.md)

Reads an environment variable.

```tql
env("PATH")
```

### [secret](functions/secret.md)

Use the value of a secret.

```tql
secret("KEY")
```

## Subnet

### [network](functions/network.md)

Retrieves the network address of a subnet.

```tql
10.0.0.0/8.network()
```

## Time & Date

### [count\_days](functions/count_days.md)

Counts the number of `days` in a duration.

```tql
count_days(100d)
```

### [count\_hours](functions/count_hours.md)

Counts the number of `hours` in a duration.

```tql
count_hours(100d)
```

### [count\_microseconds](functions/count_microseconds.md)

Counts the number of `microseconds` in a duration.

```tql
count_microseconds(100d)
```

### [count\_milliseconds](functions/count_milliseconds.md)

Counts the number of `milliseconds` in a duration.

```tql
count_milliseconds(100d)
```

### [count\_minutes](functions/count_minutes.md)

Counts the number of `minutes` in a duration.

```tql
count_minutes(100d)
```

### [count\_months](functions/count_months.md)

Counts the number of `months` in a duration.

```tql
count_months(100d)
```

### [count\_nanoseconds](functions/count_nanoseconds.md)

Counts the number of `nanoseconds` in a duration.

```tql
count_nanoseconds(100d)
```

### [count\_seconds](functions/count_seconds.md)

Counts the number of `seconds` in a duration.

```tql
count_seconds(100d)
```

### [count\_weeks](functions/count_weeks.md)

Counts the number of `weeks` in a duration.

```tql
count_weeks(100d)
```

### [count\_years](functions/count_years.md)

Counts the number of `years` in a duration.

```tql
count_years(100d)
```

### [day](functions/day.md)

Extracts the day component from a timestamp.

```tql
ts.day()
```

### [days](functions/days.md)

Converts a number to equivalent days.

```tql
days(100)
```

### [format\_time](functions/format_time.md)

Formats a time into a string that follows a specific format.

```tql
ts.format_time("%d/ %m/%Y")
```

### [from\_epoch](functions/from_epoch.md)

Interprets a duration as Unix time.

```tql
from_epoch(time_ms * 1ms)
```

### [hour](functions/hour.md)

Extracts the hour component from a timestamp.

```tql
ts.hour()
```

### [hours](functions/hours.md)

Converts a number to equivalent hours.

```tql
hours(100)
```

### [microseconds](functions/microseconds.md)

Converts a number to equivalent microseconds.

```tql
microseconds(100)
```

### [milliseconds](functions/milliseconds.md)

Converts a number to equivalent milliseconds.

```tql
milliseconds(100)
```

### [minute](functions/minute.md)

Extracts the minute component from a timestamp.

```tql
ts.minute()
```

### [minutes](functions/minutes.md)

Converts a number to equivalent minutes.

```tql
minutes(100)
```

### [month](functions/month.md)

Extracts the month component from a timestamp.

```tql
ts.month()
```

### [months](functions/months.md)

Converts a number to equivalent months.

```tql
months(100)
```

### [nanoseconds](functions/nanoseconds.md)

Converts a number to equivalent nanoseconds.

```tql
nanoseconds(100)
```

### [now](functions/now.md)

Gets the current wallclock time.

```tql
now()
```

### [parse\_time](functions/parse_time.md)

Parses a time from a string that follows a specific format.

```tql
"10/11/2012".parse_time("%d/%m/%Y")
```

### [second](functions/second.md)

Extracts the second component from a timestamp with subsecond precision.

```tql
ts.second()
```

### [seconds](functions/seconds.md)

Converts a number to equivalent seconds.

```tql
seconds(100)
```

### [since\_epoch](functions/since_epoch.md)

Interprets a time value as duration since the Unix epoch.

```tql
since_epoch(2021-02-24)
```

### [weeks](functions/weeks.md)

Converts a number to equivalent weeks.

```tql
weeks(100)
```

### [year](functions/year.md)

Extracts the year component from a timestamp.

```tql
ts.year()
```

### [years](functions/years.md)

Converts a number to equivalent years.

```tql
years(100)
```

## Utility

### [search](functions/search.md)

Searches for a value within data structures recursively.

```tql
this.search("value")
```

### [contains\_null](functions/contains_null.md)

Checks whether the input contains any `null` values.

```tql
{x: 1, y: null}.contains_null() == true
```

### [is\_empty](functions/is_empty.md)

Checks whether a value is empty.

```tql
"".is_empty()
```

### [random](functions/random.md)

Generates a random number in \*\[0,1]\*.

```tql
random()
```

### [uuid](functions/uuid.md)

Generates a Universally Unique Identifier (UUID) string.

```tql
uuid()
```

## String

### Filesystem

### [file\_contents](functions/file_contents.md)

Reads a file's contents.

```tql
file_contents("/path/to/file")
```

### [file\_name](functions/file_name.md)

Extracts the file name from a file path.

```tql
file_name("/path/to/log.json")
```

### [parent\_dir](functions/parent_dir.md)

Extracts the parent directory from a file path.

```tql
parent_dir("/path/to/log.json")
```

### Inspection

### [ends\_with](functions/ends_with.md)

Checks if a string ends with a specified substring.

```tql
"hello".ends_with("lo")
```

### [equals](functions/equals.md)

Checks whether two strings are equal.

```tql
equals("Get", "GET", ignore_case=true)
```

### [is\_alnum](functions/is_alnum.md)

Checks if a string is alphanumeric.

```tql
"hello123".is_alnum()
```

### [is\_alpha](functions/is_alpha.md)

Checks if a string contains only alphabetic characters.

```tql
"hello".is_alpha()
```

### [is\_lower](functions/is_lower.md)

Checks if a string is in lowercase.

```tql
"hello".is_lower()
```

### [is\_luhn\_valid](functions/is_luhn_valid.md)

Checks if a string of digits has a valid Luhn checksum.

```tql
"4111111111111111".is_luhn_valid()
```

### [is\_numeric](functions/is_numeric.md)

Checks if a string contains only numeric characters.

```tql
"1234".is_numeric()
```

### [is\_printable](functions/is_printable.md)

Checks if a string contains only printable characters.

```tql
"hello".is_printable()
```

### [is\_title](functions/is_title.md)

Checks if a string follows title case.

```tql
"Hello World".is_title()
```

### [is\_upper](functions/is_upper.md)

Checks if a string is in uppercase.

```tql
"HELLO".is_upper()
```

### [length\_bytes](functions/length_bytes.md)

Returns the length of a string in bytes.

```tql
"hello".length_bytes()
```

### [length\_chars](functions/length_chars.md)

Returns the length of a string in characters.

```tql
"hello".length_chars()
```

### [luhn\_check\_digit](functions/luhn_check_digit.md)

Computes the Luhn check digit of a string of digits.

```tql
"7992739871".luhn_check_digit()
```

### [match\_regex](functions/match_regex.md)

Checks if a string partially matches a regular expression.

```tql
"Hi".match_regex("[Hh]i")
```

### [slice](functions/slice.md)

Slices a string with offsets and strides.

```tql
"Hi".slice(begin=2, stride=4)
```

### [starts\_with](functions/starts_with.md)

Checks if a string starts with a specified substring.

```tql
"hello".starts_with("he")
```

### Transformation

### [capitalize](functions/capitalize.md)

Capitalizes the first character of a string.

```tql
"hello".capitalize()
```

### [join](functions/join.md)

Joins a list of strings into a single string using a separator.

```tql
join(["a", "b", "c"], ",")
```

### [pad\_end](functions/pad_end.md)

Pads a string at the end to a specified length.

```tql
"hello".pad_end(10)
```

### [pad\_start](functions/pad_start.md)

Pads a string at the start to a specified length.

```tql
"hello".pad_start(10)
```

### [replace](functions/replace.md)

Replaces characters within a string.

```tql
"hello".replace("o", "a")
```

### [replace\_regex](functions/replace_regex.md)

Replaces characters within a string based on a regular expression.

```tql
"hello".replace("l+o", "y")
```

### [repeat](functions/repeat.md)

Repeats a string a specified number of times.

```tql
"na".repeat(8)
```

### [reverse](functions/reverse.md)

Reverses the characters of a string.

```tql
"hello".reverse()
```

### [split](functions/split.md)

Splits a string into substrings.

```tql
split("a,b,c", ",")
```

### [split\_regex](functions/split_regex.md)

Splits a string into substrings with a regex.

```tql
split_regex("a1b2c", r"\d")
```

### [to\_lower](functions/to_lower.md)

Converts a string to lowercase.

```tql
"HELLO".to_lower()
```

### [to\_title](functions/to_title.md)

Converts a string to title case.

```tql
"hello world".to_title()
```

### [to\_upper](functions/to_upper.md)

Converts a string to uppercase.

```tql
"hello".to_upper()
```

### [trim](functions/trim.md)

Trims whitespace or specified characters from both ends of a string.

```tql
" hello ".trim()
```

### [trim\_end](functions/trim_end.md)

Trims whitespace or specified characters from the end of a string.

```tql
"hello ".trim_end()
```

### [trim\_start](functions/trim_start.md)

Trims whitespace or specified characters from the start of a string.

```tql
" hello".trim_start()
```

## Type System

### Conversion

### [blob](functions/blob.md)

Converts a UTF-8 string to a blob.

```tql
blob("Tenzir")
```

### [duration](functions/duration.md)

Casts an expression to a duration value.

```tql
duration("1.34w")
```

### [float](functions/float.md)

Casts an expression to a float.

```tql
float(42)
```

### [int](functions/int.md)

Casts an expression to an integer.

```tql
int(-4.2)
```

### [ip](functions/ip.md)

Casts an expression to an IP address.

```tql
ip("1.2.3.4")
```

### [string](functions/string.md)

Casts an expression to a string.

```tql
string(1.2.3.4)
```

### [subnet](functions/subnet.md)

Casts an expression to a subnet value.

```tql
subnet("1.2.3.4/16")
```

### [time](functions/time.md)

Casts an expression to a time value.

```tql
time("2020-03-15")
```

### [uint](functions/uint.md)

Casts an expression to an unsigned integer.

```tql
uint(4.2)
```

### Introspection

### [internal\_memory\_size](functions/internal_memory_size.md)

Estimates the internal memory size of a value in bytes.

```tql
internal_memory_size(this)
```

### [type\_id](functions/type_id.md)

Retrieves the type id of an expression.

```tql
type_id(1 + 3.2)
```

### [type\_of](functions/type_of.md)

Retrieves the type definition of an expression.

```tql
type_of(this)
```

### Transposition

### [flatten](functions/flatten.md)

Flattens nested data.

```tql
flatten(this)
```

### [unflatten](functions/unflatten.md)

Unflattens nested data.

```tql
unflatten(this)
```
