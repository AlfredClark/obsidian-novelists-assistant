import type { TFile, TFolder } from "obsidian";
import type NovelistsAssistantPlugin from "../../main";

/** 侧边栏视图类型标识，registerView 与 leaf.setViewState 共用 */
export const SIDEBAR_VIEW_TYPE = "novelists-assistant-sidebar";

/** 侧边栏页面标识，对应设定与纲要两个标签 */
export type SidebarPage = "lore" | "outline";

/** 页面到目录设置字段的映射，页面组件据此读取对应目录 */
export const SIDEBAR_DIR_KEYS: Record<SidebarPage, "loreDir" | "outlineDir"> = {
  lore: "loreDir",
  outline: "outlineDir",
};

/** 页面到每行条目数设置字段的映射，页面组件据此读取对应列数 */
export const SIDEBAR_COLUMN_KEYS: Record<SidebarPage, "sidebarLoreColumns" | "sidebarOutlineColumns"> = {
  lore: "sidebarLoreColumns",
  outline: "sidebarOutlineColumns",
};

/** 每行条目数的取值范围，设置页滑块与解析钳制共用 */
export const SIDEBAR_COLUMNS_MIN = 1;

/** 每行条目数的取值上限，设置页滑块与解析钳制共用 */
export const SIDEBAR_COLUMNS_MAX = 10;

/** 目录分组：直接子文件夹与其直属 md 文件 */
export interface DirGroup {
  folder: TFolder; // 分组文件夹
  files: TFile[]; // 组内直属 md 文件
}

/** 目录模型：分组、根直属文件与目录状态 */
export interface DirModel {
  configured: boolean; // 目录已配置
  exists: boolean; // 目录存在
  groups: DirGroup[]; // 直接子文件夹分组
  rootFiles: TFile[]; // 根直属 md 文件（未分组区）
}

/** 渲染节：未分组文件节或分组节，展示顺序由所属页面决定 */
export type DirSection =
  | { kind: "ungrouped"; files: TFile[] } // 未分组文件节
  | { kind: "group"; group: DirGroup }; // 分组节

/** 根组件属性：插件实例经视图挂载透传 */
export interface SidebarRootProps {
  plugin: NovelistsAssistantPlugin; // 插件实例
}

/** 目录页属性：所属页面、搜索词与打开回调，目录由页面解析 */
export interface DirectoryPageProps {
  plugin: NovelistsAssistantPlugin; // 插件实例
  page: SidebarPage; // 所属页面
  query: string; // 搜索关键词，页面内过滤条目
  onopen: (file: TFile) => void; // 文件打开回调
}

/** 阅读页属性：插件实例与待读文件 */
export interface ReadingPageProps {
  plugin: NovelistsAssistantPlugin; // 插件实例
  file: TFile; // 待读文件
}
