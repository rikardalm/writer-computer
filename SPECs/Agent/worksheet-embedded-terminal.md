# Embedded Terminal Worksheet

## Task

TODO entry: `Embedded terminal`

Spec: [`SPECs/embedded-terminal-spec.md`](../embedded-terminal-spec.md)

## Reviewed

- `TODOS.md`
- `CHANGELOG.md`
- `docs/react-guidelines.md`
- `docs/consolidation.md`
- `docs/workflows/agent-loop.md`
- `apps/desktop/src/components/app-layout.tsx`
- `apps/desktop/src/stores/ui-store.ts`
- `apps/desktop/src/hooks/use-keyboard-shortcuts.ts`
- `apps/desktop/src/lib/tauri.ts`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/src/state.rs`
- `apps/desktop/package.json`
- `apps/desktop/src-tauri/Cargo.toml`

## Plan

- Add xterm.js dependencies for the terminal UI.
- Add a Rust PTY command module with start/write/resize/stop commands.
- Store PTY sessions in process state and clean up sessions for a window on destroy.
- Add typed Tauri wrappers and a domain hook for terminal panel state.
- Render a bottom terminal panel in `AppLayout`, with resize and close controls.
- Add `Cmd+J` as the terminal toggle.
- Update changelog and TODO when complete.

## Validation

- Run `vp install` if dependency lockfiles need updating.
- Run `vp check` and `vp test`.
- Run Rust formatting/checks and targeted tests from `apps/desktop/src-tauri`.

## Results

- Added xterm.js frontend dependencies and `portable-pty` backend dependency.
- Added `terminal_start`, `terminal_write`, `terminal_resize`, and `terminal_stop` IPC commands.
- Added process-level terminal session tracking, including window-destroy cleanup and natural-exit cleanup.
- Added a resizable bottom terminal panel in `AppLayout`.
- Added `Cmd+J` terminal toggle.

Validation run:

- `vp install` passed after sandbox approval for the Vite+ package-manager cache.
- `vp check` passed with two existing E2E warnings.
- `vp test` passed: 27 files, 444 tests.
- `bun run build` in `apps/desktop` passed.
- `cargo fmt --check` passed.
- `cargo clippy` passed with existing warnings outside the terminal change.
- `cargo test commands::terminal` passed, with no matching terminal unit tests currently present.
- Full `cargo test` ran 111 tests; 110 passed and `commands::fs::tests::test_delete_entry_moves_to_trash` failed because Finder/osascript trash integration is unavailable in this execution environment.
