import { TFolder } from "obsidian";
import { t } from "../../cores/i18n";
import type { CreateStructureResult, DirectoryEntry, DirectoryRole } from "./types";
import type NovelistsAssistantPlugin from "../../main";

/** 各角色对应的设置字段名，保证角色与字段一一对应 */
const SETTING_KEYS: Record<DirectoryRole, "loreDir" | "novelDir"> = {
  lore: "loreDir",
  novel: "novelDir",
};

/**
 * 按当前界面语言生成默认目录条目。目录名随语言本地化，
 * 仅在创建时取值并持久化为实际路径，之后切换语言不影响已建目录。
 */
export function getDefaultDirectories(): DirectoryEntry[] {
  return [
    { role: "lore", name: t("structure.defaultLore") },
    { role: "novel", name: t("structure.defaultNovel") },
  ];
}

/**
 * 一键创建默认目录结构并自动指向：已有有效指向的角色不动，
 * 其余按默认名补齐目录（已存在则跳过创建，同名文件占用或持久化失败归入失败）并写入设置。
 * @param plugin 插件实例
 * @returns 创建结果，调用方负责向用户反馈
 */
export async function createDefaultStructure(plugin: NovelistsAssistantPlugin): Promise<CreateStructureResult> {
  const result: CreateStructureResult = { created: [], failed: [] };
  // 记录实际改动的指向，仅在有改动时落盘；保存失败时按此回滚内存，避免界面与磁盘不一致
  const updated: Array<{ key: "loreDir" | "novelDir"; previous: string; name: string }> = [];
  for (const { role, name } of getDefaultDirectories()) {
    const key = SETTING_KEYS[role];
    const current = plugin.settings[key];
    if (current && plugin.app.vault.getAbstractFileByPath(current) instanceof TFolder) {
      continue;
    }
    if (!(plugin.app.vault.getAbstractFileByPath(name) instanceof TFolder)) {
      try {
        await plugin.app.vault.createFolder(name);
        result.created.push(name);
      } catch {
        result.failed.push(name);
        continue;
      }
    }
    updated.push({ key, previous: current, name });
    plugin.settings[key] = name;
  }
  if (updated.length > 0) {
    try {
      await plugin.saveData(plugin.settings);
    } catch {
      for (const { key, previous } of updated) {
        plugin.settings[key] = previous;
      }
      result.failed.push(...updated.map(({ name }) => name));
    }
  }
  return result;
}

/**
 * 初始化目录结构功能：探测默认目录是否已存在，存在则自动补齐设置指向并持久化。
 * 保守口径：仅补齐空指向，非空指向（含无效）一律不动，避免启动期覆盖用户配置；
 * 缺失时保持现状（留待设置页一键创建）。
 * @param plugin 插件实例
 */
export async function initStructure(plugin: NovelistsAssistantPlugin): Promise<void> {
  let changed = false;
  for (const { role, name } of getDefaultDirectories()) {
    const key = SETTING_KEYS[role];
    if (plugin.settings[key]) continue; // 已有指向不覆盖
    if (plugin.app.vault.getAbstractFileByPath(name) instanceof TFolder) {
      plugin.settings[key] = name;
      changed = true;
    }
  }
  if (changed) {
    try {
      await plugin.saveData(plugin.settings);
    } catch (error) {
      // 持久化失败不阻断启动，仅记录；内存指向保持，下次启动重新探测
      console.error("Failed to persist directory pointers", error);
    }
  }
}
