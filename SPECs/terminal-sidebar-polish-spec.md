# Terminal and Sidebar Polish

## Problem

- The right-side embedded terminal opens too narrow for full-screen terminal applications.
- Resizing the terminal can feel janky, and terminal TUIs can mis-render if the PTY receives transient tiny column counts during drag.
- Right-clicking blank space in the sidebar tree does not offer creation actions, so creating a folder at the workspace root requires another path.

## Decisions

- Default the terminal panel to a viewport-relative width that approximates the requested split while still clamping on smaller windows.
- Throttle terminal width updates to animation frames while dragging and disable width transitions during active resize.
- Ignore too-small terminal fit measurements and debounce PTY resize calls so TUIs do not redraw against one-column intermediate sizes.
- Keep manual terminal resizing local to the current window session.
- Add a root sidebar context menu for blank tree space with `New File` and `New Folder`.
- Reuse the existing create-refresh-inline-rename flow so new root items behave like new items created from folder rows.
- Optimistically keep newly-created empty folders in the sidebar cache because normal directory reads intentionally hide directories until they contain markdown.

## Validation

- `vp check`
- `vp run test -r`
- `vp run build -r`
