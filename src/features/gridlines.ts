import { ObsidianPlugin } from "../core/types";

export async function initGridlines(plugin: ObsidianPlugin) {
  const { gridlinesEnabled, gridlinesSize, gridlinesRatio, gridlinesThick, gridlinesOpacity } =
    plugin.settings;
  window.document.documentElement.toggleClass("novel-gridlines", gridlinesEnabled);
  window.document.documentElement.style.setProperty("--novel-gridlines-size", `${gridlinesSize}px`);
  window.document.documentElement.style.setProperty(
    "--novel-gridlines-space",
    `${gridlinesSize * gridlinesRatio}px`,
  );
  window.document.documentElement.style.setProperty(
    "--novel-gridlines-thick",
    `${gridlinesThick}px`,
  );
  window.document.documentElement.style.setProperty(
    "--novel-gridlines-opacity",
    `${gridlinesOpacity}%`,
  );
}
