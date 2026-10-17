# Scenario step vocabulary

Scenarios in Quire's specs may only use these phrases (GIVEN, WHEN, THEN, AND are
interchangeable keywords). Values in quotes are strings; inside them `\n` means a new line.
Step definitions live in `quire/scenarios/steps/`, one file per capability.

Actors: **the cloud server** (started fresh for every scenario), **local nodes** named in a
step, and **devices** named in a step. On `@system` scenarios a device is a real sync client
with its own local store; on `@ui` scenarios it is a browser running the web app.

## Servers and devices

| Phrase | Meaning |
| --- | --- |
| `a cloud server` | start a fresh cloud server (always the first step) |
| `a cloud server that requires the token "T"` | same, with `QUIRE_TOKEN` |
| `a local node "nas" replicating with the cloud server` | start a local node |
| `device "pixel"` / `devices "a" and "b"` / `devices "a", "b" and "c"` | devices connected to the cloud server, synced once |
| `device "lan" connected to "nas"` | a device served by a local node |
| `the cloud server goes down` / `the cloud server comes back` | stop and restart the cloud server on the same port and data |
| `the vault folder already contains "p" reading "t"` | write a file before the cloud server (re)starts |

## Notes on devices

| Phrase | Meaning |
| --- | --- |
| `"d" has "p" reading "t"` | device creates or sets the note, then syncs |
| `everyone has "p" reading "t"` | first device creates it, everyone syncs |
| `"d" sets "p" to "t"` | replace the whole text |
| `"d" appends "t" to "p"` | add text at the end |
| `"d" replaces "x" with "y" in "p"` | edit part of the text |
| `"d" deletes "p"` | delete the note |
| `"d" goes offline` / `"d" comes back online` | network off; back on and sync, as the app does |
| `"d" syncs` / `everyone syncs` | one sync cycle; for everyone, two rounds in device order |
| `"d" keeps typing "t" at the end of "p" while syncing` | edit during a push round trip |
| `"d" tries to create "p"` / `the request is rejected` / `the note is stored as "p"` | path rules |

## Observations

| Phrase | Meaning |
| --- | --- |
| `"p" on "d" reads "t"` | the device's copy |
| `"p" reads "t" on every device` | every device's copy, and the cloud server's |
| `the cloud server has "p" reading "t"` / `the cloud server has no "p"` | current head |
| `within N seconds the cloud server has "p" reading "t"` | polls until true |
| `within N seconds the cloud server has "p" changed by device "x"` | last revision's device |
| `within N seconds "nas" has "p" reading "t"` | a local node's head |
| `"d" shows "p" as pending sync` / `"d" shows "p" as synced` | the device's sync state |
| `the review inbox shows N open items` / `... N open item for "p"` | open conflicts |
| `the review inbox shows N items under review` | auto-resolved suggestions |
| `the open item for "p" shows "x" from "a" against "y" from "b"` | one hunk: current text and device, incoming text and device |
| `"d" resolves "p" keeping "current"` (or `"incoming"`, `"both"`) | same choice for every hunk |
| `"d" resolves "p" keeping "x" for change 1 and "y" for change 2` | per-hunk choices |
| `"d" accepts the suggestion for "p"` | dismiss a review item |
| `"d" confirms the deletion of "p"` / `"d" keeps "p"` | settle a delete-edit item |

## Vault folder and history

| Phrase | Meaning |
| --- | --- |
| `the vault folder has "p" reading "t"` / `the vault folder has no "p"` | file on the cloud server's disk |
| `another program writes "t" to "p" in the vault folder` | edit outside Quire |
| `the history of "p" lists N revisions, newest first` | revision list |
| `the history of "p" on "nas" lists N revisions` | a local node's revision list |
| `"d" restores the oldest revision of "p"` | restore |
| `a request for the note list without a token is refused` / `... with the token succeeds` / `the health check without a token succeeds` | token rule |

## Live editing and events

| Phrase | Meaning |
| --- | --- |
| `"a" and "b" are editing "p" live` / `"d" is editing "p" live` | join the note's live room |
| `"d" types "t" at the start of "p"` / `... at the end of "p"` | live keystrokes |
| `within N seconds "d" sees "p" reading "t"` | the device's live text |
| `"d" is listening to the event stream` / `the event stream announces a commit of "p" by "x"` | SSE |
| `"d" loses its live connection` / `"d" reconnects` | drop and restore the live room only |
| `"d" pastes N KiB at the end of "p"` | one live insert of N KiB (`@ui`: one insert in the editor) |

## Rendering and the app (`@ui` unless noted)

