# Terminal and Sidebar Polish

## Problem

- The right-side embedded terminal opens too narrow for full-screen terminal applications.
- Right-clicking blank space in the sidebar tree does not offer creation actions, so creating a folder at the workspace root requires another path.

## Decisions

- Default the terminal panel to a viewport-relative width that approximates the requested split while still clamping on smaller windows.
- Keep manual terminal resizing local to the current window session.
- Add a root sidebar context menu for blank tree space with `New File` and `New Folder`.
- Reuse the existing create-refresh-inline-rename flow so new root items behave like new items created from folder rows.

## Validation

- `vp check`
- `vp run test -r`
- `vp run build -r`
