# sync (server)

The push and change-feed routes, and the local node replicator that syncs this node's heads
with an upstream server through the same SyncClient a browser uses.

- Public API: `syncRoutes` (`/api/sync/push`, `/api/sync/changes`), `createReplicator`.
- Depends on: `@quire/sync`, `shared/`.
- Specs: `R-SYN-*`, `R-PLT-02`.
