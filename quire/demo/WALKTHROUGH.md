# Demo walkthrough (about 10 minutes)

Every step mirrors a scenario in the specs (IDs in brackets), so if `pnpm -C quire scenarios`
is green, this walkthrough works.

## 0. Start

```sh
pnpm -C quire install
pnpm -C quire demo          # cloud server on :8787, local node on :8788, fresh seed data
```

Open **window A** at http://localhost:8787 (cloud server) and **window B**, a private
window or another browser profile, at http://localhost:8788 (the local node). Each window
names itself (bottom left), like `calm-lynx-23`.

## 1. Read and navigate (Obsidian defaults)

1. In A, open **Welcome**. Press **Ctrl/Cmd+E** for the reading view: properties on top,
   a green tip callout, a collapsed "How collisions are handled" callout. [R-RND-04, R-RND-07]
2. The right pane's **Backlinks** tab lists **Alpha**. [R-NAV-01]
3. Press **Ctrl/Cmd+O**, type `alph`, press Enter: **Projects/Alpha** opens. [R-NAV-05]
4. Open **Projects/Beta** in reading view and click **Gamma** (shown as not created yet):
   the note is created. [R-RND-02]
5. **Ctrl/Cmd+P**, run **Open today's daily note**. [R-NAV-07]

## 2. Your notes are plain files

1. Open `quire/.demo/cloud/vault/Formatting.md` in any editor (or open the folder as an
   Obsidian vault) and add a line.
2. Within a few seconds window A shows the new line. [R-VLT-05]

## 3. Live co-editing

1. Open http://localhost:8787 in a third window (C) and open **Formatting** in A and C.
2. Type in A: C shows the text and a cursor labelled with A's name. [R-LIV-01]

## 4. Offline

1. In A, open DevTools, Network, choose **Offline**. The status bar says **Offline**.
2. Edit **Welcome**. The status shows **Offline · 1 pending** and the note has a dot in the
   file tree. [R-SYN-01, R-SYN-10]
3. Go back online: the status returns to **Synced** and C shows the edit. [R-SYN-10]

## 5. Local node

1. Window B (local node) has the same notes. Edit **Areas/Reading** there.
2. Within about two seconds window A (cloud) shows it, and edits in A reach B. [R-SYN-09, R-PLT-02]

## 6. Collision review

1. Run `pnpm -C quire demo:conflict`. It makes two devices, `phone` and `laptop`, change the
   same line of **Projects/Alpha** from the same starting point, as two offline devices would.
2. In A, the inbox badge in the status bar shows **1**, and **Alpha** has the banner "This
   note has unresolved changes from laptop". [R-RVW-02, R-RVW-05]
3. Click the badge. The card shows phone's line against laptop's line. Choose **Keep both**,
   then **Apply**. The badge returns to 0 and the note has both lines. [R-RVW-03, R-RVW-04]

## 7. Version history

1. On **Alpha**, run **Show version history** from the command palette.
2. Pick the oldest revision, check the preview, **Restore**. The note returns to the seed
   text as a new revision; the history keeps every version. [R-VLT-06]

## Stop

Ctrl+C in the terminal stops both servers. The next `pnpm -C quire demo` starts from fresh
seed data.
