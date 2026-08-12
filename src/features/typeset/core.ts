import { MarkdownView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { TYPESET_CLASS, TYPESET_LINE_HEIGHT_VAR, TYPESET_TEXT_INDENT_VAR } from "./types";
import type NovelistsAssistantPlugin from "../../main";

/** 判断文件路径是否位于目录内（含全部子目录）；归一化尾斜杠防手输 "目录/" 失效，空目录前缀 "/" 恒不匹配 */
function isInside(filePath: string, dirPath: string): boolean {
  return filePath.startsWith(dirPath.replace(/\/+$/, "") + "/");
}

/** 源码视图下的排版目标元素；限定 data-mode="source" 避免阅读视图误加 */
function getTargetElement(leaf: WorkspaceLeaf): HTMLElement | null {
  return leaf.view.containerEl.closest('.workspace-leaf-content[data-mode="source"]')?.querySelector(".cm-content") ?? null;
}

/** 按文件所在目录与排版开关增删排版类与缩进变量：正文目录内的文件加类，其余移除（toggle 布尔版幂等） */
export function refreshTypeset(plugin: NovelistsAssistantPlugin): void {
  const novelDir = plugin.settings.novelDir;
  // 滑块值拼接 rem 后校验，防御 data.json 手改脏值；非法时回退样式表 var() 默认值
  const indent = `${plugin.settings.novelIndent}rem`;
  const validIndent = CSS.supports("text-indent", indent);
  const lineHeight = `${plugin.settings.novelLineHeight}rem`;
  const validLineHeight = CSS.supports("line-height", lineHeight);
  // iterateAllLeaves 覆盖弹窗窗口，getLeavesOfType 只能取主窗口叶子
  plugin.app.workspace.iterateAllLeaves((leaf) => {
    if (!(leaf.view instanceof MarkdownView)) return;
    const element = getTargetElement(leaf);
    if (!element) return;
    const inNovelDir =
      plugin.settings.novelTypeset && novelDir !== "" && leaf.view.file !== null && isInside(leaf.view.file.path, novelDir);
    element.classList.toggle(TYPESET_CLASS, inNovelDir);
    if (inNovelDir && validIndent) {
      element.style.setProperty(TYPESET_TEXT_INDENT_VAR, indent);
    } else {
      element.style.removeProperty(TYPESET_TEXT_INDENT_VAR);
    }
    if (inNovelDir && validLineHeight) {
      element.style.setProperty(TYPESET_LINE_HEIGHT_VAR, lineHeight);
    } else {
      element.style.removeProperty(TYPESET_LINE_HEIGHT_VAR);
    }
  });
}

/** 卸载时移除全部叶子上的排版类与缩进/行高变量，避免残留影响非正文文件 */
function removeAllTypeset(plugin: NovelistsAssistantPlugin): void {
  plugin.app.workspace.iterateAllLeaves((leaf) => {
    const element = getTargetElement(leaf);
    element?.classList.remove(TYPESET_CLASS);
    element?.style.removeProperty(TYPESET_TEXT_INDENT_VAR);
    element?.style.removeProperty(TYPESET_LINE_HEIGHT_VAR);
  });
}

/**
 * 初始化排版功能：正文排版开关开启时，正文目录内的文件在源码视图打开时应用排版样式。
 * layout-change 覆盖打开/关闭/模式切换，active-leaf-change 覆盖切换活动笔记，
 * 两者注册于 plugin 由 Obsidian 在卸载时自动回收；设置页变更经 refreshTypeset 即时刷新。
 * @param plugin 插件实例
 * @returns 清理函数，由 features 聚合层在卸载时回收残留类
 */
export function initTypeset(plugin: NovelistsAssistantPlugin): () => void {
  plugin.registerEvent(plugin.app.workspace.on("layout-change", () => refreshTypeset(plugin)));
  plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", () => refreshTypeset(plugin)));
  refreshTypeset(plugin);
  return () => removeAllTypeset(plugin);
}
