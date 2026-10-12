import { ItemView, TFile, TFolder } from "obsidian";
import type { TAbstractFile, WorkspaceLeaf } from "obsidian";
import { SIDEBAR_COLUMNS_MAX, SIDEBAR_COLUMNS_MIN, SIDEBAR_COLUMN_KEYS, SIDEBAR_VIEW_TYPE } from "./types";
import type { DirModel, DirSection, SidebarPage } from "./types";
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

/** 每行条目数变更订阅回调集合；滑块变更时通知已打开的目录页重排网格 */
const sidebarColumnsListeners = new Set<() => void>();

/**
 * 订阅每行条目数变更。变更仅发生在设置页侧栏滑块（settings 层写入后广播），
 * 订阅方在回调中重算列数并重排网格（目录模型不动，搜索词与页签状态保留）。
 * @param listener 条目数变更回调
 * @returns 取消订阅函数
 */
export function subscribeSidebarColumnsChange(listener: () => void): () => void {
  sidebarColumnsListeners.add(listener);
  return () => {
    sidebarColumnsListeners.delete(listener);
  };
}

/** 广播每行条目数变更。由 settings 模块在侧栏滑块写入后调用 */
export function notifySidebarColumnsChange(): void {
  sidebarColumnsListeners.forEach((listener) => listener());
}

/**
 * 解析指定页面的每行条目数：取整后钳制在取值范围内，脏值回退对应页默认值。
 * data.json 手改或旧版本脏数据经此防御，不污染网格模板。
 * @param plugin 插件实例
 * @param page 侧边栏页面
 * @returns 钳制后的每行条目数
 */
export function resolveSidebarColumns(plugin: NovelistsAssistantPlugin, page: SidebarPage): number {
  // 默认值与 settings 的 DEFAULT_SETTINGS 保持一致（lore 4 / outline 1），此处硬编码防运行时循环
  const fallback = page === "lore" ? 4 : 1;
  const raw = plugin.settings[SIDEBAR_COLUMN_KEYS[page]];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  const floored = Math.floor(raw);
  if (floored < SIDEBAR_COLUMNS_MIN) return SIDEBAR_COLUMNS_MIN;
  if (floored > SIDEBAR_COLUMNS_MAX) return SIDEBAR_COLUMNS_MAX;
  return floored;
}

/**
 * 排布渲染节：设定页分组在前、未分组节殿后；纲要页未分组节置顶、分组随后。
 * 未分组无文件时不产生空节；空分组保留，由模板提示空分组。
 * 纯函数，供页面经 $derived 计算。
 * @param model 过滤后的目录模型
 * @param page 侧边栏页面
 * @returns 排好序的渲染节
 */
export function orderDirectorySections(model: DirModel, page: SidebarPage): DirSection[] {
  const groups = model.groups.map((group) => ({ kind: "group" as const, group }));
  if (model.rootFiles.length === 0) return groups;
  const ungrouped = { kind: "ungrouped" as const, files: model.rootFiles };
  return page === "outline" ? [ungrouped, ...groups] : [...groups, ungrouped];
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
