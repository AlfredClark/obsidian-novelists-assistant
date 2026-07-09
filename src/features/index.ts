import { ObsidianPlugin } from "../core/types";
import { initTypesetting, unloadTypesetting } from "./typesetting";
import { initGridlines, unloadGridlines } from "./gridlines";
import { initWordCount, unloadWordCount } from "./word-count";

/** 初始化所有功能模块 */
export async function initFeatures(plugin: ObsidianPlugin) {
  await initTypesetting(plugin); // 初始化排版功能
  await initGridlines(plugin); // 初始化网格线功能
  await initWordCount(plugin); // 初始化字数统计
}

/** 卸载所有功能模块 */
export function unloadFeatures(plugin: ObsidianPlugin) {
  unloadTypesetting(); // 卸载排版功能
  unloadGridlines(); // 卸载网格线功能
  unloadWordCount(plugin); // 卸载字数统计
}
