import { initI18n } from "./i18n";
import { initSettings } from "./settings";
import NovelistsAssistantPlugin from "../main";

/**
 * 聚合初始化全部 core 模块（设置、i18n 等共享基础设施）。
 * 新增 core 模块时只需在此追加一行 init 调用，main.ts 无需改动。
 * @param plugin 插件实例；type-only 导入具体类，运行时无循环
 */
export async function initCores(plugin: NovelistsAssistantPlugin): Promise<void> {
  await initI18n(plugin);
  await initSettings(plugin);
}
