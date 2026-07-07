import { ObsidianPlugin } from "./core/types";

/** 插件主入口 */
export default class NovelistsAssistantPlugin extends ObsidianPlugin {
  async onload() {
    await this.initPlugin();
  }
}
