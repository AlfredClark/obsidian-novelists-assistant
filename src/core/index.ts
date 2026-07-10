import { ObsidianPlugin } from "./types";
import { registerLocales } from "./locales";
import { addSettingTab } from "./settings";

/** 注册插件的核心功能：语言配置、设置页面 */
export async function initCore(plugin: ObsidianPlugin) {
  await registerLocales(plugin); // 注册并初始化多语言
  await addSettingTab(plugin); // 添加设置页面到 Obsidian
}
