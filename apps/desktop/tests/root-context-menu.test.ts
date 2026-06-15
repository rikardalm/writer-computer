import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("@tauri-apps/api/menu/menu", () => ({ Menu: { new: vi.fn() } }));
vi.mock("@tauri-apps/api/menu/menuItem", () => ({ MenuItem: { new: vi.fn() } }));

import {
  buildRootMenuItemsSpec,
  type RootContextMenuHandlers,
} from "../src/components/sidebar/root-context-menu";

function makeHandlers(): RootContextMenuHandlers & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    onNewFile: () => calls.push("new-file"),
    onNewFolder: () => calls.push("new-folder"),
  };
}

describe("buildRootMenuItemsSpec", () => {
  test("emits root creation actions in order", () => {
    const spec = buildRootMenuItemsSpec(makeHandlers());

    expect(spec.map((entry) => `${entry.id}:${entry.text}`)).toEqual([
      "new-file:New File",
      "new-folder:New Folder",
    ]);
  });

  test("each item invokes the matching handler", () => {
    const handlers = makeHandlers();
    const spec = buildRootMenuItemsSpec(handlers);

    for (const entry of spec) {
      entry.action();
    }

    expect(handlers.calls).toEqual(["new-file", "new-folder"]);
  });
});
