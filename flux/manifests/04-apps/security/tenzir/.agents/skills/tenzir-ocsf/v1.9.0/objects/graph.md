# Graph (graph)

A graph data structure representation with nodes and edges.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The graph description - provides additional details about the graph's purpose and contents.

### `edges`

- **Type**: [`edge`](edge.md)
- **Requirement**: optional

The edges/connections between nodes in the graph - contains the collection of `edge` objects defining relationships between nodes.

### `is_directed`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates if the graph is directed (`true`) or undirected (`false`).

### `name`

- **Type**: `string_t`

The graph name - a human readable identifier for the graph.

### `nodes`

- **Type**: [`node`](node.md)
- **Requirement**: required

The nodes/vertices of the graph - contains the collection of `node` objects that make up the graph.

### `query_language`

- **Type**: `string_t`
- **Requirement**: optional

The graph query language, normalized to the caption of the `query_language_id` value.

### `query_language_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `query_language`

#### Enum values

- `1`: `Cypher` - A declarative graph query language developed by Neo4j that allows for expressive and efficient querying of graph databases.
- `2`: `GraphQL` - A query language for APIs that enables declarative data fetching and provides a complete description of the data in the API.
- `3`: `Gremlin` - A graph traversal language and virtual machine developed by Apache TinkerPop that enables graph computing across different graph databases.
- `4`: `GQL` - An ISO standard graph query language designed to provide a unified way to query graph databases.
- `5`: `G-CORE` - A graph query language that combines features from existing languages while adding support for paths as first-class citizens.
- `6`: `PGQL` - Property Graph Query Language developed by Oracle that provides SQL-like syntax for querying property graphs.
- `7`: `SPARQL` - A semantic query language for databases that enables querying and manipulating data stored in RDF format.

The normalized identifier of a graph query language that can be used to interact with the graph.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The graph type. Typically useful to represent the specific type of graph that is used.

### `uid`

- **Type**: `string_t`

Unique identifier of the graph - a unique ID to reference this specific graph.
