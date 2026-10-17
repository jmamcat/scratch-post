# Confluence (Cloud): visuals

Confluence is closed source. Screenshots are not committed to this repository.

- Put captures in `references/confluence/product/visuals/captures/`. The path is gitignored (`references/*/product/visuals/captures/` in the root `.gitignore`).
- Capture from a live Confluence Cloud site you have access to, or view the screenshots on the linked help pages. Do not download Atlassian images into the repo.
- Name files `CNF-V-##-short-name.png` and note the capture date and site plan (Free, Standard, Premium) in the file name or a local note.
- Each linked help page describes the screen or state; whether a given page embeds a screenshot was not checked one by one (unverified).

## Capture checklist

| ID | Screen or state | Why it matters for Quire | Official page |
| --- | --- | --- | --- |
| CNF-V-01 | Space sidebar with content tree: nested pages, a folder, a Smart Link, hover + menu | Tree navigation and in-place child creation | https://support.atlassian.com/confluence-cloud/docs/use-folders-to-organize-your-work/ |
| CNF-V-02 | Version history list: version numbers, authors, dates, version comments, checkboxes | Layout of the revision list | https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/ |
| CNF-V-03 | Compare selected versions: added and removed content, collapsed unchanged sections | Primary input for the merge-conflict and diff UI | https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/ |
| CNF-V-04 | Restore this version confirmation, then the history showing the restored copy as newest | Non-destructive restore flow | https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/ |
| CNF-V-05 | Unpublished changes badge and "View changes" diff in the editor | "Local changes not synced" indicator and diff | https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/ |
| CNF-V-06 | Publish modal with version comment, notify watchers, schedule publish | Optional publish step | https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/ |
| CNF-V-07 | Offline conflict notification and highlighted conflict with keep offline / keep online / combine | Direct model for conflict resolution choices | https://support.atlassian.com/confluence-cloud/docs/edit-content-offline/ |
| CNF-V-08 | Live doc with presence avatars (color and greyscale) and last-saved indicator | Presence and autosave feedback | https://support.atlassian.com/confluence-cloud/docs/create-and-collaborate-in-real-time-with-live-docs/ |
| CNF-V-09 | Inline comment on highlighted text, reply thread, resolve | Comment anchoring and resolve UX | https://support.atlassian.com/confluence-cloud/docs/comment-on-pages-and-blog-posts/ |
| CNF-V-10 | Comments panel filtered to Resolved, with Reopen | Finding and reopening resolved threads | https://support.atlassian.com/confluence-cloud/docs/comment-on-pages-and-blog-posts/ |
| CNF-V-11 | Slash insert menu open, showing elements and macros | Insert menu scope and grouping | https://support.atlassian.com/confluence-cloud/docs/insert-elements-into-a-page/ |
| CNF-V-12 | Panel types (info, note, success, warning, error) and an expand, open and closed | Callout and details rendering targets | https://support.atlassian.com/confluence-cloud/docs/insert-the-panel-macro/ and https://support.atlassian.com/confluence-cloud/docs/insert-the-expand-macro/ |
| CNF-V-13 | Macro browser / macro list | Size of the macro zoo we are rejecting | https://support.atlassian.com/confluence-cloud/docs/what-are-macros/ |
| CNF-V-14 | Template gallery at create time, with preview | Template picker on new note | https://support.atlassian.com/confluence-cloud/docs/create-a-template/ |
| CNF-V-15 | Page restrictions dialog (view and edit limits) | Upper bound for a later permissions UI | https://support.atlassian.com/confluence-cloud/docs/add-or-remove-page-restrictions/ |
