# Joplin: visuals capture checklist

Joplin is open source (AGPL-3.0-or-later). Screenshots of the running app may be
captured, but like every reference they go in `product/visuals/captures/`, which is
gitignored (`references/*/product/visuals/captures/` in the root `.gitignore`). Do not
commit captures. Name files `JOP-<area>-<nn>-<client>.png` (for example
`JOP-conflict-01-android.png`) and note the app version in a sidecar `.txt` if useful.

Priority is the sync, conflict, history and mobile surfaces, since Joplin is primary
for those domains only.

## How to get a running app

- Desktop and Android builds: https://joplinapp.org/download/
- Web app (mobile UI in a browser): https://app.joplincloud.com (needs a Joplin Cloud account)
- Easiest reproducible conflict: two profiles or two devices syncing to the same
  filesystem or WebDAV target; edit the same note on both while one is offline, then sync.

## Capture list

| # | Area | What to capture | Client | Official reference |
| --- | --- | --- | --- | --- |
| 1 | Sync setup | Synchronisation settings screen: target picker, interval, fail-safe, attachment download mode, Wi-Fi only | Android, desktop | https://joplinapp.org/help/apps/sync/ |
| 2 | Sync status | Sync button states (idle, in progress, completed, error), sync report text, "items that cannot be synchronised" panel | desktop, Android | `readme/news/20260505-release-3-6.md` (Joplin 3.6 "Clearer sync status"), image `Assets/WebsiteAssets/images/news/20260505-sync-status.png` |
| 3 | Conflicts notebook | Sidebar with "Conflicts" notebook and count; note list inside it | desktop, Android | https://joplinapp.org/help/apps/conflict |
| 4 | Conflict note | A conflict note opened next to its original; show that there is no compare view | desktop, Android | https://joplinapp.org/help/apps/conflict |
| 5 | Auto-merge | Same scenario with edits on different lines: merged result, no conflict note; setting "Automatically merge non-conflicting note changes" | desktop | `readme/dev/spec/conflict_auto_merge.md` |
| 6 | Partial merge | Edits on the same line plus other lines: conflict note that differs only in the colliding region | desktop | `readme/dev/spec/conflict_auto_merge.md` |
| 7 | Attachment conflict | "Conflicts (attachments)" folder and the "Attachment conflict: ..." note | desktop | `packages/lib/models/Resource.ts` |
| 8 | Delete vs edit | Note deleted on device A, edited offline on B: resulting conflict note | Android | `Synchronizer.conflicts.test.ts` |
| 9 | Note history | Note properties, "Previous versions of this note", revision viewer with dropdown, Restore, "Restored Notes" notebook | desktop, Android | https://joplinapp.org/help/apps/note_history |
| 10 | History settings | Note History config page (enable, keep for N days) | desktop | https://joplinapp.org/help/apps/note_history |
| 11 | E2EE | Encryption config screen, master password prompt, an encrypted (not yet decrypted) item in the list | desktop, Android | https://joplinapp.org/help/apps/sync/e2ee |
| 12 | Attachments | Attachment not yet downloaded (manual mode) and the download affordance | Android | https://joplinapp.org/help/apps/attachments |
| 13 | Mobile shell | Notebook drawer, note list, editor toolbar, Markdown editor on Android | Android | https://joplinapp.org/help/apps/mobile |
| 14 | Upgrade gate | "Sync target must be upgraded" banner and upgrade screen | desktop | `readme/dev/spec/sync_lock.md` |
| 15 | Trash | Trash folder, restore action | desktop, Android | https://joplinapp.org/help/apps/trash |

## Upstream images already in the repo

Useful as quick visual references without running the app (paths in the upstream):

- `Assets/WebsiteAssets/images/e2ee/e2ee-sync.png`
- `Assets/WebsiteAssets/images/news/20260505-sync-status.png`
- Note history screenshots linked from `readme/apps/note_history.md`:
  https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/news/20190523-231026_0.png and `..._1.png`
- Mobile demo: https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/DemoMobile.jpg
