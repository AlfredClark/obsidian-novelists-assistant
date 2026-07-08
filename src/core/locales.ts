import { getLanguage } from "obsidian";
import { ObsidianPlugin } from "./types";
import { setLocale, toLocale, baseLocale } from "../i18n/paraglide/runtime";

/**
 * 注册并应用语言设置
 * 根据 plugin.settings.locale 确定当前语言：
 * - "app" 则从 Obsidian 的系统语言推断
 * - 否则使用用户显式选择的语言
 * @param plugin - 插件实例
 * @param reload - 是否重载页面以应用语言
 */
export async function registerLocales(plugin: ObsidianPlugin, reload: boolean = false) {
  if (plugin.settings.locale === "app") {
    // 跟随系统语言：从 Obsidian 获取系统语言代码并转为 paraglide 可用格式
    await setLocale(toLocale(getLanguage()) ?? baseLocale, { reload });
  } else {
    // 使用用户手动选择的语言
    await setLocale(toLocale(plugin.settings.locale) ?? baseLocale, { reload });
  }
}
