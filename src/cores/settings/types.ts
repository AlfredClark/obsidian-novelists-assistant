import type { PluginLanguage } from "../i18n";

/** 章节自动编号的样式：数字 / 中文小写 / 中文大写 */
export type ChapterNumberStyle = "digit" | "chineseLower" | "chineseUpper";

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
  novelPreviewTypeset: boolean; // 是否在阅读视图对正文目录内的文件应用排版样式
  novelPreviewIndent: number; // 阅读视图首行缩进大小（rem，0 表示不缩进）
  novelPreviewLineHeight: number; // 阅读视图行高（rem）
  novelFontFamily: string; // 正文字体（CSS font-family 值），空字符串表示继承主题字体
  novelFontWeight: number; // 正文字体粗细（100-900）
  novelPreviewFontFamily: string; // 阅读视图字体（CSS font-family 值），空字符串表示继承主题字体
  novelPreviewFontWeight: number; // 阅读视图字体粗细（100-900）
  /** 网格线 */
  novelGridlines: boolean; // 是否对正文目录内的文件显示网格虚线
  novelGridlinesSize: number; // 网格虚线长度（px）
  novelGridlinesSpace: number; // 网格虚线间隔（px）
  novelGridlinesThick: number; // 网格线厚度（px）
  novelGridlinesOpacity: number; // 网格线不透明度（%）
  /** 快捷菜单 */
  chapterFormat: string; // 自动编号章节格式，# 为编号占位（如 "第 # 章"）
  chapterNumberStyle: ChapterNumberStyle; // 章节自动编号样式：数字/中文小写/中文大写
  /** 字数统计 */
  wordCount: boolean; // 是否在文件列表为每个 md 文件显示字数统计
  wordCountUnit: string; // 字数统计单位，空字符串表示不显示单位
  /** 文件夹统计 */
  folderCount: boolean; // 是否在文件列表为设定/正文文件夹显示统计
  folderCountGroupUnit: string; // 设定文件夹的子文件夹数（组数）单位
  folderCountLoreUnit: string; // 设定子文件夹的设定数单位
  folderCountChapterUnit: string; // 正文文件夹的章节数单位
}
