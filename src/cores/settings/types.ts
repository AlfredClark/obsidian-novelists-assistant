import type { PluginLanguage } from "../i18n";

/**
 * 插件设置结构。声明式设置 API 按 key 直接读写此结构，
 * 新增字段须同步在 DEFAULT_SETTINGS 补默认值。
 */
export interface NovelistsAssistantSettings {
  /** 通用设置 */
  collapsible: boolean; // 是否启用折叠行为
  language: PluginLanguage; // 插件界面语言
  /** 目录结构 */
  loreDir: string; // 设定目录路径，空字符串表示未配置
  novelDir: string; // 正文目录路径，空字符串表示未配置
}