| Phrase | Meaning |
| --- | --- |
| `"d" opens "p"` | open in the editor |
| `"d" opens "p" in reading view` | open and switch to reading view |
| `the reading view on "d" shows a link "label" to "p"` / `... an unresolved link "label"` | wikilinks |
| `the reading view on "d" shows an image "src"` / `... an embed of "p"` | embeds |
| `the reading view on "d" shows a collapsed callout titled "t"` / `... an expanded callout titled "t"` | callouts |
| `the reading view on "d" shows a checked task "t"` / `... an unchecked task "t"` | task lists |
| `the reading view on "d" shows highlighted "t"` / `... the tag "t"` / `... a footnote` | inline extensions |
| `the reading view on "d" shows the text "t"` / `... does not show "t"` | plain text |
| `the backlinks pane on "d" lists "p"` / `the outline on "d" lists "h"` | right pane |
| `the properties pane on "d" shows "key" as "value"` | front matter |
| `"d" searches for "q"` / `the search results on "d" list "p" first` | search |
| `"d" presses "Ctrl+O"` / `"d" types "t" and presses Enter` | keyboard |
| `"d" runs the command "name"` | command palette |
| `the clock on "d" reads "YYYY-MM-DD HH:mm"` | fixed browser time (local) |
| `"d" types "t" in "p"` | open the note, cursor at the end, type key by key |
| `"p" on "d" contains "t"` | the device's copy includes the text (polls) |
| `the slash menu on "d" offers "label"` / `the slash menu on "d" is closed` | the editor's "Insert" listbox |
| `"d" sees "p" open` / `"d" sees today's daily note open` | the open note |
| `"d" sees the sync status "s"` / `the conflicts badge on "d" shows N` | status bar |
| `"d" sees the banner "t"` | note banner |
| `every note in the rendering gallery renders as approved` | approved outputs (`@system`) |

## Simulation

| Phrase | Meaning |
| --- | --- |
| `N devices make M random edits while going on and offline, with seed S` | seeded random run |
| `every device matches the cloud server` | convergence |
| `the run produced at least one review item` | the run exercised collisions |

## Views, editing modes and themes (change 0002, `@ui`)

| Phrase | Meaning |
| --- | --- |
| `"d" switches the sidebar to "View"` | pick a sidebar view: Folders, Search, Recent, Changes, Domains, Tags, Timeline, Board |
| `the sidebar on "d" shows the "View" view` | the switcher shows that view |
| `the sidebar on "d" shows "title" under "Group"` | a note (by title) inside a group of the current view |
| `the sidebar on "d" lists "title" first` | first entry of a list view |
| `the sidebar on "d" shows the tag "t" with N notes` | Tags view count |
| `the sidebar on "d" shows "title" changed by "device"` | Changes view row |
| `"d" moves "title" to the "Column" column` | Board: change the grouping property |
| `"d" moves "title" to a new column "Name"` | Board: name a new column and move the note into it |
| `"d" groups the board by "key"` | Board: pick the grouping property |
| `"d" reloads the app` | reload the page |
| `"d" puts the cursor on the line "text"` | click into that line of the editor |
| `the editor on "d" shows "t" as a heading without "#"` | Live Preview heading |
| `the editor on "d" shows "t" in bold without "**"` | Live Preview emphasis |
| `the editor on "d" shows the text "t"` | the raw text is visible in the editor |
| `"d" clicks the task "label"` | toggle a checkbox in the open view |
| `"d" clicks "p" in the graph` / `the graph on "d" shows a link from "a" to "b"` / `the graph on "d" shows N notes` | global graph |
| `the local graph on "d" shows "p"` / `... does not show "p"` | right-pane local graph |
| `"d" sets the property "k" to "v"` / `"d" adds the property "k" with "v"` / `"d" removes the property "k"` | properties pane |
| `"d" picks the theme "Name"` / `the app on "d" uses the theme "Name"` | themes |
| `in every theme the headings on "d" look different from each other` | H1, H2, H3 differ in every theme |

## Production hardening (change 0003)

Scenario servers run with `QUIRE_INSECURE_NO_AUTH=1` unless a step sets a token, and with a
1 second change-set gap (`QUIRE_CHANGESET_GAP_MS=1000`; 3 seconds on `@ui` scenarios, because
browser edits reach the server through live rooms that flush 1.5 s after typing stops).

### Access (`@system` unless noted)

| Phrase | Meaning |
| --- | --- |
| `a cloud server starts with no access token` / `the cloud server fails to start with the message "m"` | start without a token and without the insecure flag; the process exits and its output contains `m` |
| `the token "t" is added as "name"` / `the token "name" is revoked` | `quire tokens add` / `revoke` against the cloud server's data folder |
| `N tokens are added` / `adding the token "t" as "name" is refused` | token limit |
| `a request for the note list with the token "t" succeeds` / `... is refused` | a specific token in the header |
| `a request for the note list with the token in the URL is refused` | `?token=` with the configured token |
| `a request for the note list with the token is answered with status N` | the configured token, expecting a status |
| `N requests with a wrong token are made` | failed token checks from this address |
| `the cloud server's data folder does not contain "t"` | no file in the data folder holds the bytes of `t` |
| `device "d" using the token "t"` / `devices "a" and "b" using the token "t"` | devices that authenticate with that token |
| `within N seconds "d" has lost its live connection` | the device's live room closed |
| `a ticket opens the event stream once and is refused the second time` | ticket rules |
| `no request from "d" carries "t" in its URL` | (`@ui`) every request the browser made |
| `a cloud server that allows the origin "o"` | `QUIRE_ALLOWED_ORIGINS` |
| `a request from the origin "o" is allowed` / `... is not allowed` | CORS preflight for the note list |
| `the app page and the note list carry the security headers` | CSP with `frame-ancestors 'none'`, nosniff, no-referrer |
| `"d" tries to save a note of N MiB` / `the request is rejected with status N` | size limits |
| `a cloud server that allows notes of at most N KiB` | `QUIRE_MAX_NOTE_BYTES` |

