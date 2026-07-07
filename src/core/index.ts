import { ObsidianPlugin } from "./types";
import { registerLocales } from "./locales";
import { addSettingTab } from "./setting-tab";

/** 注册插件的核心功能：配置、语言、设置页 */
export async function initCore(plugin: ObsidianPlugin) {
  await registerLocales(plugin);
  await addSettingTab(plugin);
}
