import { ObsidianPlugin } from "./core/types";

/** 插件主入口 */
export default class NovelistsAssistantPlugin extends ObsidianPlugin {
  /** 插件加载时触发，初始化所有功能 */
  async onload() {
    await this.initPlugin();
  }

  /** 插件卸载时触发，清理所有功能和资源 */
  onunload() {
    super.onunload();
    this.unloadPlugin();
  }
}
