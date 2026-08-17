import { ItemView } from "obsidian";
import { SIDEBAR_VIEW_TYPE } from "./types";
import { mountComponent } from "../../utils/svelte";
import type { MountedComponent } from "../../utils/svelte";
import type NovelistsAssistantPlugin from "../../main";
import SidebarRoot from "./components/SidebarRoot.svelte";

/** 插件名，视图标题与 Ribbon 提示共用；与 manifest.json 的 name 保持一致 */
const PLUGIN_NAME = "Novelists Assistant";

/**
 * 侧边栏视图。内容全部由 Svelte 根组件渲染，视图仅负责挂载/回收生命周期。
 * 视图注册与叶子由 Obsidian 卸载时自动回收，无需手动清理。
 */
class SidebarView extends ItemView {
  /** Svelte 根组件挂载句柄；onClose 时回收，空值表示未挂载 */
  private mounted: MountedComponent | null = null;

  getViewType(): string {
    return SIDEBAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return PLUGIN_NAME;
  }

  getIcon(): string {
    return "book-open";
  }

  async onOpen(): Promise<void> {
    this.mounted = mountComponent(this.contentEl, SidebarRoot);
  }

  async onClose(): Promise<void> {
    this.mounted?.destroy();
    this.mounted = null;
  }
}

/**
 * 激活侧边栏：已有视图叶子则直接激活显示，否则在右侧边栏新建叶子并打开。
 * 仅负责激活，不做关闭逻辑。
 * @param plugin 插件实例
 */
async function activateSidebar(plugin: NovelistsAssistantPlugin): Promise<void> {
  const leaves = plugin.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
  const existing = leaves[0];
  if (existing) {
    await plugin.app.workspace.revealLeaf(existing);
    return;
  }
  const leaf = plugin.app.workspace.getRightLeaf(false);
  if (!leaf) return;
  await leaf.setViewState({ type: SIDEBAR_VIEW_TYPE, active: true });
  await plugin.app.workspace.revealLeaf(leaf);
}

/**
 * 初始化侧边栏：注册自定义视图与 Ribbon 图标。
 * 视图与图标由 Obsidian 在插件卸载时自动回收（与 registerView/addRibbonIcon 的文档行为一致）。
 * @param plugin 插件实例
 */
export async function initSidebar(plugin: NovelistsAssistantPlugin): Promise<void> {
  plugin.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new SidebarView(leaf));
  plugin.addRibbonIcon("book-open", PLUGIN_NAME, () => void activateSidebar(plugin));
}
