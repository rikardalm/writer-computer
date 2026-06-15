# Sidebar Drag Drop and Shortcut

## Problem

- Notes and folders cannot be rearranged from the sidebar; moving them requires external file manager or terminal commands.
- `Cmd+\` toggles the sidebar, but `Cmd+B` is easier to reach for a sidebar toggle when focus is outside the editor. Inside the editor, `Cmd+B` must remain bold.

## Decisions

- Support one-item drag/drop in the sidebar.
- Files and folders can be dragged onto folder rows to move into that folder.
- Dragging over a file row targets that file's parent folder, so the visible tree still responds when the pointer is over notes inside a folder.
- Closed folders expand after a short drag-hover delay.
- Accepted drop targets show an accent outline instead of relying only on a subtle row background.
- Files and folders can be dragged onto blank space in the Everything tree to move to the workspace root.
- Files and folders also expose a `Move to` context-menu submenu that lists the workspace root and valid destination folders.
- Moves reuse the existing `renameEntry` IPC path, with no overwrite on conflicts.
- Folder moves rewrite open editor paths, expanded directory paths, and pinned paths through the same rename helpers used by folder rename.
- `Cmd+B` toggles the sidebar only when focus is outside editable text. CodeMirror keeps ownership of `Cmd+B` while the editor is focused.

## Validation

- `vp check`
- `vp test`
- `vp run desktop#build`
