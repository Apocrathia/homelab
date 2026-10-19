# Attestation (attestation)

A cryptographic attestation that an event has not been altered since it was produced and was produced by the holder of a verifiable identity, providing integrity, authenticity, and non-repudiation. The attestation is computed over a canonical serialization of the event: the entire event, including the attestation's own `authority_uid`, `chain_uid`, and `prev_event` attributes, and excluding only the attestation's `fingerprint` and `signatures`. Because `prev_event` is inside the serialized content, deleting or altering an event in a chain breaks the fingerprint and signatures of the event that references it. An attestation may carry more than one signature (for example, a co-signature, notary, or witness over the same event). The verifiable identity is a technical credential, such as a key or certificate, and is not an attribution of any person, organization, or state.

- **Extends**: [Object (object)](object.md)

## Attributes

### `authority_uid`

- **Type**: `string_t`
- **Requirement**: recommended

Unique identifier of the authority that produced this attestation. When the attestation has a signature, `authority_uid` ties the signing credential to a known party: because signing credentials rotate and expire, a verifier uses this identifier to confirm that the credential belongs to the expected authority, rather than to a different holder of some otherwise-valid credential. Where multiple `signatures` are present, it identifies the authority that produced the attestation; the identity of each co-signer is carried within its own `digital_signature` object. Included in the canonical serialization.

### `chain_uid`

- **Type**: `string_t`
- **Requirement**: recommended

Identifier of the append-only chain, such as a forensic or audit log, that this event belongs to. It groups a sequence of attestations so that an independent verifier can locate and validate them in order; it identifies the chain itself and is not a reference to any event outside of this one. Stable for the lifetime of the chain. For example, every attestation produced during a single agent session shares one `chain_uid`, so querying events whose `attestation.chain_uid` matches retrieves the full chain, including its newest entry, while each event links to its predecessor through `prev_event`.

### `fingerprint`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: recommended

The fingerprint of this event's canonical serialization. If `signatures` are present, each signature is computed over this fingerprint. Without signatures, the fingerprint alone still detects accidental alteration or corruption of the event. The next event in a chain references this value through its own `prev_event.fingerprint`.

### `prev_event`

- **Type**: [`prev_event`](prev_event.md)
- **Requirement**: recommended

Reference to the previous event in a tamper-evident chain, carrying that event's fingerprint together with locator attributes for retrieval. Absent on the first, or genesis, event of a chain.

### `signatures`

- **Type**: [`digital_signature`](digital_signature.md)
- **Requirement**: recommended

One or more digital signatures, each computed over this event's `fingerprint` and thereby over the event's canonical serialization, each bound to a verifiable identity. The first entry is typically the producer; additional entries carry co-signatures such as a notary or witness over the same event. The signing algorithm, certificate or public-key material, and signing time are carried within each `digital_signature` object.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

Unique identifier of this attestation. It distinguishes an individual attestation, such as a single entry within a tamper-evident chain, from the chain as a whole. See `chain_uid` for the identifier of the chain itself.
