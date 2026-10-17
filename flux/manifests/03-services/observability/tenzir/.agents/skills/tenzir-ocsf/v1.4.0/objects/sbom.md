# Software Bill of Materials (sbom)

The Software Bill of Materials object describes characteristics of a generated SBOM.

- **Extends**: [Object (object)](object.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the SBOM was created.

### `package`

- **Type**: [`package`](package.md)
- **Requirement**: required

The device software that is being discovered by an inventory process.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: recommended

The product that generated the SBOM e.g. cdxgen or Syft.

### `software_components`

- **Type**: [`software_component`](software_component.md)
- **Requirement**: required

The list of software components used in the software package.
