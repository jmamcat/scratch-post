# live (server)

Real-time editing: one Yjs room per open note on the y-websocket protocol, committed to the
revision log after typing pauses, plus the Server-Sent Events stream of commits.

- Public API: `createLiveRooms` (WebSocket `/live?path=`), `eventRoutes` (`/api/events`).
- Depends on: `@quire/merge`, `@quire/sync`, `shared/`.
- Specs: `R-LIV-*`; rooms also enforce the note size limit (R-ACC-06).
