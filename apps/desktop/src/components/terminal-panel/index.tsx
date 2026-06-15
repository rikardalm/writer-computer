import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useWorkspaceRoot } from "@/hooks/use-workspace";
import { useTerminalSession } from "./use-terminal-session";

interface TerminalPanelProps {
  isOpen: boolean;
  height: number;
  onClose: () => void;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export function TerminalPanel({ isOpen, height, onClose, onResizeStart }: TerminalPanelProps) {
  const root = useWorkspaceRoot();
  const { setTerminalElement, status } = useTerminalSession(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="relative shrink-0 border-t border-[var(--line-subtler)] bg-[color-mix(in_srgb,var(--bg-base)_72%,transparent)]"
      style={{ height }}
    >
      <div
        role="presentation"
        aria-hidden="true"
        onPointerDown={onResizeStart}
        className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize"
      />
      <div className="flex h-8 items-center justify-between border-b border-[var(--line-subtler)] px-3 text-[12px] text-text-muted">
        <div className="min-w-0 truncate">
          Terminal <span className="text-text-secondary">{root}</span>
          {status === "starting" ? <span> · starting</span> : null}
          {status === "exited" ? <span> · exited</span> : null}
          {status === "error" ? <span> · error</span> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close terminal"
          title="Close terminal"
          className="group flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--fg-base)] transition-colors hover:bg-[var(--surface-subtle)] hover:transition-none"
        >
          <span className="opacity-60 transition-opacity group-hover:opacity-100 group-hover:transition-none">
            <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" strokeWidth={2} />
          </span>
        </button>
      </div>
      <div className="h-[calc(100%-2rem)] p-2">
        <div ref={setTerminalElement} className="h-full overflow-hidden" />
      </div>
    </div>
  );
}
