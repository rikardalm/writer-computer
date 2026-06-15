import { TerminalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTerminalPanel } from "@/hooks/use-terminal";

export function TerminalToggleButton() {
  const { isOpen, toggle } = useTerminalPanel();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOpen ? "Hide terminal" : "Show terminal"}
      title={isOpen ? "Hide terminal" : "Show terminal"}
      data-active={isOpen || undefined}
      className="group flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-base)] transition-colors hover:bg-[var(--surface-subtle)] hover:transition-none data-[active]:bg-[var(--surface-subtle)]"
    >
      <span className="opacity-60 transition-opacity group-hover:opacity-100 group-hover:transition-none group-data-[active]:opacity-100">
        <HugeiconsIcon icon={TerminalIcon} size={18} color="currentColor" strokeWidth={2} />
      </span>
    </button>
  );
}
