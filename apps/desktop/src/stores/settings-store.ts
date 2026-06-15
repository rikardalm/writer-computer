import { create } from "zustand";
import * as tauri from "@/lib/tauri";
import { applyCssVarBindings, applyTheme } from "@/lib/theme";
import type { SettingsMap, SettingKey } from "@/lib/settings-schema";

const WRITER_DARK_DIMMED = {
  "theme.dark.accent": "#539BF5",
  "theme.dark.background": "#22272E",
  "theme.dark.foreground": "#ADBAC7",
  "theme.dark.translucent": 0,
  "theme.dark.contrast": 48,
} as const;

const LEGACY_WRITER_DARK_BACKGROUNDS = new Set(["#111111", "#0d1117"]);

interface SettingsState {
  /** Flat record from key → value. Stored as `Record<string, unknown>` since
   *  IPC returns untyped JSON; per-key reads should go through the typed
   *  `useSetting<K>` hook (or `getSetting<K>`) which narrows via SettingsMap. */
  settings: Record<string, unknown>;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  getSetting: <K extends SettingKey>(key: K) => SettingsMap[K] | undefined;
  setSetting: (key: string, value: unknown, scope?: "global" | "workspace") => Promise<void>;
  resetSetting: (key: string, scope?: "global" | "workspace") => Promise<void>;
  /** Single entry point for hydrating settings from the backend. Sets
   *  `isLoaded`, replaces the store, and runs side effects (theme tokens,
   *  data-theme attribute, css-var bindings). Call from startup and from
   *  any future "reload from backend" path — never push settings via setState
   *  elsewhere. The schema is not stored: it's a static import from
   *  `@/lib/settings-schema`. */
  hydrateFromBackend: (payload: { settings: Record<string, unknown> }) => void;
}

function applySettingsSideEffects(settings: Record<string, unknown>) {
  applyTheme(settings["appearance.theme"], settings);
  applyCssVarBindings(settings);
}

function migrateLegacyWriterDark(settings: Record<string, unknown>) {
  const preset = settings["theme.dark.preset"];
  if (preset !== "Writer") return { settings, changed: [] as string[] };

  const background = settings["theme.dark.background"];
  if (
    typeof background !== "string" ||
    !LEGACY_WRITER_DARK_BACKGROUNDS.has(background.toLowerCase())
  ) {
    return { settings, changed: [] as string[] };
  }

  return {
    settings: { ...settings, ...WRITER_DARK_DIMMED },
    changed: Object.keys(WRITER_DARK_DIMMED),
  };
}

function persistMigratedSettings(keys: string[], settings: Record<string, unknown>) {
  for (const key of keys) {
    void tauri.setSetting(key, settings[key], "global");
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  isLoaded: false,

  loadSettings: async () => {
    const loaded = await tauri.getSettings();
    const { settings, changed } = migrateLegacyWriterDark(loaded);
    set({ settings, isLoaded: true });
    applySettingsSideEffects(settings);
    persistMigratedSettings(changed, settings);
  },

  getSetting: <K extends SettingKey>(key: K): SettingsMap[K] | undefined => {
    return get().settings[key as string] as SettingsMap[K] | undefined;
  },

  setSetting: async (key: string, value: unknown, scope: "global" | "workspace" = "global") => {
    const previousSettings = get().settings;
    const nextSettings = { ...previousSettings, [key]: value };

    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));

    applySettingsSideEffects(nextSettings);

    try {
      await tauri.setSetting(key, value, scope);
    } catch (error) {
      set({ settings: previousSettings });
      applySettingsSideEffects(previousSettings);
      throw error;
    }
  },

  resetSetting: async (key: string, scope: "global" | "workspace" = "global") => {
    await tauri.resetSetting(key, scope);
    const settings = await tauri.getSettings();
    set({ settings });
    applySettingsSideEffects(settings);
  },

  hydrateFromBackend: ({ settings }) => {
    const migrated = migrateLegacyWriterDark(settings);
    settings = migrated.settings;
    set({ settings, isLoaded: true });
    applySettingsSideEffects(settings);
    persistMigratedSettings(migrated.changed, settings);
  },
}));

// Settings are hydrated by resolveStartup() via get_startup_state before the first render.
// loadSettings() remains available for runtime reloads (e.g. settings page).
