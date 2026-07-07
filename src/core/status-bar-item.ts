import { ObsidianPlugin } from "./types";

export async function addStatusBarItem(plugin: ObsidianPlugin) {
  plugin.addStatusBarItem().appendText("StatusBarTemplate");
}
