import { getLanguage } from "obsidian";
import { ObsidianPlugin } from "./types";
import { setLocale, toLocale, baseLocale } from "../i18n/paraglide/runtime";

/**
 * 注册并应用语言设置
 * 根据 plugin.settings.locale 确定当前语言：
 * - "app" 则从 Obsidian 的系统语言推断
 * - 否则使用用户显式选择的语言
 * @param plugin 插件实例
 * @param reload 是否重载页面以应用语言
 */
export async function registerLocales(plugin: ObsidianPlugin, reload: boolean = false) {
  if (plugin.settings.locale === "app") {
    await setLocale(toLocale(getLanguage()) ?? baseLocale, { reload });
  } else {
    await setLocale(toLocale(plugin.settings.locale) ?? baseLocale, { reload });
  }
}
