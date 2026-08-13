import type { MarkdownPostProcessorContext, WorkspaceLeaf } from "obsidian";
import { MarkdownView } from "obsidian";
import type { PreviewTransform, TypesetStyle } from "./types";
import {
  PREVIEW_CLASS,
  PREVIEW_FONT_FAMILY_VAR,
  PREVIEW_FONT_WEIGHT_VAR,
  PREVIEW_LINE_HEIGHT_VAR,
  PREVIEW_TEXT_INDENT_VAR,
  TYPESET_CLASS,
  TYPESET_FONT_FAMILY_VAR,
  TYPESET_FONT_WEIGHT_VAR,
  TYPESET_LINE_HEIGHT_VAR,
  TYPESET_TEXT_INDENT_VAR,
} from "./types";
import type NovelistsAssistantPlugin from "../../main";

/** 判断文件路径是否位于目录内（含全部子目录）；归一化尾斜杠防手输 "目录/" 失效，空目录前缀 "/" 恒不匹配 */
function isInside(filePath: string, dirPath: string): boolean {
  return filePath.startsWith(dirPath.replace(/\/+$/, "") + "/");
}

/** 源码视图下的排版目标元素；限定 data-mode="source" 避免阅读视图误加 */
function getTargetElement(leaf: WorkspaceLeaf): HTMLElement | null {
  return leaf.view.containerEl.closest('.workspace-leaf-content[data-mode="source"]')?.querySelector(".cm-content") ?? null;
}

/** 阅读视图下的排版目标元素；.markdown-preview-view 为滚动容器，内容渲染前后始终存在 */
function getPreviewTargetElement(leaf: WorkspaceLeaf): HTMLElement | null {
  return (
    leaf.view.containerEl.closest('.workspace-leaf-content[data-mode="preview"]')?.querySelector(".markdown-preview-view") ??
    null
  );
}

/** 按门控条件为排版目标元素增删排版类与各样式变量（toggle 布尔版幂等）；变量名由调用方指定，源码/阅读视图各自消费 */
function applyTypeset(element: HTMLElement | null, style: TypesetStyle): void {
  if (!element) return;
  element.classList.toggle(TYPESET_CLASS, style.enabled);
  style.entries.forEach((entry) => {
    if (style.enabled && entry.valid) {
      element.style.setProperty(entry.variable, entry.value);
    } else {
      element.style.removeProperty(entry.variable);
    }
  });
}

/** 按文件所在目录与各视图排版开关增删排版类与样式变量：正文目录内的文件加类，其余移除 */
export function refreshTypeset(plugin: NovelistsAssistantPlugin): void {
  const novelDir = plugin.settings.novelDir;
  // 参数值拼接单位/trim 后校验，防御 data.json 手改脏值；非法时回退样式表 var() 默认值
  const indent = `${plugin.settings.novelIndent}rem`;
  const validIndent = CSS.supports("text-indent", indent);
  const lineHeight = `${plugin.settings.novelLineHeight}rem`;
  const validLineHeight = CSS.supports("line-height", lineHeight);
  const fontFamily = plugin.settings.novelFontFamily.trim();
  const validFontFamily = fontFamily !== "" && CSS.supports("font-family", fontFamily);
  const fontWeight = `${plugin.settings.novelFontWeight}`;
  const validFontWeight = CSS.supports("font-weight", fontWeight);
  const previewIndent = `${plugin.settings.novelPreviewIndent}rem`;
  const validPreviewIndent = CSS.supports("text-indent", previewIndent);
  const previewLineHeight = `${plugin.settings.novelPreviewLineHeight}rem`;
  const validPreviewLineHeight = CSS.supports("line-height", previewLineHeight);
  const previewFontFamily = plugin.settings.novelPreviewFontFamily.trim();
  const validPreviewFontFamily = previewFontFamily !== "" && CSS.supports("font-family", previewFontFamily);
  const previewFontWeight = `${plugin.settings.novelPreviewFontWeight}`;
  const validPreviewFontWeight = CSS.supports("font-weight", previewFontWeight);
  // iterateAllLeaves 覆盖弹窗窗口，getLeavesOfType 只能取主窗口叶子
  plugin.app.workspace.iterateAllLeaves((leaf) => {
    if (!(leaf.view instanceof MarkdownView)) return;
    // 正文判定与视图开关分离：源码/阅读视图各由独立开关与参数门控
    const inNovelDir = novelDir !== "" && leaf.view.file !== null && isInside(leaf.view.file.path, novelDir);
    applyTypeset(getTargetElement(leaf), {
      enabled: plugin.settings.novelTypeset && inNovelDir,
      entries: [
        { variable: TYPESET_TEXT_INDENT_VAR, value: indent, valid: validIndent },
        { variable: TYPESET_LINE_HEIGHT_VAR, value: lineHeight, valid: validLineHeight },
        { variable: TYPESET_FONT_FAMILY_VAR, value: fontFamily, valid: validFontFamily },
        { variable: TYPESET_FONT_WEIGHT_VAR, value: fontWeight, valid: validFontWeight },
      ],
    });
    applyTypeset(getPreviewTargetElement(leaf), {
      enabled: plugin.settings.novelPreviewTypeset && inNovelDir,
      entries: [
        { variable: PREVIEW_TEXT_INDENT_VAR, value: previewIndent, valid: validPreviewIndent },
        { variable: PREVIEW_LINE_HEIGHT_VAR, value: previewLineHeight, valid: validPreviewLineHeight },
        { variable: PREVIEW_FONT_FAMILY_VAR, value: previewFontFamily, valid: validPreviewFontFamily },
        { variable: PREVIEW_FONT_WEIGHT_VAR, value: previewFontWeight, valid: validPreviewFontWeight },
      ],
    });
  });
}

