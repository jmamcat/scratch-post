---
capability: access
prefix: ACC
---

# Access control

## MODIFIED Requirements

### Requirement R-ACC-02: Named tokens

The server SHALL accept up to 32 named access tokens, one per person or device, created, listed and revoked with `quire tokens add|list|revoke <name>`, stored only as SHA-256 hashes and compared in constant time; a revoked token SHALL stop working at once, and live connections and event streams opened with it SHALL close within 5 seconds. `QUIRE_TOKEN` stays valid as the token named `admin`.

Layer: system

#### Scenario: A token per device

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** the token `phone-token` is added as `phone`
- **THEN** a request for the note list with the token `phone-token` succeeds
- **AND** the cloud server's data folder does not contain `phone-token`
- **WHEN** the token `phone` is revoked
- **THEN** a request for the note list with the token `phone-token` is refused

#### Scenario: Revoking closes live connections

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** the token `tablet-token` is added as `tablet`
- **AND** device `tablet` using the token `tablet-token`
- **AND** `tablet` is editing `p.md` live
- **WHEN** the token `tablet` is revoked
- **THEN** within 5 seconds `tablet` has lost its live connection

#### Scenario: At most 32 tokens

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** 32 tokens are added
- **THEN** adding the token `one-more` as `extra` is refused

#### Scenario: Revoking closes event streams

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** the token `tablet-token` is added as `tablet`
- **AND** device `tablet` using the token `tablet-token`
- **AND** `tablet` is listening to the event stream
- **WHEN** the token `tablet` is revoked
- **THEN** within 5 seconds the event stream of `tablet` has closed
