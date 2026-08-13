/** 字数统计 span 类名，样式表以 .nav-file-title > .novel-word-count 消费 */
export const WORD_COUNT_CLASS = "novel-word-count";

/** 已装饰文件标题的标记类：刷新扫描时跳过，防重复追加统计 span */
export const PROCESSED_CLASS = "novel-word-counted";

/** 文件夹统计角色：设定文件夹组数 / 设定子文件夹设定数 / 正文文件夹章节数 / 正文直接子文件夹章节数 */
export type FolderCountRole = "loreGroups" | "loreNotes" | "chapters" | "novelSubdirs";
