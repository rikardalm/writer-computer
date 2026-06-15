import { Menu } from "@tauri-apps/api/menu/menu";
import { MenuItem } from "@tauri-apps/api/menu/menuItem";

export type RootMenuActionId = "new-file" | "new-folder";

export interface RootContextMenuHandlers {
  onNewFile: () => void;
  onNewFolder: () => void;
}

export function buildRootMenuItemsSpec(
  handlers: RootContextMenuHandlers,
): Array<{ kind: "item"; id: RootMenuActionId; text: string; action: () => void }> {
  return [
    { kind: "item", id: "new-file", text: "New File", action: handlers.onNewFile },
    { kind: "item", id: "new-folder", text: "New Folder", action: handlers.onNewFolder },
  ];
}

export async function showRootContextMenu(handlers: RootContextMenuHandlers): Promise<void> {
  const spec = buildRootMenuItemsSpec(handlers);
  const items = await Promise.all(
    spec.map((entry) =>
      MenuItem.new({
        id: entry.id,
        text: entry.text,
        action: entry.action,
      }),
    ),
  );

  const menu = await Menu.new({ items });
  await menu.popup();
}
