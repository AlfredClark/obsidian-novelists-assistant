import { ObsidianPlugin } from "./types";
import { ItemView, WorkspaceLeaf } from "obsidian";
import * as m from "../i18n/paraglide/messages";

export const VIEW_TYPE = "obsidian-plugin-template-sidebar";

export class SidebarView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Template sidebar";
  }

  getIcon(): string {
    return "dice";
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: m.sidebar_title() });
    contentEl.createEl("p", { text: m.sidebar_content() });
  }

  async onClose() {
    this.contentEl.empty();
  }
}

export async function detachSidebar(plugin: ObsidianPlugin) {
  plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leave) => {
    leave.detach();
  });
}

export async function registerSidebar(plugin: ObsidianPlugin) {
  plugin.registerView(VIEW_TYPE, (leaf) => new SidebarView(leaf));
}
