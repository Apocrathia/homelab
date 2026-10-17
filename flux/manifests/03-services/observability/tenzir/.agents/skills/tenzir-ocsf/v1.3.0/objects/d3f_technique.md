# MITRE DEFEND™ Technique (d3f_technique)

The MITRE DEFEND™ Technique object describes the leaf defensive technique ID and/or name associated to a countermeasure, as defined by [D3FENDTM Matrix](https://d3fend.mitre.org).

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `name`

- **Type**: `string_t`

The name of the defensive technique, as defined by [D3FENDTM Matrix](https://d3fend.mitre.org). For example: `IO Port Restriction`.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The versioned permalink of the defensive technique, as defined by [D3FENDTM Matrix](https://d3fend.mitre.org). For example: `https://d3fend.mitre.org/technique/d3f:IOPortRestriction/`.

### `uid`

- **Type**: `string_t`

The unique identifier of the defensive technique, as defined by [D3FENDTM Matrix](https://mitre.mitre.org). For example: `D3-IOPR`.
