import { create } from "zustand";

export type CommandPaletteIntent = "search" | "create-file";

interface UIState {
  isCommandPaletteOpen: boolean;
  commandPaletteIntent: CommandPaletteIntent;
  commandPaletteSearch: string;
  isTerminalOpen: boolean;

  openCommandPalette: (intent?: CommandPaletteIntent) => void;
  closeCommandPalette: () => void;
  setCommandPaletteSearch: (search: string) => void;
  toggleTerminal: () => void;
  closeTerminal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCommandPaletteOpen: false,
  commandPaletteIntent: "search",
  commandPaletteSearch: "",
  isTerminalOpen: false,

  openCommandPalette: (intent = "search") =>
    set({ isCommandPaletteOpen: true, commandPaletteIntent: intent, commandPaletteSearch: "" }),
  closeCommandPalette: () =>
    set({
      isCommandPaletteOpen: false,
      commandPaletteIntent: "search",
      commandPaletteSearch: "",
    }),
  setCommandPaletteSearch: (search: string) => set({ commandPaletteSearch: search }),
  toggleTerminal: () => set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),
  closeTerminal: () => set({ isTerminalOpen: false }),
}));
