# @quire/sync

The sync protocol and both of its halves: the storage-agnostic server push handler and the
client engine (local store, push, rebase, pull), plus the fetch-based HTTP transport.

- Public API: `SyncServer`, `RevisionStore`, `SyncClient`, `LocalStore`, `HttpTransport`, protocol types.
- Depends on: `@quire/merge`, `@quire/vault`. Pure apart from injected fetch.
- Specs: `R-SYN-*`, `R-RVW-01`, `R-RVW-04`.
