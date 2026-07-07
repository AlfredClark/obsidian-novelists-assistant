import { ObsidianPlugin } from "./types";
import { registerLocales } from "./locales";
import { initSettings } from "./settings";
import { addRibbonIcon } from "./ribbon-icon";
import { registerSidebar } from "./sidebar";
import { addSettingTab } from "./setting-tab";
import { registerMenu } from "./menu";
import { addCommands } from "./commands";
import { addStatusBarItem } from "./status-bar-item";

export async function registerCore(plugin: ObsidianPlugin) {
  await initSettings(plugin);

  await addSettingTab(plugin);
  await addRibbonIcon(plugin);
  await addStatusBarItem(plugin);
  await addCommands(plugin);

  await registerSidebar(plugin);
  await registerLocales(plugin);
  await registerMenu(plugin);
}
