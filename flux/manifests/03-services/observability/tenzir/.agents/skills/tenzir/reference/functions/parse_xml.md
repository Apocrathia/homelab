---
title: "parse_xml"
canonical: https://tenzir.com/docs/reference/functions/parse_xml
source: https://tenzir.com/docs/reference/functions/parse_xml.md
section: "Docs"
---

# parse_xml

> Parses a string as XML and extracts elements matching an XPath expression.

Parses a string as XML and extracts elements matching an XPath expression.

```tql
parse_xml(input:string, [xpath=string, attr_prefix=string, text_key=string,
          key_attr=string, force_list=list, max_depth=int, namespaces=string,
          schema=string, selector=string, schema_only=bool, raw=bool,
          unflatten_separator=string]) -> any
```

## Description

The `parse_xml` function parses a string as XML and converts matching elements into records. Elements are selected using an XPath expression, and the function returns a list when multiple elements match.

### `input: string`

The XML string to parse.

### `xpath = string (optional)`

An XPath expression that selects which elements to convert to records.

Defaults to `"/*"`, which selects all immediate children of the root element.

Common XPath patterns:

* `"//book"` - selects all `<book>` elements anywhere in the document
* `"/catalog/book"` - selects `<book>` elements that are direct children of `<catalog>`
* `"//book[1]"` - selects the first `<book>` element
* `"//book[last()]"` - selects the last `<book>` element
* `"//book[@category]"` - selects `<book>` elements that have a `category` attribute
* `"//book[@category='fiction']"` - selects `<book>` elements with a specific attribute value

### `attr_prefix = string (optional)`

A prefix added to attribute names when converting to record fields.

Defaults to `"@"`.

For example, `<book id="1">` becomes `{"@id": "1", ...}` with the default prefix. Set to `""` to omit the prefix entirely.

### `text_key = string (optional)`

The key used for element text content when the element also has attributes or child elements.

Defaults to `"#text"`.

For example, `<item type="A">value</item>` becomes `{"@type": "A", "#text": "value"}`.

### `key_attr = string (optional)`

When set, elements with this attribute use the attribute’s value as the field name instead of the element tag name.

This transforms attribute-keyed XML patterns like:

```xml
<KEY name="QID">10001</KEY>
<KEY name="TITLE">SQL Injection</KEY>
```

Into a flat record:

```tql
{QID: "10001", TITLE: "SQL Injection"}
```

Without `key_attr`, the same XML would produce:

```tql
{KEY: [{"@name": "QID", "#text": "10001"}, {"@name": "TITLE", "#text": "SQL Injection"}]}
```

This option is useful for formats like Qualys vulnerability reports where data is stored in generic elements with name attributes.

### `force_list = list (optional)`

A list of element names that should always be converted to arrays, even when only a single element is present.

Defaults to `[]`.

This is useful when the schema expects a list but the XML sometimes contains only one element.

### `max_depth = int (optional)`

The maximum nesting depth to parse.

Defaults to `10`.

Elements nested deeper than this limit are converted to their string representation.

### `namespaces = string (optional)`

Controls how XML namespace prefixes are handled.

Defaults to `"strip"`.

* `"strip"` - removes namespace prefixes from element and attribute names
* `"keep"` - preserves namespace prefixes in names

### `raw = bool (optional)`

Use only the raw types that are native to the parsed format. Fields that have a type specified in the chosen `schema` will still be parsed according to the schema.

### `schema = string (optional)`

Provide the name of a schema to be used by the parser.

If a schema with a matching name is installed, the result will always have all fields from that schema.

* Fields that are specified in the schema, but did not appear in the input will be null.
* Fields that appear in the input, but not in the schema will also be kept. Use `schema_only=true` to reject fields that are not in the schema.

If the given schema does not exist, this option instead assigns the output schema name only.

The `schema` option is incompatible with the `selector` option.

### `selector = string (optional)`

Designates a field value as schema name with an optional dot-separated prefix.

The string is parsed as `<fieldname>[:<prefix>]`. The `prefix` is optional and will be prepended to the field value to generate the schema name.

For example, the Suricata EVE JSON format includes a field `event_type` that contains the event type. Setting the selector to `event_type:suricata` causes an event with the value `flow` for the field `event_type` to map onto the schema `suricata.flow`.

The `selector` option is incompatible with the `schema` option.

### `schema_only = bool (optional)`

When working with an existing schema, this option will ensure that the output schema has *only* the fields from that schema.

If the schema name is obtained via a `selector` and it does not exist, this has no effect.

This option requires either `schema` or `selector` to be set.

### `unflatten_separator = string (optional)`

A delimiter that, if present in keys, causes values to be treated as values of nested records.

A popular example of this is the [Zeek JSON](../operators/read_zeek_json.md) format. It includes the fields `id.orig_h`, `id.orig_p`, `id.resp_h`, and `id.resp_p` at the top-level. The data is best modeled as an `id` record with four nested fields `orig_h`, `orig_p`, `resp_h`, and `resp_p`.

