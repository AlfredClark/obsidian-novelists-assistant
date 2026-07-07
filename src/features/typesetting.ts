import { ObsidianPlugin } from "../core/types";

export async function initTypesetting(plugin: ObsidianPlugin) {
  const { typesettingEnabled, indent, lineHeight } = plugin.settings;
  window.document.documentElement.toggleClass("novel-typesetting", typesettingEnabled);
  window.document.documentElement.style.setProperty("--novel-typesetting-indent", `${indent}rem`);
  window.document.documentElement.style.setProperty(
    "--novel-typesetting-line-height",
    `${lineHeight}rem`,
  );
}
