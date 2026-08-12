import type { Editor, MarkdownFileInfo, MarkdownView, TAbstractFile } from "obsidian";

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
  action: (editor: Editor, info: MarkdownView | MarkdownFileInfo) => Promise<void>; // 异步点击行为
}
