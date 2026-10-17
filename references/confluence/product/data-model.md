# Confluence (Cloud): data model

How Confluence stores, versions, syncs and exports content, and what each part means for a Markdown-file app. Feature IDs refer to features.md. Sources are listed at the bottom.

## Content model

```
site
  space (key, name, type: global | personal; overview page; settings; permissions)
    content tree
      page        (title, body, parent, position, status, labels, versions, comments, attachments)
      live doc    (same as page; autosaved, no drafts, convertible to/from page)
      folder      (title, children only; no body)
      whiteboard  (canvas; own 30-day history)
      database    (typed fields, views; own 30-day history)
      smart link  (URL as a tree item)
    blog posts    (date-stamped, outside the tree)
    templates     (space templates; global templates live at site level)
    archive, trash
```

| Object | Key facts | Quire mapping |
| --- | --- | --- |
| Space | Container with key, overview page, sidebar, roles. Personal spaces exist per user. | Top-level folder; `index.md` as overview; space settings in a small config file; access rules on the server only. |
| Page | Body plus metadata; any page can have children; title emoji, cover, width, content status. | `Title.md` with YAML frontmatter (`status`, `tags`, `icon`, `cover`); folder note for children. |
| Live doc | Page variant: autosave, no drafts, no publish, versions coalesced. | Default Quire behaviour for every note. |
| Blog post | Dated post per space. | `blog/YYYY-MM-DD-slug.md`. |
| Folder | Passive node; deleting it moves children up a level. | Directory. |
| Attachment | Belongs to one content item; same-name upload creates a new version; labels allowed; no revert to an older version in the UI. | File in an attachments folder beside the note (Obsidian setting); versions via the revision store. |
| Label | Lowercase, hyphenated; on pages, live docs, blog posts and attachments; queried by CQL and macros. | `tags:` frontmatter or inline `#tag`. |
| Version | Integer number, author, timestamp, optional version comment; created per publish (pages) or per editing burst (live docs). | Revision record: file snapshot or commit plus author, time, message. |
| Comment | General (footer) or inline (anchored to a text range, image or video); threaded; inline roots resolvable. | Sidecar file per note with anchors; not in the Markdown body. |
| Content status | Space-defined list of statuses. | `status:` frontmatter, values from the space config. |
| Restriction | Per-item view/edit limits to users or groups. | Server-side only. |

## Storage format versus ADF

Confluence has two body representations. Both are exposed by the REST API (`body-format=storage` or `atlas_doc_format`).

