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
