import { ObsidianPlugin } from "../core/types";
import { initTypesetting } from "./typesetting";
import { initGridlines } from "./gridlines";

export async function initFeatures(plugin: ObsidianPlugin) {
  await initTypesetting(plugin);
  await initGridlines(plugin);
}
