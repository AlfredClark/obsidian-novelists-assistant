import { DEFAULT_SETTINGS, ObsidianPlugin, Settings } from "./types";

/**
 * Register and set settings in the plugin
 * @param plugin plugin
 */
export async function initSettings(plugin: ObsidianPlugin) {
  plugin.settings = Object.assign(
    {},
    DEFAULT_SETTINGS,
    (await plugin.loadData()) as Partial<Settings>,
  );
}
