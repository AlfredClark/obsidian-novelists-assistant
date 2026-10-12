import { ItemView, TFile, TFolder } from "obsidian";
import type { TAbstractFile, WorkspaceLeaf } from "obsidian";
import { SIDEBAR_VIEW_TYPE } from "./types";
import type { DirModel } from "./types";
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

  /** 插件实例；页面组件经挂载属性向下传递 vault/settings/workspace 访问 */
  private plugin: NovelistsAssistantPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: NovelistsAssistantPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

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
    this.mounted = mountComponent(this.contentEl, SidebarRoot, { plugin: this.plugin });
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

/** 按名排序：数字感知字母序（第2章 < 第10章），中文按本地 collation */
function compareEntryName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

/**
 * 构建目录模型：一层分组（直属子文件夹）+ 未分组区（根直属 md），深层嵌套忽略，仅收录 md。
 * 纯内存遍历（children 在内存中），高频刷新安全。
 * @param plugin 插件实例
 * @param dir 目录路径；空字符串表示未配置
 * @returns 目录模型
 */
export function buildDirectoryModel(plugin: NovelistsAssistantPlugin, dir: string): DirModel {
  if (dir === "") return { configured: false, exists: false, groups: [], rootFiles: [] };
  const folder = plugin.app.vault.getAbstractFileByPath(dir);
  if (!(folder instanceof TFolder)) return { configured: true, exists: false, groups: [], rootFiles: [] };
  const isMd = (file: TAbstractFile): file is TFile => file instanceof TFile && file.extension === "md";
  const sortFiles = (a: TFile, b: TFile): number => compareEntryName(a.basename, b.basename);
  const groups = folder.children
    .filter((child): child is TFolder => child instanceof TFolder)
    .sort((a, b) => compareEntryName(a.name, b.name))
    .map((sub) => ({ folder: sub, files: sub.children.filter(isMd).sort(sortFiles) }));
  return {
    configured: true,
    exists: true,
    groups,
    rootFiles: folder.children.filter(isMd).sort(sortFiles),
  };
}

/**
 * 按关键词过滤目录模型：文件名含关键词（大小写不敏感，去首尾空格）则保留；
 * 分组名命中时整组保留，否则仅保留组内命中文件；空查询返回原模型。
 * 纯函数，供页面经 $derived 计算。
 * @param model 目录模型
 * @param query 搜索关键词
 * @returns 过滤后的目录模型（configured/exists 原样保留）
 */
export function filterDirectoryModel(model: DirModel, query: string): DirModel {
  const keyword = query.trim().toLowerCase();
  if (keyword === "") return model;
  const matches = (name: string): boolean => name.toLowerCase().includes(keyword);
  const groups = model.groups.flatMap((group) => {
    if (matches(group.folder.name)) return [group];
    const files = group.files.filter((file) => matches(file.basename));
    return files.length > 0 ? [{ folder: group.folder, files }] : [];
  });
  return { ...model, groups, rootFiles: model.rootFiles.filter((file) => matches(file.basename)) };
}

/**
 * 初始化侧边栏：注册自定义视图与 Ribbon 图标。
 * 视图与图标由 Obsidian 在插件卸载时自动回收（与 registerView/addRibbonIcon 的文档行为一致）。
 * @param plugin 插件实例
 */
export async function initSidebar(plugin: NovelistsAssistantPlugin): Promise<void> {
  plugin.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new SidebarView(leaf, plugin));
  plugin.addRibbonIcon("book-open", PLUGIN_NAME, () => void activateSidebar(plugin));
}
