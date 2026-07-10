import { ObsidianPlugin } from "../core/types";

/** 初始化排版功能：根据配置设置 CSS 变量控制排版样式 */
export async function initTypesetting(plugin: ObsidianPlugin) {
  const { typesetEnabled, typesetIndent, typesetLineHeight } = plugin.settings;
  // 切换排版功能启用状态
  window.document.documentElement.toggleClass("novel-typeset", typesetEnabled);
  // 设置段落缩进（rem 单位）
  window.document.documentElement.style.setProperty(
    "--novel-typeset-indent",
    `${typesetIndent}rem`,
  );
  // 设置行高（rem 单位）
  window.document.documentElement.style.setProperty(
    "--novel-typeset-line-height",
    `${typesetLineHeight}rem`,
  );
}

/** 卸载排版功能：清除排版相关的 CSS class 与变量 */
export function unloadTypesetting() {
  window.document.documentElement.removeClass("novel-typeset");
  window.document.documentElement.style.removeProperty("--novel-typeset-indent");
  window.document.documentElement.style.removeProperty("--novel-typeset-line-height");
}
