# Embedded Terminal

## Goal

Add an integrated terminal to the desktop app so users can run workspace-local shell commands without keeping a separate terminal window beside Writer.

## Scope

- Show a bottom terminal panel from the main app layout.
- Start the shell in the active workspace root.
- Stream shell output into an xterm.js terminal.
- Forward keyboard input and terminal resize events back to the backend.
- Stop the backend shell process when the panel closes or the app window is destroyed.

## Non-goals

- Multiple terminal tabs.
- Persistent terminal sessions across app launches.
- Shell profile management.
- Command palette integration beyond the keyboard shortcut.

## UX

- `Cmd+J` toggles the terminal panel.
- The panel has a compact header with the workspace path and close button.
- The terminal occupies the bottom of the editor region and can be resized vertically.

## Implementation Notes

- Frontend owns panel visibility in the UI store because it is app chrome, not editor-tab state.
- Rust owns PTY process lifecycle. Sessions are keyed by id and scoped to the invoking window label.
- Terminal output is emitted to the same Tauri window that started the session.