### Versioning and backup

| Phrase | Meaning |
| --- | --- |
| `a data folder from schema version 1 with "p" reading "t"` / `a data folder from a newer schema version` | a prepared database |
| `a cloud server starts on that data folder` / `the database has the latest schema version` | migrations |
| `N seconds pass` | wait (change sets close after 1 second of quiet in scenarios) |
| `the vault history lists N change sets` | `GET /api/changesets` |
| `change set N of the vault history is by "d" and changed "p, q"` | newest is 1; paths in any order, comma separated |
| `"d" restores the vault to change set N` | the device calls the restore API |
| `"p" is gone from "d"` | the device's store has no live copy of `p` |
| `a cloud server that keeps every revision for N days` | `QUIRE_KEEP_ALL_DAYS` |
| `the cloud server compacts its history` | `quire compact` against its data folder |
| `a cloud server with a backup folder` | `QUIRE_BACKUP_DIR` in a separate temporary folder |
| `within N seconds the backup folder holds a full bundle and at least N incremental bundles` | bundle chain |
| `the backup chain verifies` / `the backup chain does not verify` | `quire backup verify` |
| `within N seconds the backup bundles store the text "t" once` | across all bundles' content stores |
| `a byte of the newest backup bundle is changed` | tamper test |
| `the cloud server's data is lost and restored from the backup folder` / `... as of the first change set` | stop, delete the data folder, `quire restore`, start |
| `the vault history on "d" lists N change sets` / `"d" restores the vault to change set N in the app` | (`@ui`) vault history view, confirm included |

### Operations

| Phrase | Meaning |
| --- | --- |
| `the readiness check succeeds` / `within N seconds the readiness check fails naming "x"` | `/api/ready` |
| `the backup folder becomes unwritable` | the backup folder is replaced by a file (works for root too) |
| `the cloud server's log has a JSON line for "METHOD /path" with status N` / `the cloud server's log does not contain "t"` | process output |
| `the metrics report at least N for "metric"` / `the metrics include "metric"` | `/api/metrics` |
| `the container image is built` / `the Compose stack starts with an access token` | (`@deploy`) Docker |
| `within N seconds the stack's cloud server is healthy` / `the stack's cloud server runs as a non-root user` / `a note written through the stack survives a restart of the stack` | (`@deploy`) |
| `N devices` | that many sync clients on the cloud server |
| `every device makes N edits across M shared notes while K of them type in "p", with seed S` | seeded load run |
| `the 95th percentile push took under N ms` / `no request failed` | load results |

### Rename and attachments

| Phrase | Meaning |
| --- | --- |
| `"d" renames "p" to "q"` | rename with link rewriting (`@system`) |
| `"d" renames the open note to "title"` | (`@ui`) edit the inline title and press Enter |
| `"d" adds the file "p" with N bytes from seed S` | deterministic pseudo-random bytes |
| `"d" has the file "p" with N bytes from seed S` / `the vault folder has the file "p" with N bytes from seed S` | byte-for-byte |
| `the cloud server stores 1 copy of N bytes from seed S` | content store |
| `within N seconds the cloud server has the file "p"` / `within N seconds "nas" has the file "p"` | file head exists |
| `within N seconds "p" on "d" reads "t"` | (`@ui`) polling form |
| `"d" drops the image "name" into the editor` / `"d" drops a file of N MiB into the editor` | (`@ui`) drag and drop with a generated PNG or blob |
| `the reading view on "d" shows the image "name" loaded` / `"d" sees the message "t"` | (`@ui`) |

### Platforms

| Phrase | Meaning |
| --- | --- |
| `the web app is built` / `the first-load JavaScript is under N kB gzip` / `... does not include "pkg"` | the production build's entry chunk and its static imports |
| `device "d" with the demo notes` | (`@ui`) a device after the demo seed is pushed |
| `in every theme the standard screens on "d" pass the UX gate` | (`@ui`, tag `@gate-ux`: runs in the `ux` gate only) UX scorer over every theme, light and dark |

## Release 0.1.0 (change 0004)

| Phrase | Meaning |
| --- | --- |
| `within N seconds the event stream of "d" has closed` | the stream opened by `"d" is listening to the event stream` ended |
| `every line in the cloud server's log is a JSON object` | process output, line by line |
