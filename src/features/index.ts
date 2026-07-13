import { ObsidianPlugin } from "../core/types";
import { initTypesetting, unloadTypesetting } from "./typeset";
import { initGridlines, unloadGridlines } from "./gridlines";
import { initWordCount, unloadWordCount } from "./wordcount";
import { initLore, unloadLore } from "./lore";
import { initPreview, unloadPreview } from "./preview";
import { initNumbering, unloadNumbering } from "./numbering";

/** 初始化所有功能模块 */
export async function initFeatures(plugin: ObsidianPlugin) {
  await initTypesetting(plugin); // 初始化排版功能
  await initGridlines(plugin); // 初始化网格线功能
  await initLore(plugin); // 初始化设定功能
  await initWordCount(plugin); // 初始化字数统计
  await initPreview(plugin); // 初始化预览排版
  await initNumbering(plugin); // 初始化编号功能
}

/** 卸载所有功能模块 */
export function unloadFeatures(plugin: ObsidianPlugin) {
  unloadTypesetting(); // 卸载排版功能
  unloadGridlines(); // 卸载网格线功能
  unloadLore(); // 卸载设定功能
  unloadWordCount(plugin); // 卸载字数统计
  unloadPreview(); // 卸载预览排版
  unloadNumbering(); // 卸载编号功能
}
