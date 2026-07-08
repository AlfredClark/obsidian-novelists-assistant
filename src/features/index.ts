import { ObsidianPlugin } from "../core/types";
import { initTypesetting } from "./typesetting";
import { initGridlines } from "./gridlines";

/** 初始化所有功能模块 */
export async function initFeatures(plugin: ObsidianPlugin) {
  await initTypesetting(plugin); // 初始化排版功能
  await initGridlines(plugin); // 初始化网格线功能
}