**Storage format** (legacy editor's native format): XHTML with Confluence namespaces. Example shapes (unverified in this review, from prior Atlassian documentation):

```xml
<ac:structured-macro ac:name="info">
  <ac:rich-text-body><p>Read this first.</p></ac:rich-text-body>
</ac:structured-macro>
<ac:link><ri:page ri:content-title="Release plan" /></ac:link>
<ac:task-list>
  <ac:task><ac:task-status>incomplete</ac:task-status><ac:task-body>Ship it</ac:task-body></ac:task>
</ac:task-list>
<p><ac:inline-comment-marker ac:ref="UUID">commented text</ac:inline-comment-marker></p>
```

**Atlassian Document Format (ADF)**: the cloud editor's native JSON tree (ProseMirror-style; the ProseMirror lineage is unverified). Root `doc` with `version` and `content`; nodes carry `type`, `content`, `attrs`, `marks`.

- Block nodes: `blockquote`, `bulletList`, `codeBlock`, `expand`, `heading`, `mediaGroup`, `mediaSingle`, `orderedList`, `panel`, `paragraph`, `rule`, `table`, `syncBlock`, `bodiedSyncBlock`, `multiBodiedExtension`; child nodes `listItem`, `media`, `nestedExpand`, `tableRow`, `tableHeader`, `tableCell`, `blockTaskItem`, `extensionFrame`.
- Inline nodes: `text`, `hardBreak`, `date`, `emoji`, `mention`, `status`, `inlineCard` (Smart Link), `mediaInline`.
- Marks: `strong`, `em`, `strike`, `code`, `link`, `underline`, `subsup`, `textColor`, `border` (plus `backgroundColor` listed in navigation). Inline comments use an `annotation` mark (unverified).

```json
{"version":1,"type":"doc","content":[
  {"type":"panel","attrs":{"panelType":"info"},"content":[
    {"type":"paragraph","content":[{"type":"text","text":"Read this first."}]}]}]}
```

The legacy editor was retired on 2026-04-01; all content is now edited in the cloud editor. Content the cloud editor could not convert sits in a view-only Legacy Content Macro (CNF-F-040). The REST API returns `atlas_doc_format` as a JSON string that must be parsed again (third-party source, unverified).

**Mapping summary for import into Quire**

| ADF / storage construct | Markdown | Fidelity |
| --- | --- | --- |
| paragraph, heading, lists, blockquote, rule, codeBlock | CommonMark | lossless |
| strong, em, strike, code, link | CommonMark/GFM | lossless |
| underline, subsup | `<u>`, `<sub>`, `<sup>` | lossless via HTML |
| textColor, backgroundColor, border | `<span style>` or dropped | lossy |
| table (simple) | GFM table | lossless |
| table (merged cells, block content, widths) | HTML table | lossy in editors that do not render HTML |
| panel (info/note/success/warning/error) | `> [!type]` callout | lossless for type; custom color/emoji lost |
| expand, nestedExpand | `<details>` or `> [!note]-` | lossless |
| task list / blockTaskItem | `- [ ]` | lossless for state; assignee/due date by convention |
| decision | `> [!decision]` | convention |
| status, date, mention, emoji (custom) | tag/span, ISO date, `@handle`, `:shortcode:` | convention |
| mediaSingle, mediaGroup | `![[file]]` | lossless for file; layout/caption by convention |
| inlineCard (Smart Link) | bare URL or `[title](url)` | display mode lost |
| syncBlock, excerpt, include | `![[Note#^id]]` | lossless as a reference |
| layout sections | flattened in order | lossy |
| extensions/macros (Jira, reports, apps) | link or placeholder code block | lossy |

## Concurrent editing

- **Online:** pages support real-time co-editing by up to 30 people; live docs up to 40 editors and 100 viewers. Changes sync automatically; presence avatars show active (color) and departed (greyscale) editors (CNF-F-068, CNF-F-069).
- **Engine:** "Synchrony" is the name Atlassian documents for the collaborative editing service in Data Center and Server (separate JVM, default port 8091). Confluence Cloud's collaborative backend is Atlassian-run and its internals are not documented on the help center (Cloud use of Synchrony is unverified).
- **Shared draft:** on pages, all editors share one unpublished state. Unpublished changes are visible to other editors, marked by a badge, reviewable with "View changes", and discardable with "Revert to previous version" (unrecoverable). Comments made during an editing session are visible only to editors until publish (CNF-F-063, CNF-F-075).
- **No online merge conflicts:** because edits stream in real time, Confluence does not present merge conflicts during normal online editing. Conflicts appear only after offline editing (below).

## Version history and conflict presentation

| Surface | Behaviour |
| --- | --- |
| Version history list | From the page menu; one row per version with author, date, version comment (CNF-F-057). |
| Compare | Select two versions by checkbox, then "Compare selected versions"; differences shown; large unchanged sections collapsed (CNF-F-059). Older Atlassian docs describe added lines in green and removed lines in red; current Cloud colors and inline versus side-by-side layout are unverified. |
| Restore | "Restore this version" copies the old content as the newest version; all later versions kept (CNF-F-060). |
| Delete version | Permanent, no trash, remaining versions renumbered (CNF-F-061). |
| Live docs | Version opens when editing begins and closes about 10 to 15 minutes after the last edit; compare and revert from More actions (CNF-F-065). |
| Whiteboards, databases | 30 days of history; restore creates a new whiteboard or database (counts toward plan limits for whiteboards) (CNF-F-067). |
| Attachments | Versions listed under the attachment in the Attachments panel; download or share old versions; no revert (CNF-F-066). |
| Offline conflict | After reconnect: automatic merge of as much as possible; same-region conflicts highlighted; a conflict notification; per conflict the user keeps offline edits, keeps the online version, or combines manually, then applies the decision (CNF-F-114). |

Design input for Quire's merge-conflict review UI, drawn from the rows above:

1. Auto-merge non-overlapping changes; surface only true conflicts.
2. Entry point is a notification on the affected note, not a modal on reconnect.
3. Per conflict: Keep mine, Keep theirs, Edit combined (Confluence's three choices).
4. Show context with unchanged runs collapsed, as in version compare.
5. Applying a resolution writes a new revision; both inputs remain in history (append-only, like restore).
6. Any revision can be compared with any other, so a bad resolution can be inspected and undone by restore.

## Offline and mobile

- Pages, live docs, blog posts and slides that were opened while online can be viewed and edited offline; changes are saved locally in the browser or app and synced automatically (CNF-F-113).
- Not available offline: creating new content, Rovo and AI writing, some macros, integrations, external media (CNF-F-115).
- Local offline data is cleared after 7 days in Safari and after 30 days by Atlassian; users are told to sync and resolve conflicts promptly.
- Mobile apps (iOS, Android) render a small set of macros fully (Anchor, Blog Posts, Profile Picture, Table of Contents, User Profile, draw.io); other macros show as placeholders that open a separate screen; macros cannot be added or edited on mobile (CNF-F-117). Separate mobile-specific offline behaviour is not documented on the offline help page.

Quire difference: offline is the default state, not a fallback. Files exist locally on Android, creation works offline, and nothing expires.

## Export formats and Markdown fidelity

| Export | Scope | Notes |
| --- | --- | --- |
| PDF | page or space (or selected pages) | Published version only; space PDF excludes blog posts; comments never included; layout customizable (CNF-F-103, CNF-F-104, CNF-F-106). |
| Word (.docx) | page | Opens only in Microsoft Word per Atlassian (CNF-F-103). |
| HTML | space, zipped | Intended for static sites. |
| CSV | space, zipped | Supported route for moving spaces between Cloud sites. |
| XML | site or space, zipped | End of life 2026-12-01 (still works, no support) (CNF-F-105). |
| Markdown | none native | Only via Marketplace apps, browser extensions or REST-based CLIs; macro conversion is best-effort (CNF-F-107). |

Fidelity to Markdown: text, headings, lists, code, links, simple tables, panels, expands and tasks convert cleanly with Obsidian conventions. Layouts, colors, merged-cell tables, Smart Link display modes, status/date/mention nodes, and server-backed macros are lossy. Comments, versions, labels on attachments and permissions are outside the body and need separate export paths. Quire's export is the folder itself, which Confluence cannot match.

## Sources

- https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/
- https://support.atlassian.com/confluence-cloud/docs/create-and-collaborate-in-real-time-with-live-docs/
- https://support.atlassian.com/confluence-cloud/docs/edit-content-offline/
- https://support.atlassian.com/confluence-cloud/docs/learn-about-macros-on-confluence-mobile/
- https://support.atlassian.com/confluence-cloud/docs/whiteboard-history/
- https://support.atlassian.com/confluence-cloud/docs/database-version-history/
- https://support.atlassian.com/confluence-cloud/docs/manage-uploaded-files/
- https://support.atlassian.com/confluence-cloud/docs/comment-on-pages-and-blog-posts/
- https://support.atlassian.com/confluence-cloud/docs/use-folders-to-organize-your-work/
- https://support.atlassian.com/confluence-cloud/docs/use-labels-to-organize-your-content/
- https://support.atlassian.com/confluence-cloud/docs/faq-understanding-legacy-editor-deprecation/
- https://support.atlassian.com/confluence-cloud/docs/export-content-to-word-pdf-html-and-xml/
- https://support.atlassian.com/confluence/kb/xml-export-end-of-life-confluence-cloud/
- https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
- https://confluence.atlassian.com/conf90/troubleshooting-collaborative-editing-1425053668.html (Synchrony, Data Center)
- https://confluence.atlassian.com/spaces/CONF256/pages/79168530/Viewing+Recent+changes (older diff color coding)
