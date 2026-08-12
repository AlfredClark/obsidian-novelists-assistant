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
  /** 排版 */
  novelIndent: number; // 正文首行缩进大小（rem，0 表示不缩进）
  novelLineHeight: number; // 正文行高（rem）
  novelTypeset: boolean; // 是否对正文目录内的文件应用排版样式
  /** 网格线 */
  novelGridlines: boolean; // 是否对正文目录内的文件显示网格虚线
  novelGridlinesSize: number; // 网格虚线长度（px）
  novelGridlinesSpace: number; // 网格虚线间隔（px）
  novelGridlinesThick: number; // 网格线厚度（px）
  novelGridlinesOpacity: number; // 网格线不透明度（%）
}
