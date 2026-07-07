import { ObsidianPlugin } from "./core/types";
import { registerCore } from "./core";

/** 插件主入口 */
export default class NovelistsAssistantPlugin extends ObsidianPlugin {
  async onload() {
    await this.initSettings();
    await registerCore(this);
  }
}
