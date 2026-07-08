import { Plugin } from "obsidian";
import { locales } from "../i18n/paraglide/runtime";
import { initCore } from "./index";
import { initFeatures } from "../features";

/** 插件配置项 */
export type Settings = {
  /** 界面语言 */
  locale: "app" | (typeof locales)[number];
  /** 是否折叠设置页面的设置项 */
  foldSettings: boolean;
  /** 排版 */
  typesettingEnabled: boolean;
  /** 段落缩进（rem） */
  typesettingIndent: number;
  /** 行高（rem） */
  typesettingLineHeight: number;
  /** 网格线 */
  gridlinesEnabled: boolean;
  /** 网格单元格宽度（px） */
  gridlinesSize: number;
  /** 网格间距倍数 */
  gridlinesRatio: number;
  /** 网格线粗细（px） */
  gridlinesThick: number;
  /** 网格线不透明度（%） */
  gridlinesOpacity: number;
};

/** 默认配置 */
export const DEFAULT_SETTINGS: Settings = {
  locale: "app",
  foldSettings: false,
  typesettingEnabled: true,
  typesettingIndent: 2,
  typesettingLineHeight: 2,
  gridlinesEnabled: true,
  gridlinesSize: 5,
  gridlinesRatio: 2,
  gridlinesThick: 1,
  gridlinesOpacity: 50,
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
