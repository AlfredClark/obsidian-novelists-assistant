import {
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  FileView,
  Menu,
  normalizePath,
  TFile,
  TFolder,
  WorkspaceLeaf,
} from "obsidian";
import { ObsidianPlugin } from "../core/types";
import * as m from "../i18n/paraglide/messages";

declare module "obsidian" {
  export interface MenuItem {
    setSubmenu(): Menu;
  }

  export interface WorkspaceLeaf {
    containerEl: HTMLElement;
  }
}

/** 清除文本中所有的 [[]] 链接标记 */
function clearAllLinks(content: string): string {
  return content.replace(/\[\[|]]/g, "");
}

/**
 * 将内容中所有出现的设定库文件名替换为 [[]] 链接格式
 * 先按文件名长度降序替换，再将连续 3+ 个方括号压缩为 2 个
 */
function linksAllLore(content: string, plugin: ObsidianPlugin): string {
  const lorePath = plugin.settings.lorePath;
  if (!lorePath) return content;
  const files = plugin.app.vault.getMarkdownFiles();
  let allLore: string[] = files
    .filter((value) => value.path.startsWith(lorePath))
    .map((file) => file.basename)
    .sort((a, b) => b.length - a.length);
  if (allLore.length === 0) return content;
  let result = content;
  for (const name of allLore) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), `[[${name}]]`);
  }
  result = result.replace(/\[{3,}/g, "[[").replace(/]{3,}/g, "]]");
  return result;
}

/** 编辑建议：在编辑器中输入触发前缀后弹出设定库文件名建议 */
class SettingLibrarySuggest extends EditorSuggest<string> {
  plugin: ObsidianPlugin;

  constructor(plugin: ObsidianPlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  /** 检测光标前是否输入了触发前缀，若匹配则返回建议触发信息 */
  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile | null,
  ): EditorSuggestTriggerInfo | null {
    const prefix = this.plugin.settings.loreSuggestPrefix;
    if (!prefix) return null;
    const line = editor.getLine(cursor.line);
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${escaped}(.*)$`);
    const match = line.substring(0, cursor.ch).match(pattern);
    if (match) {
      return {
        start: { line: cursor.line, ch: match.index! },
        end: cursor,
        query: match[1] ?? "",
      };
    }
    return null;
  }

  /** 获取设定库中匹配当前查询的文件名列表 */
  getSuggestions(context: EditorSuggestContext): string[] | Promise<string[]> {
    const folderPath = this.plugin.settings.lorePath.trim();
    if (!folderPath) return [];

    const folder = this.plugin.app.vault.getFolderByPath(folderPath);
    if (!folder) return [];

    const libraries: string[] = [];
    for (const child of folder.children) {
      if (!(child instanceof TFolder)) continue;
      for (const file of child.children) {
        if (file instanceof TFile) {
          libraries.push(file.basename);
        }
      }
    }
    return libraries.filter((value) => value.startsWith(context.query));
  }

  /** 在建议列表中渲染每个文件名 */
  renderSuggestion(value: string, el: HTMLElement): void {
    el.createSpan({ text: value });
  }

  /** 选中建议时，将文件名以 [[]] 链接形式插入编辑器 */
  selectSuggestion(value: string, _evt: MouseEvent | KeyboardEvent): void {
    if (this.context) {
      this.context.editor.replaceRange(`[[${value}]]`, this.context.start, this.context.end);
      this.close();
    }
  }
}

/** 对指定 leaf 应用设定库样式控制 */
export function applyLoreStyles(plugin: ObsidianPlugin, leaf: WorkspaceLeaf | null) {
  if (!leaf?.containerEl) return;
  leaf.containerEl.querySelectorAll(".markdown-source-view").forEach((elem) => {
    if (leaf.view instanceof FileView && plugin.settings.lorePath) {
      const isLorePath = !!leaf.view.file?.path.startsWith(plugin.settings.lorePath);
      elem.toggleClass("lore-typeset", isLorePath && plugin.settings.loreStylesDisabled);
      elem.toggleClass("lore-gridlines", isLorePath && plugin.settings.loreStylesDisabled);
    }
  });
}

export async function initLore(plugin: ObsidianPlugin) {
  // 右键菜单选项
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu, editor, info) => {
      let selection = editor.getSelection();
      // 添加设定菜单功能
      if (plugin.settings.loreQuickCreateEnabled && selection.length > 0) {
        const folderPath = plugin.settings.lorePath.trim();
        if (!folderPath) return;
        const folder = plugin.app.vault.getFolderByPath(folderPath);
        if (!folder) return;
        // 筛选出子目录
        const subfolders = folder.children.filter((child) =>
          plugin.app.vault.getFolderByPath(child.path),
        );
        if (subfolders.length > 0) {
          // 创建二级菜单
          menu.addItem((item) => {
            item.setIcon("list-collapse").setTitle(m.lore_menu_add_to());
            const submenu: Menu = item.setSubmenu();
            subfolders.forEach((child) => {
              submenu.addItem((subItem) => {
                subItem
                  .setTitle(child.name)
                  .setIcon("text-align-start")
                  .onClick(async () => {
                    const path = normalizePath(`${child.path}/${selection}.md`);
                    if (!plugin.app.vault.getFileByPath(path)) {
                      await plugin.app.vault.create(path, "");
                    }
                    editor.replaceSelection(`[[${selection}]]`);
                  });
              });
            });
          });
        }
      }
      // 同步所有设定库中的链接
      menu.addItem((item) => {
        item
          .setIcon("list-plus")
          .setTitle(m.lore_menu_link_all())
          .onClick(async () => {
            if (!info.file) return;
            let content = await plugin.app.vault.cachedRead(info.file);
            await plugin.app.vault.modify(info.file, linksAllLore(content, plugin));
          });
      });
      // 添加标记与清除设定功能
      menu.addItem((item) => {
        item
          .setIcon("list-x")
          .setTitle(m.lore_menu_clear_links())
          .onClick(async () => {
            if (!info.file) return;
            let content = await plugin.app.vault.cachedRead(info.file);
            await plugin.app.vault.modify(info.file, clearAllLinks(content));
          });
      });
    }),
  );

  // 禁用设定库样式
  plugin.registerEvent(
    plugin.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf | null) => {
      applyLoreStyles(plugin, leaf);
    }),
  );

  // 注册编辑建议
  plugin.registerEditorSuggest(new SettingLibrarySuggest(plugin));
}

/** 卸载设定库功能的后处理 */
export function unloadLore() {
  document.querySelectorAll<HTMLElement>(".markdown-source-view").forEach((el) => {
    el.removeClass("lore-typeset");
    el.removeClass("lore-gridlines");
  });
}
