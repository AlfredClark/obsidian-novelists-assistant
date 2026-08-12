import { MarkdownView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { GRIDLINES_CLASS, GRIDLINES_OPACITY_VAR, GRIDLINES_SIZE_VAR, GRIDLINES_SPACE_VAR, GRIDLINES_THICK_VAR } from "./types";
import type NovelistsAssistantPlugin from "../../main";

/** 判断文件路径是否位于目录内（含全部子目录）；归一化尾斜杠防手输 "目录/" 失效，空目录前缀 "/" 恒不匹配 */
function isInside(filePath: string, dirPath: string): boolean {
  return filePath.startsWith(dirPath.replace(/\/+$/, "") + "/");
}

/** 源码视图下的网格线目标元素；限定 data-mode="source" 避免阅读视图误加 */
function getTargetElement(leaf: WorkspaceLeaf): HTMLElement | null {
  return leaf.view.containerEl.closest('.workspace-leaf-content[data-mode="source"]')?.querySelector(".cm-content") ?? null;
}

/** 按文件所在目录与网格线开关增删类与 4 个 CSS 变量：正文目录内的文件加类，其余移除（toggle 布尔版幂等） */
export function refreshGridlines(plugin: NovelistsAssistantPlugin): void {
  const novelDir = plugin.settings.novelDir;
  // 滑块值拼接单位后校验，防御 data.json 手改脏值；非法时回退 :root 默认值
  const size = `${plugin.settings.novelGridlinesSize}px`;
  const space = `${plugin.settings.novelGridlinesSpace}px`;
  const thick = `${plugin.settings.novelGridlinesThick}px`;
  const opacity = `${plugin.settings.novelGridlinesOpacity}%`;
  const validSize = CSS.supports("width", size);
  const validSpace = CSS.supports("width", space);
  const validThick = CSS.supports("border-width", thick);
  const validOpacity = CSS.supports("opacity", opacity);
  // iterateAllLeaves 覆盖弹窗窗口，getLeavesOfType 只能取主窗口叶子
  plugin.app.workspace.iterateAllLeaves((leaf) => {
    if (!(leaf.view instanceof MarkdownView)) return;
    const element = getTargetElement(leaf);
    if (!element) return;
    const inNovelDir =
      plugin.settings.novelGridlines && novelDir !== "" && leaf.view.file !== null && isInside(leaf.view.file.path, novelDir);
    element.classList.toggle(GRIDLINES_CLASS, inNovelDir);
    if (inNovelDir && validSize) {
      element.style.setProperty(GRIDLINES_SIZE_VAR, size);
    } else {
      element.style.removeProperty(GRIDLINES_SIZE_VAR);
    }
    if (inNovelDir && validSpace) {
      element.style.setProperty(GRIDLINES_SPACE_VAR, space);
    } else {
      element.style.removeProperty(GRIDLINES_SPACE_VAR);
    }
    if (inNovelDir && validThick) {
      element.style.setProperty(GRIDLINES_THICK_VAR, thick);
    } else {
      element.style.removeProperty(GRIDLINES_THICK_VAR);
    }
    if (inNovelDir && validOpacity) {
      element.style.setProperty(GRIDLINES_OPACITY_VAR, opacity);
    } else {
      element.style.removeProperty(GRIDLINES_OPACITY_VAR);
    }
  });
}

/** 卸载时移除全部叶子上的网格线类与变量，避免残留影响非正文文件 */
function removeAllGridlines(plugin: NovelistsAssistantPlugin): void {
  plugin.app.workspace.iterateAllLeaves((leaf) => {
    const element = getTargetElement(leaf);
    element?.classList.remove(GRIDLINES_CLASS);
    element?.style.removeProperty(GRIDLINES_SIZE_VAR);
    element?.style.removeProperty(GRIDLINES_SPACE_VAR);
    element?.style.removeProperty(GRIDLINES_THICK_VAR);
    element?.style.removeProperty(GRIDLINES_OPACITY_VAR);
  });
}

/**
 * 初始化网格线功能：开关开启时，正文目录内的文件在源码视图显示网格虚线。
 * 渲染受排版类门控：样式表仅 .novel-typeset.novel-gridlines 时生效，保证定位基准与行高对齐。
 * layout-change 覆盖打开/关闭/模式切换，active-leaf-change 覆盖切换活动笔记，
 * 两者注册于 plugin 由 Obsidian 在卸载时自动回收；设置页变更经 refreshGridlines 即时刷新。
 * @param plugin 插件实例
 * @returns 清理函数，由 features 聚合层在卸载时回收残留类
 */
export function initGridlines(plugin: NovelistsAssistantPlugin): () => void {
  plugin.registerEvent(plugin.app.workspace.on("layout-change", () => refreshGridlines(plugin)));
  plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", () => refreshGridlines(plugin)));
  refreshGridlines(plugin);
  return () => removeAllGridlines(plugin);
}
