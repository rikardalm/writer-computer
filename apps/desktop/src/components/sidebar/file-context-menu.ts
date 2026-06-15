import { Menu } from "@tauri-apps/api/menu/menu";
import { PredefinedMenuItem } from "@tauri-apps/api/menu/predefinedMenuItem";
import { MenuItem } from "@tauri-apps/api/menu/menuItem";
import { Submenu } from "@tauri-apps/api/menu/submenu";
import { detectPlatform, revealLabelForPlatform, type Platform } from "./context-menu-utils";

export { detectPlatform, revealLabelForPlatform, type Platform } from "./context-menu-utils";

export type FileMenuActionId =
  | "open"
  | "open-in-new-tab"
  | "toggle-pin"
  | "duplicate"
  | "move-to"
  | `move-to-${string}`
  | "copy-relative-path"
  | "copy-absolute-path"
  | "reveal"
  | "rename"
  | "delete";

export interface FileContextMenuHandlers {
  isPinned?: boolean;
  onOpen: () => void;
  onOpenInNewTab: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  moveDestinations?: MoveDestination[];
  onCopyRelativePath: () => void;
  onCopyAbsolutePath: () => void;
  onReveal: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export interface MoveDestination {
  id: string;
  text: string;
  action: () => void;
}

type FileMenuItemSpec =
  | { kind: "item"; id: FileMenuActionId; text: string; action: () => void }
  | { kind: "separator" }
  | { kind: "submenu"; id: FileMenuActionId; text: string; items: FileMenuItemSpec[] };

/**
 * Build the items array for the file row context menu in the order described
 * by the spec. Pulled out from `showFileContextMenu` so it can be unit-tested
 * without depending on the Tauri runtime.
 */
export function buildFileMenuItemsSpec(
  handlers: FileContextMenuHandlers,
  platform: Platform = detectPlatform(),
): FileMenuItemSpec[] {
  const items: FileMenuItemSpec[] = [
    { kind: "item", id: "open", text: "Open", action: handlers.onOpen },
    {
      kind: "item",
      id: "open-in-new-tab",
      text: "Open in new tab",
      action: handlers.onOpenInNewTab,
    },
    {
      kind: "item",
      id: "toggle-pin",
      text: handlers.isPinned ? "Unpin" : "Pin",
      action: handlers.onTogglePin,
    },
    { kind: "separator" },
    { kind: "item", id: "duplicate", text: "Duplicate", action: handlers.onDuplicate },
  ];

  if (handlers.moveDestinations && handlers.moveDestinations.length > 0) {
    items.push({
      kind: "submenu",
      id: "move-to",
      text: "Move to",
      items: handlers.moveDestinations.map((destination) => ({
        kind: "item",
        id: `move-to-${destination.id}`,
        text: destination.text,
        action: destination.action,
      })),
    });
  }

  items.push(
    { kind: "separator" },
    {
      kind: "item",
      id: "copy-relative-path",
      text: "Copy relative path",
      action: handlers.onCopyRelativePath,
    },
    {
      kind: "item",
      id: "copy-absolute-path",
      text: "Copy absolute path",
      action: handlers.onCopyAbsolutePath,
    },
    { kind: "separator" },
    {
      kind: "item",
      id: "reveal",
      text: revealLabelForPlatform(platform),
      action: handlers.onReveal,
    },
    { kind: "separator" },
    { kind: "item", id: "rename", text: "Rename...", action: handlers.onRename },
    { kind: "item", id: "delete", text: "Delete", action: handlers.onDelete },
  );

  return items;
}

/**
 * Build a Tauri native menu and pop it up at the current cursor position.
 * Returns a promise that resolves once the menu has been displayed (the menu
 * itself dismisses through the OS, not via JS).
 */
export async function showFileContextMenu(handlers: FileContextMenuHandlers): Promise<void> {
  const spec = buildFileMenuItemsSpec(handlers);

  async function buildMenuItems(
    menuSpec: FileMenuItemSpec[],
  ): Promise<Array<MenuItem | PredefinedMenuItem | Submenu>> {
    return Promise.all(
      menuSpec.map(async (entry) => {
        if (entry.kind === "separator") {
          return PredefinedMenuItem.new({ item: "Separator" });
        }
        if (entry.kind === "submenu") {
          return Submenu.new({ text: entry.text, items: await buildMenuItems(entry.items) });
        }
        return MenuItem.new({
          id: entry.id,
          text: entry.text,
          action: entry.action,
        });
      }),
    );
  }

  const items = await buildMenuItems(spec);

  const menu = await Menu.new({ items });
  await menu.popup();
}
