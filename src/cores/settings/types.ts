import type { PluginLanguage } from "../i18n";

/**
 * 插件设置结构。声明式设置 API 按 key 直接读写此结构，
 * 新增字段须同步在 DEFAULT_SETTINGS 补默认值。
 */
export interface TemplatePluginSettings {
  /** 是否启用折叠行为 */
  collapsible: boolean;
  /** 插件界面语言 */
  language: PluginLanguage;
}
