import { listen } from "@tauri-apps/api/event";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  terminalResize,
  terminalStart,
  terminalStop,
  terminalWrite,
  type TerminalExitPayload,
  type TerminalOutputPayload,
} from "@/lib/tauri";
import "@xterm/xterm/css/xterm.css";

const FALLBACK_SIZE = { cols: 80, rows: 24 };

export function useTerminalSession(isOpen: boolean) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const terminalElementRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "exited" | "error">(
    "idle",
  );

  const fitAndResize = useCallback(() => {
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    if (!terminal || !fitAddon) return FALLBACK_SIZE;

    fitAddon.fit();
    const size = {
      cols: Math.max(1, terminal.cols),
      rows: Math.max(1, terminal.rows),
    };

    const sessionId = sessionIdRef.current;
    if (sessionId) {
      void terminalResize(sessionId, size);
    }

    return size;
  }, []);

  const setTerminalElement = useCallback(
    (element: HTMLDivElement | null) => {
      terminalElementRef.current = element;
      if (element && terminalRef.current) {
        terminalRef.current.open(element);
        fitAndResize();
      }
    },
    [fitAndResize],
  );

  useEffect(() => {
    if (!isOpen || terminalRef.current) return;

    setStatus("starting");
    const terminal = new Terminal({
      allowProposedApi: false,
      cursorBlink: true,
      convertEol: true,
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 12,
      lineHeight: 1.25,
      theme: {
        background: "transparent",
        foreground: getComputedStyle(document.documentElement).getPropertyValue("--text-primary"),
        cursor: getComputedStyle(document.documentElement).getPropertyValue("--accent"),
        selectionBackground: getComputedStyle(document.documentElement).getPropertyValue(
          "--editor-selection-bg",
        ),
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    if (terminalElementRef.current) {
      terminal.open(terminalElementRef.current);
    }

    const dataDisposable = terminal.onData((data) => {
      const sessionId = sessionIdRef.current;
      if (sessionId) void terminalWrite(sessionId, data);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAndResize();
    });
    if (terminalElementRef.current) resizeObserver.observe(terminalElementRef.current);
    resizeObserverRef.current = resizeObserver;

    let cancelled = false;
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    async function start() {
      try {
        const [outputListener, exitListener] = await Promise.all([
          listen<TerminalOutputPayload>("terminal:output", (event) => {
            if (event.payload.id === sessionIdRef.current) {
              terminal.write(event.payload.data);
            }
          }),
          listen<TerminalExitPayload>("terminal:exit", (event) => {
            if (event.payload.id === sessionIdRef.current) {
              setStatus("exited");
              sessionIdRef.current = null;
            }
          }),
        ]);
        unlistenOutput = outputListener;
        unlistenExit = exitListener;

        const session = await terminalStart(fitAndResize());
        if (cancelled) {
          void terminalStop(session.id);
          return;
        }

        sessionIdRef.current = session.id;
        setStatus("running");
        fitAndResize();
        terminal.focus();
      } catch (error) {
        setStatus("error");
        terminal.writeln(`\r\nFailed to start terminal: ${String(error)}`);
      }
    }

    void start();

    return () => {
      cancelled = true;
      unlistenOutput?.();
      unlistenExit?.();
      resizeObserver.disconnect();
      dataDisposable.dispose();
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (sessionId) void terminalStop(sessionId);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      resizeObserverRef.current = null;
      setStatus("idle");
    };
  }, [fitAndResize, isOpen]);

  return { setTerminalElement, status };
}
