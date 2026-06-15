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
const GITHUB_DARK_DIMMED_TERMINAL_THEME = {
  background: "#22272E",
  foreground: "#ADBAC7",
  cursor: "#539BF5",
  cursorAccent: "#22272E",
  selectionBackground: "#444C56",
  selectionForeground: "#ADBAC7",
  black: "#545D68",
  red: "#F47067",
  green: "#57AB5A",
  yellow: "#C69026",
  blue: "#539BF5",
  magenta: "#B083F0",
  cyan: "#39C5CF",
  white: "#ADBAC7",
  brightBlack: "#636E7B",
  brightRed: "#FF938A",
  brightGreen: "#6BC46D",
  brightYellow: "#DAAA3F",
  brightBlue: "#6CB6FF",
  brightMagenta: "#D2A8FF",
  brightCyan: "#56D4DD",
  brightWhite: "#C8D3DE",
};

export function useTerminalSession(isOpen: boolean) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const terminalElementRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
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
      if (terminalElementRef.current && resizeObserverRef.current) {
        resizeObserverRef.current.unobserve(terminalElementRef.current);
      }
      terminalElementRef.current = element;
      if (element && terminalRef.current) {
        terminalRef.current.open(element);
        resizeObserverRef.current?.observe(element);
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
      theme: GITHUB_DARK_DIMMED_TERMINAL_THEME,
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

    cleanupRef.current = () => {
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

  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;
    fitAndResize();
    terminalRef.current.focus();
  }, [fitAndResize, isOpen]);

  useEffect(
    () => () => {
      cleanupRef.current?.();
    },
    [],
  );

  return { setTerminalElement, status };
}
