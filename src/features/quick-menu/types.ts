import type { Editor, MarkdownFileInfo, MarkdownView, Menu, TAbstractFile, TFile } from "obsidian";

/** 文件菜单项描述：在文件右键菜单中渲染 */
export interface FileMenuItem {
  icon?: string; // 菜单项图标，缺省回退通用文件图标
  title: string; // 菜单项显示标题
  showIf?: (file: TAbstractFile, source: string) => boolean; // 返回 false 时该项不出现
  action: (file: TAbstractFile, source: string) => Promise<void>; // 异步点击行为
}

/** 编辑菜单项描述：在编辑器右键菜单中渲染 */
export interface EditorMenuItem {
  icon?: string; // 菜单项图标，缺省回退通用文件图标
  title: string; // 菜单项显示标题
  showIf?: (editor: Editor, info: MarkdownView | MarkdownFileInfo) => boolean; // 返回 false 时该项不出现
  action?: (editor: Editor, info: MarkdownView | MarkdownFileInfo) => Promise<void>; // 异步点击行为（与 submenu 二选一）
  submenu?: (submenu: Menu, editor: Editor, info: MarkdownView | MarkdownFileInfo) => void; // 二级菜单构建器（与 action 二选一）
}

/** 章节重编号单项：文件与其新旧完整路径（to 含 .md 扩展名） */
export interface ChapterRenumberChange {
  file: TFile; // 待改名文件，rename 后对象原地更新路径
  from: string; // 原完整路径，用于冲突回滚
  to: string; // 目标完整路径
}

/** 章节重编号方案：plan 纯内存推演不落盘，供确认弹窗展示计数与清单 */
export interface ChapterRenumberPlan {
  changes: ChapterRenumberChange[]; // 需改名项
  unchanged: number; // 已是正确编号数
  skipped: number; // 目标被非候选占用的预判跳过数
}
