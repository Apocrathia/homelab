# MITRE D3FEND™ Tactic (d3f_tactic)

The MITRE D3FEND™ Tactic object describes the tactic ID and/or name that is associated to an attack, as defined by [D3FENDTM Matrix](https://d3fend.mitre.org).

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `name`

- **Type**: `string_t`
- **Requirement**: optional

The tactic name that is associated with the defensive technique, as defined by [D3FENDTM Matrix](https://d3fend.mitre.org). For example: `Isolate`.

### `src_url`

- **Type**: `url_t`
- **Requirement**: optional

The versioned permalink of the defensive tactic, as defined by [D3FENDTM Matrix](https://d3fend.mitre.org). For example: `https://d3fend.mitre.org/tactic/d3f:Isolate/`.
