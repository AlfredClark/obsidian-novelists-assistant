/** 目录角色标识，与 settings 中的目录字段一一对应 */
export type DirectoryRole = "lore" | "novel";

/** 默认目录条目：角色 + 本地化的目录名 */
export interface DirectoryEntry {
  role: DirectoryRole; // 目录角色
  name: string; // 目录名（按当前界面语言本地化）
}

/** 一键创建默认目录结构的执行结果 */
export interface CreateStructureResult {
  created: string[]; // 本次实际创建成功的目录路径
  failed: string[]; // 创建失败的目录路径
}
