# Kill Chain Phase (kill_chain_phase)

The Kill Chain Phase object represents a single phase of a cyber attack, including the initial reconnaissance and planning stages up to the final objective of the attacker. It provides a detailed description of each phase and its associated activities within the broader context of a cyber attack. See [Cyber Kill Chain®](https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html).

- **Extends**: [Object (object)](object.md)

## Attributes

### `phase`

- **Type**: `string_t`
- **Requirement**: recommended

The cyber kill chain phase.

### `phase_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `phase`

#### Enum values

- `0`: `Unknown` - The kill chain phase is unknown.
- `1`: `Reconnaissance` - The attackers pick a target and perform a detailed analysis, start collecting information (email addresses, conferences information, etc.) and evaluate the victim’s vulnerabilities to determine how to exploit them.
- `2`: `Weaponization` - The attackers develop a malware weapon and aim to exploit the discovered vulnerabilities.
- `3`: `Delivery` - The intruders will use various tactics, such as phishing, infected USB drives, etc.
- `4`: `Exploitation` - The intruders start leveraging vulnerabilities to executed code on the victim’s system.
- `5`: `Installation` - The intruders install malware on the victim’s system.
- `6`: `Command & Control` - Malware opens a command channel to enable the intruders to remotely manipulate the victim's system.
- `7`: `Actions on Objectives` - With hands-on keyboard access, intruders accomplish the mission’s goal.
- `99`: `Other` - The kill chain phase is not mapped. See the `phase` attribute, which contains a data source specific value.

The cyber kill chain phase identifier.
