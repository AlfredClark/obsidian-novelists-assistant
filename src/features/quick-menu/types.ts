import type { Editor, MarkdownFileInfo, MarkdownView, Menu, TAbstractFile } from "obsidian";

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
