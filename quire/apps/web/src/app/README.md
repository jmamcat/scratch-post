# app (web)

The application shell: layout state, navigation, commands and the dialogs and drawers that
`App.tsx` composes. Heavy views load on first use (R-PLT-07).

- Public API: none; `App.tsx` imports the files here.
- Lazy chunks: graph and right pane, vault history, review inbox, settings, version history.
- Depends on: every capability through its `index.ts`, and `shared/`.
- Specs: `R-PLT-07`.