/** 卸载时移除全部叶子上的排版类与样式变量，避免残留影响非正文文件 */
function removeAllTypeset(plugin: NovelistsAssistantPlugin): void {
  plugin.app.workspace.iterateAllLeaves((leaf) => {
    const source = getTargetElement(leaf);
    source?.classList.remove(TYPESET_CLASS);
    source?.style.removeProperty(TYPESET_TEXT_INDENT_VAR);
    source?.style.removeProperty(TYPESET_LINE_HEIGHT_VAR);
    source?.style.removeProperty(TYPESET_FONT_FAMILY_VAR);
    source?.style.removeProperty(TYPESET_FONT_WEIGHT_VAR);
    const preview = getPreviewTargetElement(leaf);
    preview?.classList.remove(TYPESET_CLASS);
    preview?.style.removeProperty(PREVIEW_TEXT_INDENT_VAR);
    preview?.style.removeProperty(PREVIEW_LINE_HEIGHT_VAR);
    preview?.style.removeProperty(PREVIEW_FONT_FAMILY_VAR);
    preview?.style.removeProperty(PREVIEW_FONT_WEIGHT_VAR);
  });
}

/** 去除段落首尾空白：仅处理首尾的直接文本节点（软换行行尾空格由 markdown-it 残留为文本，内联元素包裹的空白不处理） */
function trimParagraphEdges(paragraph: Element): void {
  const first = paragraph.firstChild;
  if (first instanceof Text) {
    first.textContent = first.textContent?.trimStart() ?? "";
  }
  const last = paragraph.lastChild;
  if (last instanceof Text) {
    last.textContent = last.textContent?.trimEnd() ?? "";
  }
}

/**
 * 段落排版变换：将段落 <p> 替换为 <div> 容器（p 内嵌 p 非法，div 内嵌 div 合法），
 * 并把 <br> 软换行拆分为独立行 div，使每行都独立应用首行缩进。
 * 纯空段（仅 <br>）保留不动作为分段空隙；已变换的段落不再命中 .el-p p 选择器，重复执行天然幂等。
 */
