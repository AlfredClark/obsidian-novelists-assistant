import { ObsidianPlugin } from "../core/types";

/** 初始化排版功能：根据配置设置 CSS 变量控制排版样式 */
export async function initTypesetting(plugin: ObsidianPlugin) {
  const { typesettingEnabled, typesettingIndent, typesettingLineHeight } = plugin.settings;
  // 切换排版功能启用状态
  window.document.documentElement.toggleClass("novel-typesetting", typesettingEnabled);
  // 设置段落缩进（rem 单位）
  window.document.documentElement.style.setProperty(
    "--novel-typesetting-indent",
    `${typesettingIndent}rem`,
  );
  // 设置行高（rem 单位）
  window.document.documentElement.style.setProperty(
    "--novel-typesetting-line-height",
    `${typesettingLineHeight}rem`,
  );
}
