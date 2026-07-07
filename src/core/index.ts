import { ObsidianPlugin } from "./types";
import { registerLocales } from "./locales";
import { initSettings } from "./settings";
import { addSettingTab } from "./setting-tab";

export async function registerCore(plugin: ObsidianPlugin) {
  await initSettings(plugin);
  await registerLocales(plugin);
  await addSettingTab(plugin);
}
