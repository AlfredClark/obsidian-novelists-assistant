import { ObsidianPlugin } from "../core/types";
import { View } from "obsidian";

/** 文件资源管理器中的文件项结构 */
interface FileItems {
  /** 文件项对应的 DOM 元素 */
  selfEl: HTMLElement;
  /** 文件元信息 */
  file: {
    /** 文件名（含扩展名） */
    name: string;
    /** 文件路径 */
    path: string;
    /** 不带扩展名的文件名 */
    basename: string | undefined | null;
    /** 文件扩展名 */
    extension: string | undefined | null;
  };
}

/** Obsidian 文件资源管理器视图的类型扩展 */
interface FileExplorerView extends View {
  /** 所有文件项的映射，键为文件路径 */
  fileItems: Record<string, FileItems>;
}

/** 获取文件管理器视图实例 */
function getFileExplorerView(plugin: ObsidianPlugin) {
  return plugin.app.workspace.getLeavesOfType("file-explorer").last()?.view as FileExplorerView;
}

/**
 * 统计 Markdown 文本的中文 + 英文词数
 * - 先剔除代码块、行内代码、图片、链接、HTML 标签、Markdown 标记符号
 * - 中文字符按单个字符计数，英文按单词（连续字母）计数
 */
function countMarkdownWords(md: string) {
  // 剔除代码块（```···```）和行内代码（`···`）
  let text = md.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  // 剔除图片标记 ![alt](url)
  text = text.replace(/!\[.*?]\(.*?\)/g, "");
  // 剔除链接标记 [text](url)，保留显示文本
  text = text.replace(/\[([^\]]*)]\([^)]*\)/g, "$1");
  // 剔除 HTML 标签
  text = text.replace(/<[^>]*>/g, "");
  // 将 Markdown 标记符号替换为空格
  text = text.replace(/[#*_~>`\-+=]/g, " ");
  // 合并连续空白并去除首尾空格
  text = text.replace(/\s+/g, " ").trim();
  // 分别统计中文字符和英文单词数
  const chineseChars = (text.match(/[一-鿿]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
}

/** 重置字数统计功能 */
export async function resetWordCount(plugin: ObsidianPlugin) {
  let view = getFileExplorerView(plugin);
  for (let file in view.fileItems) {
    let items = view.fileItems[file];
    // 清除原有字数统计
    items?.selfEl.querySelectorAll(".word-count").forEach((ele) => {
      ele.remove();
    });
    // 添加新的字数统计span
    if (items?.file.extension) {
      let file = plugin.app.vault.getFileByPath(items.file.path);
      let content = "";
      if (file) {
        content = await plugin.app.vault.cachedRead(file);
      }
      const count = countMarkdownWords(content);
      const countText = plugin.settings.wordCountSuffix
        ? `${count} ${plugin.settings.wordCountSuffix}`
        : `${count}`;
      items?.selfEl.createSpan("word-count").setText(countText);
    }
  }
}

/** 初始化字数统计功能 */
export async function initWordCount(plugin: ObsidianPlugin) {
  // 切换字数统计功能启用状态
  window.document.documentElement.toggleClass("novel-word-count", plugin.settings.wordCountEnabled);

  // 仓库加载完成添加
  plugin.app.workspace.onLayoutReady(async () => {
    await resetWordCount(plugin);
  });

  // 监听文件创建事件，为新文件初始化字数统计（显示 0）
  plugin.registerEvent(
    plugin.app.vault.on("create", async (file) => {
      if (!plugin.settings.wordCountEnabled) return;
      const view = getFileExplorerView(plugin);
      const element = view?.fileItems[file.path]?.selfEl;
      if (!element) return;
      const fileRef = plugin.app.vault.getFileByPath(file.path);
      if (!fileRef) return;
      const countText = plugin.settings.wordCountSuffix
        ? `0 ${plugin.settings.wordCountSuffix}`
        : `0`;
      element.createSpan("word-count").setText(countText);
    }),
  );

  // 监听文件修改事件，重新计算并更新字数统计
  plugin.registerEvent(
    plugin.app.vault.on("modify", async (file) => {
      if (!plugin.settings.wordCountEnabled) return;
      const view = getFileExplorerView(plugin);
      const element = view?.fileItems[file.path]?.selfEl;
      if (!element) return;
      const fileRef = plugin.app.vault.getFileByPath(file.path);
      if (!fileRef) return;
      let content = "";
      if (file) {
        content = await plugin.app.vault.cachedRead(fileRef);
      }
      const count = countMarkdownWords(content);
      const countText = plugin.settings.wordCountSuffix
        ? `${count} ${plugin.settings.wordCountSuffix}`
        : `${count}`;
      element.querySelector(".word-count")?.setText(countText);
    }),
  );
}

/** 卸载字数统计功能 */
export function unloadWordCount(plugin: ObsidianPlugin) {
  let view = getFileExplorerView(plugin);
  for (let file in view.fileItems) {
    let items = view.fileItems[file];
    // 清除原有字数统计
    items?.selfEl.querySelectorAll(".word-count").forEach((ele) => {
      ele.remove();
    });
  }
}
