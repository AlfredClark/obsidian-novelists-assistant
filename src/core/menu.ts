import { Notice } from "obsidian";
import { ObsidianPlugin } from "./types";

export async function registerMenu(plugin: ObsidianPlugin) {
  // File Menu
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu, file) => {
      menu.addItem((item) => {
        item
          .setTitle("Print file path 👈")
          .setIcon("document")
          .onClick(async () => {
            new Notice(file.path);
          });
      });
    }),
  );
  // Editor Menu
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu, editor, view) => {
      menu.addItem((item) => {
        item
          .setTitle("Print file path 👈")
          .setIcon("document")
          .onClick(async () => {
            new Notice(view?.file?.path ?? editor.getValue());
          });
      });
    }),
  );
}
