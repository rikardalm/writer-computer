import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useWorkspaceRoot } from "@/hooks/use-workspace";
import { useTerminalSession } from "./use-terminal-session";

interface TerminalPanelProps {
  isOpen: boolean;
  width: number;
  onClose: () => void;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export function TerminalPanel({ isOpen, width, onClose, onResizeStart }: TerminalPanelProps) {
  const root = useWorkspaceRoot();
  const { setTerminalElement, status } = useTerminalSession(isOpen);

  return (
    <div
      aria-hidden={!isOpen}
      className="relative h-full shrink-0 overflow-hidden border-l border-[var(--line-subtler)] bg-[color-mix(in_srgb,var(--bg-base)_96%,transparent)] transition-[width,border-color] duration-150 ease-out data-[closed]:border-transparent"
      data-closed={!isOpen || undefined}
      style={{ width: isOpen ? width : 0 }}
    >
      <div
        role="presentation"
        aria-hidden="true"
        onPointerDown={onResizeStart}
        className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize"
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
          aria-label="Hide terminal"
          title="Hide terminal"
          className="group flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--fg-base)] transition-colors hover:bg-[var(--surface-subtle)] hover:transition-none"
        >
          <span className="opacity-60 transition-opacity group-hover:opacity-100 group-hover:transition-none">
            <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" strokeWidth={2} />
          </span>
        </button>
      </div>
      <div className="h-[calc(100%-2rem)] p-2">
        <div ref={setTerminalElement} className="writer-terminal h-full overflow-hidden" />
      </div>
    </div>
  );
}
