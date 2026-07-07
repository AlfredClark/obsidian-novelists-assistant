import { ObsidianPlugin } from "./types";
import { VIEW_TYPE } from "./sidebar";

export async function addRibbonIcon(plugin: ObsidianPlugin) {
  plugin.addRibbonIcon("dice", "Open sidebar", async (_evt: MouseEvent) => {
    const { workspace } = plugin.app;

    const existing = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (existing) {
      await workspace.revealLeaf(existing);
      return;
    }

    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      await workspace.revealLeaf(leaf);
    }
  });
}
