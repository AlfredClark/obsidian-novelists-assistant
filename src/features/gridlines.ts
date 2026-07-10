import { ObsidianPlugin } from "../core/types";

/** 初始化网格线功能：根据配置设置 CSS 变量控制网格线显示 */
export async function initGridlines(plugin: ObsidianPlugin) {
  const { gridlinesEnabled, gridlinesSize, gridlinesRatio, gridlinesThick, gridlinesOpacity } =
    plugin.settings;
  // 切换网格线显示状态
  window.document.documentElement.toggleClass("novel-gridlines", gridlinesEnabled);
  // 设置网格单元格大小
  window.document.documentElement.style.setProperty("--novel-gridlines-size", `${gridlinesSize}px`);
  // 设置网格间距（格子宽度 × 比例倍数）
  window.document.documentElement.style.setProperty(
    "--novel-gridlines-space",
    `${gridlinesSize * gridlinesRatio}px`,
  );
  // 设置网格线粗细
  window.document.documentElement.style.setProperty(
    "--novel-gridlines-thick",
    `${gridlinesThick}px`,
  );
  // 设置网格线不透明度
  window.document.documentElement.style.setProperty(
    "--novel-gridlines-opacity",
    `${gridlinesOpacity}%`,
  );
}

/** 卸载网格线功能：清除网格线相关的 CSS class 与变量 */
export function unloadGridlines() {
  window.document.documentElement.removeClass("novel-gridlines");
  window.document.documentElement.style.removeProperty("--novel-gridlines-size");
  window.document.documentElement.style.removeProperty("--novel-gridlines-space");
  window.document.documentElement.style.removeProperty("--novel-gridlines-thick");
  window.document.documentElement.style.removeProperty("--novel-gridlines-opacity");
}
