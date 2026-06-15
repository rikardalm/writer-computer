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
const MIN_FIT_WIDTH = 160;
const MIN_FIT_HEIGHT = 96;
const PTY_RESIZE_DEBOUNCE_MS = 90;
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
  const resizeFrameRef = useRef<number | null>(null);
  const ptyResizeTimerRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "exited" | "error">(
    "idle",
  );

  const fitAndResize = useCallback((resizePty: "now" | "debounced" = "debounced") => {
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    const element = terminalElementRef.current;
    if (!terminal || !fitAddon) return FALLBACK_SIZE;

    if (element) {
      const { width, height } = element.getBoundingClientRect();
      if (width < MIN_FIT_WIDTH || height < MIN_FIT_HEIGHT) {
        return { cols: Math.max(1, terminal.cols), rows: Math.max(1, terminal.rows) };
      }
    }

    fitAddon.fit();
    const size = {
      cols: Math.max(1, terminal.cols),
      rows: Math.max(1, terminal.rows),
    };

    const sessionId = sessionIdRef.current;
    if (sessionId) {
      if (ptyResizeTimerRef.current !== null) {
        window.clearTimeout(ptyResizeTimerRef.current);
        ptyResizeTimerRef.current = null;
      }

      if (resizePty === "now") {
        void terminalResize(sessionId, size);
      } else {
        ptyResizeTimerRef.current = window.setTimeout(() => {
          ptyResizeTimerRef.current = null;
          const currentSessionId = sessionIdRef.current;
          if (currentSessionId) void terminalResize(currentSessionId, size);
        }, PTY_RESIZE_DEBOUNCE_MS);
      }
    }

    return size;
  }, []);

  const scheduleFitAndResize = useCallback(() => {
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      fitAndResize("debounced");
    });
  }, [fitAndResize]);

  const setTerminalElement = useCallback(
    (element: HTMLDivElement | null) => {
      if (terminalElementRef.current && resizeObserverRef.current) {
        resizeObserverRef.current.unobserve(terminalElementRef.current);
      }
      terminalElementRef.current = element;
      if (element && terminalRef.current) {
        terminalRef.current.open(element);
        resizeObserverRef.current?.observe(element);
        fitAndResize("now");
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
      scheduleFitAndResize();
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

        const session = await terminalStart(fitAndResize("now"));
        if (cancelled) {
          void terminalStop(session.id);
          return;
        }

        sessionIdRef.current = session.id;
        setStatus("running");
        fitAndResize("now");
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
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      if (ptyResizeTimerRef.current !== null) {
        window.clearTimeout(ptyResizeTimerRef.current);
        ptyResizeTimerRef.current = null;
      }
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
  }, [fitAndResize, isOpen, scheduleFitAndResize]);

  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;
    fitAndResize("now");
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