Without an unflatten separator, the data looks like this:

Without unflattening

```json
{
  "id.orig_h": "1.1.1.1",
  "id.orig_p": 10,
  "id.resp_h": "1.1.1.2",
  "id.resp_p": 5
}
```

With the unflatten separator set to `.`, Tenzir reads the events like this:

With 'unflatten'

```json
{
  "id": {
    "orig_h": "1.1.1.1",
    "orig_p": 10,
    "resp_h": "1.1.1.2",
    "resp_p": 5
  }
}
```

### Duplicate Keys

If the parser encounters a duplicate key in an event, it will transparently upgrade the field to be a list of values instead.

For a simple example, consider this JSON file:

Duplicate Keys

```json
{"key": 7}
{"key": 0.0, "key": 1}
{"key": 42}
```

```tql
{key: 7}
{key: [0.0, 1]}
{key: 42}
```

The values keep their individual types, so the list can mix values of different types:

Mixed Types

```json
{"key": 0.0, "key": "1.1.1.1", "key": "example.com"}
```

```tql
{key: [0.0, 1.1.1.1, "example.com"]}
```

When you provide a `schema` or `selector`, the last value of a repeated key wins instead.

## Examples

### Parse a simple XML document

```tql
from {
  xml: '<catalog><book id="1"><title>XML Guide</title><author>Jane</author></book></catalog>'
}
output = xml.parse_xml(xpath="//book")
```

```tql
{
  xml: "<catalog><book id=\"1\"><title>XML Guide</title><author>Jane</author></book></catalog>",
  output: [
    {
      "@id": "1",
      title: "XML Guide",
      author: "Jane",
    },
  ],
}
```

### Extract multiple elements

```tql
from {
  xml: '<items><item>A</item><item>B</item><item>C</item></items>'
}
output = xml.parse_xml(xpath="//item")
```

```tql
{
  xml: "<items><item>A</item><item>B</item><item>C</item></items>",
  output: ["A", "B", "C"],
}
```

### Handle attributes and text content

```tql
from {
  xml: '<product price="19.99" currency="USD">Widget</product>'
}
output = xml.parse_xml(xpath="/product")
```

```tql
{
  xml: "<product price=\"19.99\" currency=\"USD\">Widget</product>",
  output: [
    {
      "@price": "19.99",
      "@currency": "USD",
      "#text": "Widget",
    },
  ],
}
```

### Strip namespace prefixes

```tql
from {
  xml: '<ns:root xmlns:ns="http://example.com"><ns:item>value</ns:item></ns:root>'
}
output = xml.parse_xml(xpath="//item", namespaces="strip")
```

```tql
{
  xml: "<ns:root xmlns:ns=\"http://example.com\"><ns:item>value</ns:item></ns:root>",
  output: ["value"],
}
```

### Force elements to be lists

```tql
from {
  xml: '<order><item>Widget</item></order>'
}
output = xml.parse_xml(xpath="/order", force_list=["item"])
```

```tql
{
  xml: "<order><item>Widget</item></order>",
  output: [
    {
      item: ["Widget"],
    },
  ],
}
```

### Use XPath predicates to filter elements

```tql
from {
  xml: '<items><item id="1" type="a">first</item><item id="2" type="a">second</item><item id="3" type="b">third</item></items>'
}
first = xml.parse_xml(xpath="//item[1]")
last = xml.parse_xml(xpath="//item[last()]")
type_a = xml.parse_xml(xpath="//item[@type='a']")
select first, last, type_a
```

```tql
{
  first: {
    "@id": "1",
    "@type": "a",
    "#text": "first",
  },
  last: {
    "@id": "3",
    "@type": "b",
    "#text": "third",
  },
  type_a: [
    {
      "@id": "1",
      "@type": "a",
      "#text": "first",
    },
    {
      "@id": "2",
      "@type": "a",
      "#text": "second",
    },
  ],
}
```

### Transform attribute-keyed elements to records

Some XML formats store data in generic elements with name attributes. Use `key_attr` to convert these into flat records:

```tql
from {
  xml: '<record><KEY name="id">123</KEY><KEY name="type">alert</KEY><KEY name="severity">high</KEY></record>'
}
output = xml.parse_xml(xpath="/record", key_attr="name")
```

```tql
{
  xml: "<record><KEY name=\"id\">123</KEY><KEY name=\"type\">alert</KEY><KEY name=\"severity\">high</KEY></record>",
  output: {
    id: "123",
    type: "alert",
    severity: "high",
  },
}
```

## See Also

* [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md)
* [`parse_json`](https://tenzir.com/docs/reference/functions/parse_json.md)
* [`parse_yaml`](https://tenzir.com/docs/reference/functions/parse_yaml.md)
* [Microsoft Windows Event Logs](../../integrations/microsoft/windows-event-logs.md)
