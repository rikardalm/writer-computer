use crate::error::AppError;
use crate::state::{AppState, TerminalSession};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::Manager;
use tauri::{Emitter, WebviewWindow};

#[derive(Debug, Deserialize)]
pub struct TerminalSize {
    cols: u16,
    rows: u16,
}

#[derive(Debug, Serialize)]
pub struct TerminalSessionPayload {
    id: String,
}

#[derive(Debug, Clone, Serialize)]
struct TerminalOutputPayload {
    id: String,
    data: String,
}

#[derive(Debug, Clone, Serialize)]
struct TerminalExitPayload {
    id: String,
}

fn default_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
}

#[tauri::command]
pub fn terminal_start(
    window: WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    size: TerminalSize,
) -> Result<TerminalSessionPayload, AppError> {
    let label = window.label().to_string();
    let workspace = state
        .get_or_create(&label)
        .workspace_root
        .read()
        .clone()
        .ok_or_else(|| AppError::Io("open a workspace before starting a terminal".into()))?;
    let workspace = workspace.canonicalize().unwrap_or(workspace);

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: size.rows.max(1),
            cols: size.cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| AppError::Io(e.to_string()))?;

    let mut cmd = CommandBuilder::new(default_shell());
    cmd.arg("-l");
    cmd.cwd(workspace);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| AppError::Io(e.to_string()))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| AppError::Io(e.to_string()))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| AppError::Io(e.to_string()))?;
    let id = uuid::Uuid::new_v4().simple().to_string();
    let session = Arc::new(TerminalSession::new(
        id.clone(),
        label.clone(),
        pair.master,
        writer,
        child,
    ));
    state.insert_terminal_session(session);

    let emit_app = app.clone();
    let emit_label = label;
    let emit_id = id.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut buf = [0_u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = emit_app.emit_to(
                        &emit_label,
                        "terminal:output",
                        TerminalOutputPayload {
                            id: emit_id.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        if let Some(session) = emit_app
            .state::<AppState>()
            .remove_terminal_session(&emit_id)
        {
            session.kill();
        }
        let _ = emit_app.emit_to(
            &emit_label,
            "terminal:exit",
            TerminalExitPayload { id: emit_id },
        );
    });

    Ok(TerminalSessionPayload { id })
}

#[tauri::command]
pub fn terminal_write(
    state: tauri::State<AppState>,
    id: String,
    data: String,
) -> Result<(), AppError> {
    let session = state
        .terminal_session(&id)
        .ok_or_else(|| AppError::NotFound(id.clone()))?;
    let result = session
        .writer
        .lock()
        .write_all(data.as_bytes())
        .map_err(|e| AppError::Io(e.to_string()));
    result
}

#[tauri::command]
pub fn terminal_resize(
    state: tauri::State<AppState>,
    id: String,
    size: TerminalSize,
) -> Result<(), AppError> {
    let session = state
        .terminal_session(&id)
        .ok_or_else(|| AppError::NotFound(id.clone()))?;
    let result = session
        .master
        .lock()
        .resize(PtySize {
            rows: size.rows.max(1),
            cols: size.cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| AppError::Io(e.to_string()));
    result
}

#[tauri::command]
pub fn terminal_stop(state: tauri::State<AppState>, id: String) -> Result<(), AppError> {
    if let Some(session) = state.remove_terminal_session(&id) {
        session.kill();
    }
    Ok(())
}
