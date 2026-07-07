import { ObsidianPlugin } from "../core/types";
import { initTypesetting } from "./typesetting";

export async function initFeatures(plugin: ObsidianPlugin) {
  await initTypesetting(plugin);
}
