import { Plugin } from "obsidian";
import { locales } from "../i18n/paraglide/runtime";
import { initCore } from "./index";
import { initFeatures, unloadFeatures } from "../features";

/** 插件配置项 */
export type Settings = {
  /** 界面语言 */
  locale: "app" | (typeof locales)[number];
  /** 是否折叠设置页面的设置项 */
  foldSettings: boolean;
  /** 排版 */
  typesetEnabled: boolean;
  /** 段落缩进（rem） */
  typesetIndent: number;
  /** 行高（rem） */
  typesetLineHeight: number;
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
  /** 设定库路径 */
  lorePath: string;
  /** 快速创建设定功能开启 */
  loreQuickCreateEnabled: boolean;
  /** 禁用设定库中的样式 */
  loreStylesDisabled: boolean;
  /** 设定建议触发前缀 */
  loreSuggestPrefix: string;
  /** 字数统计 */
  wordCountEnabled: boolean;
  /** 字数后缀 */
  wordCountSuffix: string;
  /** 预览排版 */
  previewEnabled: boolean;
  /** 预览段落缩进（rem） */
  previewIndent: number;
  /** 预览行高（rem） */
  previewLineHeight: number;
  /** 预览段落间距（rem） */
  previewSpacing: number;
  /** 预览模式下是否显示链接 */
  previewLinksEnabled: boolean;
};

/** 默认配置 */
export const DEFAULT_SETTINGS: Settings = {
  locale: "app",
  foldSettings: false,
  typesetEnabled: true,
  typesetIndent: 2,
  typesetLineHeight: 2,
  gridlinesEnabled: true,
  gridlinesSize: 5,
  gridlinesRatio: 2,
  gridlinesThick: 1,
  gridlinesOpacity: 75,
  lorePath: "",
  loreQuickCreateEnabled: true,
  loreStylesDisabled: true,
  loreSuggestPrefix: "//",
  wordCountEnabled: true,
  wordCountSuffix: "字",
  previewEnabled: false,
  previewIndent: 2,
  previewLineHeight: 1.5,
  previewSpacing: 1,
  previewLinksEnabled: true,
};

/** 插件基类，持有类型化的 settings 属性 */
export class ObsidianPlugin extends Plugin {
  declare settings: Settings;

  /** 初始化插件并从磁盘加载保存的配置，与默认配置合并后挂载到 this.settings */
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

  /** 卸载插件及相关功能 */
  unloadPlugin() {
    unloadFeatures(this);
  }
}
