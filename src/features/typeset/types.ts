import type { MarkdownPostProcessorContext } from "obsidian";

/** 排版效果类名，由样式表 [data-mode="source"] 与 [data-mode="preview"] 的容器选择器消费 */
export const TYPESET_CLASS = "novel-typeset";

/** 首行缩进 CSS 变量，值由设置页滑块写入，样式表以 var() 兜底消费 */
export const TYPESET_TEXT_INDENT_VAR = "--novel-text-indent";

/** 行高 CSS 变量，值由设置页滑块写入，样式表以 var() 兜底消费 */
export const TYPESET_LINE_HEIGHT_VAR = "--novel-line-height";

/** 阅读视图首行缩进 CSS 变量，值由设置页滑块写入，样式表以 var() 兜底消费 */
export const PREVIEW_TEXT_INDENT_VAR = "--novel-preview-text-indent";

/** 阅读视图行高 CSS 变量，值由设置页滑块写入，样式表以 var() 兜底消费 */
export const PREVIEW_LINE_HEIGHT_VAR = "--novel-preview-line-height";

/** 阅读视图排版段落类：段落容器与拆分出的行 div 共用，样式表 [data-mode="preview"] 消费 */
export const PREVIEW_CLASS = "novel-preview";

/** 阅读视图渲染变换：在渲染后的内容根 el 上执行 DOM 变换 */
export interface PreviewTransform {
  /** 在渲染后的阅读视图内容根上执行变换；新增排版规则只需追加条目并补充对应 CSS */
  apply(el: HTMLElement, ctx: MarkdownPostProcessorContext): void;
}
