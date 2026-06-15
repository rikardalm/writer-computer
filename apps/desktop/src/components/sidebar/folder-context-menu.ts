import { Menu } from "@tauri-apps/api/menu/menu";
import { PredefinedMenuItem } from "@tauri-apps/api/menu/predefinedMenuItem";
import { MenuItem } from "@tauri-apps/api/menu/menuItem";
import { Submenu } from "@tauri-apps/api/menu/submenu";
import { detectPlatform, revealLabelForPlatform, type Platform } from "./context-menu-utils";

export type FolderMenuActionId =
  | "new-file"
  | "new-folder"
  | "move-to"
  | `move-to-${string}`
  | "copy-relative-path"
  | "copy-absolute-path"
  | "reveal"
  | "rename"
  | "delete";

export interface FolderContextMenuHandlers {
  onNewFile: () => void;
  onNewFolder: () => void;
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

type FolderMenuItemSpec =
  | { kind: "item"; id: FolderMenuActionId; text: string; action: () => void }
  | { kind: "separator" }
  | { kind: "submenu"; id: FolderMenuActionId; text: string; items: FolderMenuItemSpec[] };

/**
 * Build the items array for the folder row context menu. Pulled out from
 * `showFolderContextMenu` so it can be unit-tested without the Tauri runtime.
 */
export function buildFolderMenuItemsSpec(
  handlers: FolderContextMenuHandlers,
  platform: Platform = detectPlatform(),
): FolderMenuItemSpec[] {
  const items: FolderMenuItemSpec[] = [
    { kind: "item", id: "new-file", text: "New File", action: handlers.onNewFile },
    { kind: "item", id: "new-folder", text: "New Folder", action: handlers.onNewFolder },
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
 */
export async function showFolderContextMenu(handlers: FolderContextMenuHandlers): Promise<void> {
  const spec = buildFolderMenuItemsSpec(handlers);

  async function buildMenuItems(
    menuSpec: FolderMenuItemSpec[],
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
