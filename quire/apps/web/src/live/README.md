# live (web)

Live co-editing of the open note: joins the Yjs room, binds the editor, shows other
devices' cursors, and falls back to offline editing when the socket drops.

- Public API: `useLive`, `LiveIndicator`.
- Depends on: `sync/`, `vault/`, y-websocket, y-codemirror.next.
- Specs: `R-LIV-01`, `R-LIV-05`.
