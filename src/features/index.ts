import type NovelistsAssistantPlugin from "../main";

/** 各 feature 注册的清理函数，cleanFeatures 在卸载时依序回收 */
const cleanups: Array<() => void> = [];

/**
 * 聚合初始化全部 feature 模块（命令、视图等业务功能）。
 * 新增 feature 只需在此追加 init 调用，main.ts 无需改动。
 * @param plugin 插件实例；type-only 导入具体类，运行时无循环
 */
export async function initFeatures(plugin: NovelistsAssistantPlugin): Promise<void> {
  // 首个 feature 落地后在此处依序调用各模块的 init 方法
  void plugin;
}

/** 卸载时依序回收各 feature 注册的资源（视图叶子等） */
export function cleanFeatures(): void {
  cleanups.forEach((cleanup) => cleanup());
}
