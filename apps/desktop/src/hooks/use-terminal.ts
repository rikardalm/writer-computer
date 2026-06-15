import { useUIStore } from "@/stores/ui-store";

export function useTerminalPanel() {
  const isOpen = useUIStore((s) => s.isTerminalOpen);
  const toggle = useUIStore((s) => s.toggleTerminal);
  const close = useUIStore((s) => s.closeTerminal);

  return { isOpen, toggle, close };
}

export function toggleTerminalPanel() {
  useUIStore.getState().toggleTerminal();
}
