import { ObsidianPlugin } from "../core/types";

export async function initTypesetting(plugin: ObsidianPlugin) {
  window.document.documentElement.addClass("novel-typesetting");
  window.document.documentElement.style.setProperty(
    "--novel-typesetting-indent",
    `${plugin.settings.indent}rem`,
  );
  window.document.documentElement.style.setProperty(
    "--novel-typesetting-line-height",
    `${plugin.settings.lineHeight}rem`,
  );
}
