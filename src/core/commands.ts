import { ObsidianPlugin } from "./types";
import { Command, Editor, MarkdownView, MarkdownFileInfo, Modal } from "obsidian";

export async function removeCommands(plugin: ObsidianPlugin) {
  plugin.commands_ids?.forEach((id: string) => {
    plugin.removeCommand(id);
  });
  plugin.commands_ids = [];
}

export async function addCommands(plugin: ObsidianPlugin) {
  const commands: Command[] = [
    {
      id: "open-modal-simple",
      name: "Open modal (simple)",
      callback: () => {
        new Modal(plugin.app).setTitle("Open modal").setContent("Open modal (simple)").open();
      },
    },
    {
      id: "replace-selected",
      name: "Replace selected content",
      editorCallback: (editor: Editor, _view: MarkdownView | MarkdownFileInfo) => {
        editor.replaceSelection("Sample editor command");
      },
    },
    {
      id: "open-modal-complex",
      name: "Open modal (complex)",
      checkCallback: (checking: boolean) => {
        const markdownView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          if (!checking) {
            new Modal(plugin.app).setTitle("Open modal").setContent("Open modal (complex)").open();
          }
          return true;
        }
        return false;
      },
    },
  ];
  plugin.commands_ids = [];
  commands.forEach((command) => {
    plugin.commands_ids?.push(plugin.addCommand(command).id);
  });
}
