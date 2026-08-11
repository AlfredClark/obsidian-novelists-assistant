import { Plugin } from "obsidian";
import { initCores } from "./cores";
import { cleanFeatures, initFeatures } from "./features";
import type { NovelistsAssistantSettings } from "./cores/settings";

/**
 * 插件入口类。Obsidian 直接实例化此类；onload 仅做聚合初始化，不含业务逻辑，
 * 业务逻辑按 cores/features 分层下沉，保证 main 文件持续最小化。
 */
export default class NovelistsAssistantPlugin extends Plugin {
  // 基类 Plugin 已声明 settings（1.13.0+），此处仅收窄类型，不重复声明字段
  /**
   * 插件设置。在 onload 的 initCores 阶段加载完毕，后续模块可安全读取。
   */
  declare settings: NovelistsAssistantSettings;

  /**
   * 插件加载入口。先初始化核心能力再初始化业务功能：
   * features 可能依赖 settings 等共享基础设施，顺序不可颠倒。
   */
  async onload() {
    await initCores(this);
    await initFeatures(this);
  }

  /** 插件卸载入口。回收各 feature 注册的资源，避免残留空标签页 */
  onunload() {
    cleanFeatures();
  }
}