function applyParagraphTypeset(el: HTMLElement): void {
  el.querySelectorAll(".el-p p").forEach((paragraph) => {
    // 段落替换为 div 容器：保留原位置与全部子节点（createEl 先挂到内容根末尾，再移动到原位置）
    const container = el.createDiv({ cls: PREVIEW_CLASS });
    paragraph.before(container);
    while (paragraph.firstChild !== null) {
      container.appendChild(paragraph.firstChild);
    }
    paragraph.remove();
    // 纯空段（仅 <br>）不拆分，作为分段空隙保留
    if (container.textContent?.trim() === "") return;
    // 按 <br> 切分：br 之前的兄弟节点（含内联元素整体搬运）组成行 div 插入其前
    let segmentStart: Node | null = container.firstChild;
    const brs = Array.from(container.querySelectorAll(":scope > br"));
    brs.forEach((br) => {
      const segment: Node[] = [];
      let node = segmentStart;
      while (node !== null && node !== br) {
        segment.push(node);
        node = node.nextSibling;
      }
      if (segment.length > 0) {
        // createEl 先追加到容器末尾，再移动到 <br> 前（Obsidian 实例方法，类型随 Node 增强可用）
        const newLine = container.createEl("p");
        segment.forEach((n) => newLine.appendChild(n));
        trimParagraphEdges(newLine);
        // 纯空白行无内容，删除避免空元素塌陷
        if (newLine.textContent === "") {
          newLine.remove();
        } else {
          br.before(newLine);
        }
      }
      segmentStart = br.nextSibling;
      br.remove();
    });
  });
}

/**
 * 剔除 <a> 超链接外层标签、保留内部文本：链接的下划线/颜色样式破坏小说排版观感，
 * Markdown 链接与 wikilink 渲染均为 <a>，一并处理。剔除后无 <a> 可再命中，重复执行天然幂等；
 * 开关关闭/目录变更后由 rerenderPreviewLeaves 全量重渲染重建 DOM 恢复链接。
 */
function unwrapLinks(el: HTMLElement): void {
  el.querySelectorAll("a").forEach((link) => {
    link.replaceWith(...link.childNodes);
  });
}

/**
 * 阅读视图渲染变换管线。renderPreview 依序执行；
 * 新增阅读视图排版规则只需追加条目（apply 内操作渲染后的内容根 el）并补充对应 CSS。
 */
const PREVIEW_TRANSFORMS: readonly PreviewTransform[] = [{ apply: unwrapLinks }, { apply: applyParagraphTypeset }];

/**
 * 阅读视图渲染处理器（MarkdownPostProcessor）：每次渲染完成回调，
 * 按文件所在目录与阅读视图排版开关决定是否执行变换管线；
 * 不满足条件时移除残留的排版类（类可安全移除且不影响拆分结构），防御增量渲染复用 DOM。
 */
function renderPreview(plugin: NovelistsAssistantPlugin, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
  const inNovelDir =
    plugin.settings.novelPreviewTypeset &&
    plugin.settings.novelDir !== "" &&
    isInside(ctx.sourcePath, plugin.settings.novelDir);
  if (!inNovelDir) {
    el.querySelectorAll(`.${PREVIEW_CLASS}`).forEach((node) => {
      node.classList.remove(PREVIEW_CLASS);
    });
    return;
  }
  PREVIEW_TRANSFORMS.forEach((transform) => transform.apply(el, ctx));
}

/** 全量重渲染所有已打开的阅读视图：开关/目录变更后重建段落类，使渲染管线变换即时生效 */
export function rerenderPreviewLeaves(plugin: NovelistsAssistantPlugin): void {
  plugin.app.workspace.iterateAllLeaves((leaf) => {
    if (leaf.view instanceof MarkdownView && leaf.view.getMode() === "preview") {
      leaf.view.previewMode.rerender(true);
    }
  });
}

/**
 * 初始化排版功能：开关开启时，正文目录内的文件在源码/阅读视图打开时应用排版样式。
 * 源码视图经 refreshTypeset 维护容器类与变量；阅读视图额外注册渲染管线
 * （MarkdownPostProcessor）在每次渲染后执行段落级变换。
 * layout-change 覆盖打开/关闭/模式切换，active-leaf-change 覆盖切换活动笔记，
 * 两者注册于 plugin 由 Obsidian 在卸载时自动回收；设置页变更经 refreshTypeset 即时刷新。
 * @param plugin 插件实例
 * @returns 清理函数，由 features 聚合层在卸载时回收残留类
 */
export function initTypeset(plugin: NovelistsAssistantPlugin): () => void {
  plugin.registerEvent(plugin.app.workspace.on("layout-change", () => refreshTypeset(plugin)));
  plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", () => refreshTypeset(plugin)));
  plugin.registerMarkdownPostProcessor((el, ctx) => renderPreview(plugin, el, ctx));
  refreshTypeset(plugin);
  return () => removeAllTypeset(plugin);
}
