import { Plugin } from "obsidian";
import { locales } from "../i18n/paraglide/runtime";
import { initCore } from "./index";
import { initFeatures } from "../features";

/** 插件配置项 */
export type Settings = {
  /** 常规 */
  /** 语言："app" 跟随系统，或具体语言代码 */
  locale: "app" | (typeof locales)[number];
  /** 排版 */
  indent: number;
  lineHeight: number;
};

/** 默认配置 */
export const DEFAULT_SETTINGS: Settings = {
  locale: "app",
  indent: 2,
  lineHeight: 2,
};

/** 插件基类，持有类型化的 settings 属性 */
export class ObsidianPlugin extends Plugin {
  declare settings: Settings;

  /** 从磁盘加载保存的配置，与默认配置合并后挂载到 this.settings */
  async initPlugin() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<Settings>,
    );
    await this.saveSettings();
    await initCore(this);
    await initFeatures(this);
  }

  /** 将 this.settings 保存至磁盘中的配置文件中 */
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
