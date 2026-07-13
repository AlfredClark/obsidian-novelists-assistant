import { ObsidianPlugin } from "../core/types";
import { MarkdownPostProcessorContext } from "obsidian";

/** 用于解析 HTML 片段提取纯文本 */
const parser = new DOMParser();

/** 初始化预览排版功能：设置 CSS 变量，注册 Markdown 后处理器 */
export async function initPreview(plugin: ObsidianPlugin) {
  const { previewIndent, previewLineHeight, previewSpacing } = plugin.settings;
  window.document.documentElement.toggleClass("novel-preview", plugin.settings.previewEnabled);
  // 设置段落缩进
  window.document.documentElement.style.setProperty(
    "--novel-preview-indent",
    `${previewIndent}rem`,
  );
  // 设置行高
  window.document.documentElement.style.setProperty(
    "--novel-preview-line-height",
    `${previewLineHeight}rem`,
  );
  // 设置段落间距
  window.document.documentElement.style.setProperty(
    "--novel-preview-spacing",
    `${previewSpacing}rem`,
  );
  // 注册后处理器：在阅读视图渲染时对内容进行加工
  plugin.registerMarkdownPostProcessor((el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    // 跳过设定库中的文件
    if (plugin.settings.lorePath && ctx.sourcePath.startsWith(plugin.settings.lorePath)) {
      el.toggleClass("un-preview", true);
      return;
    }
    // 预览未启用时不处理
    if (!plugin.settings.previewEnabled) return;

    const ps = el.getElementsByTagName("p");
    const paragraphs: string[] = [];
    for (let i = 0; i < ps.length; i++) {
      ps.item(i)
        ?.innerHTML.split("<br>")
        .forEach((item) => {
          if (plugin.settings.previewLinksEnabled) {
            // 保留链接：直接取原始 HTML
            paragraphs.push(item.trim());
          } else {
            // 不保留链接：仅提取纯文本
            paragraphs.push(
              parser.parseFromString(item.trim(), "text/html").body.textContent.trim(),
            );
          }
        });
    }
    // 清空原文并重新写入处理后的段落
    el.empty();
    paragraphs.forEach((paragraph) => {
      const pEl = el.createEl("p");
      if (plugin.settings.previewLinksEnabled && paragraph) {
        pEl.innerHTML = paragraph;
      } else {
        pEl.textContent = paragraph;
      }
    });
  });
}

/** 卸载预览排版功能：清理 CSS 变量和 class */
export function unloadPreview() {
  window.document.documentElement.classList.remove("novel-preview");
  window.document.documentElement.style.removeProperty("--novel-preview-indent");
  window.document.documentElement.style.removeProperty("--novel-preview-line-height");
  window.document.documentElement.style.removeProperty("--novel-preview-spacing");
}
