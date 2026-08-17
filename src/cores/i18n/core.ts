import { getLanguage } from "obsidian";
import type NovelistsAssistantPlugin from "../../main";
import type { SupportedLanguage, TranslationKey, TranslationResource } from "./types";
import { zh, zhTW } from "./locales/zh";
import en from "./locales/en";

/** 语言标识到资源的映射；带连字符的标识为对象键需要引号 */
const LOCALES: Record<SupportedLanguage, TranslationResource> = {
  en,
  zh,
  "zh-TW": zhTW,
};

// 模块级保存插件引用，t() 每次调用时实时读取 settings.language，
// 设置页 update() 重渲染后文本即自动切换，无需缓存与事件通知
let pluginRef: NovelistsAssistantPlugin | null = null;

/** 语言变更订阅回调集合；语言切换时通知依赖 t() 的非设置页 UI（如侧边栏）重建文案 */
const languageListeners = new Set<() => void>();

/**
 * 订阅语言变更。语言切换仅发生在设置页 language 下拉（settings 层写入后广播），
 * 订阅方在回调中刷新依赖 t() 的界面（Svelte 组件经 #key 强制重建）。
 * @param listener 语言变更回调
 * @returns 取消订阅函数
 */
export function subscribeLanguageChange(listener: () => void): () => void {
  languageListeners.add(listener);
  return () => {
    languageListeners.delete(listener);
  };
}

/** 广播语言变更。由 settings 模块在 language 设置写入后调用 */
export function notifyLanguageChange(): void {
  languageListeners.forEach((listener) => listener());
}

/**
 * 初始化 i18n 模块。必须在 initSettings 之前调用：
 * initSettings 内部的 addSettingTab() 会同步触发设置页渲染（getSettingDefinitions → t()），
 * 若此时 pluginRef 未就绪，首次解析将全部回退 system 并被缓存。
 * @param plugin 插件实例
 */
export async function initI18n(plugin: NovelistsAssistantPlugin) {
  pluginRef = plugin;
}

/**
 * 翻译入口。按当前语言实时解析，支持 {name} 占位符插值（t("key", { name: "x" })）。
 * @param key 翻译键，由资源结构推导，编辑器自动补全
 * @param vars 插值变量；占位符在资源中不存在时原样保留
 * @returns 当前语言的译文
 */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const text = resolveKey(getCurrentLocale(), key);
  if (!vars) return text;
  return text.replace(/\{(\w+)}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/**
 * 解析当前生效语言：显式语言直接使用；system 依据 Obsidian 界面语言判断，
 * 繁体区域（zh-TW/zh-HK/zh-MO）归入 zh-TW，其余中文归入 zh，未知语言回退英文。
 */
function getCurrentLocale(): SupportedLanguage {
  const setting = pluginRef?.settings.language ?? "system";
  if (setting === "system") {
    const appLanguage = getLanguage();
    if (/^zh-(TW|HK|MO)$/.test(appLanguage)) return "zh-TW";
    return appLanguage.startsWith("zh") ? "zh" : "en";
  }
  return setting;
}

/** 按点分路径逐层取出叶子译文；键由类型系统保证存在，取不到时兜底返回键本身 */
function resolveKey(locale: SupportedLanguage, key: TranslationKey): string {
  let cursor: unknown = LOCALES[locale];
  for (const part of key.split(".")) {
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" ? cursor : key;
}
