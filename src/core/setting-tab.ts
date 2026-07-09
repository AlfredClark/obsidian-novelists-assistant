import { getLanguage, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { ObsidianPlugin } from "./types";
import * as m from "../i18n/paraglide/messages";
import { setLocale, toLocale, baseLocale } from "../i18n/paraglide/runtime";
import { resetWordCount } from "../features/word-count";

/** 插件设置页 */
export class CorePluginSettingTab extends PluginSettingTab {
  plugin: ObsidianPlugin;
  foldSettings: unknown;

  constructor(plugin: ObsidianPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
    this.foldSettings = plugin.settings.foldSettings;
  }

  /** 返回声明式设置定义，Obsidian 自动渲染 */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        /** 常规分组 */
        heading: m.settings_general(),
        type: "group",
        items: [
          {
            /** 语言 */
            name: m.settings_general_language(),
            desc: m.settings_general_language_desc(),
            control: {
              key: "locale",
              type: "dropdown",
              defaultValue: "app",
              options: {
                app: m.settings_general_language_option_app(),
                en: m.settings_general_language_option_en(),
                zh: m.settings_general_language_option_zh(),
              },
            },
          },
          {
            /** 折叠设置 */
            name: m.settings_general_fold(),
            desc: m.settings_general_fold_desc(),
            control: { key: "foldSettings", type: "toggle", defaultValue: false },
          },
        ],
      },
      {
        /** 排版分组 */
        name: m.settings_typesetting(),
        heading: m.settings_typesetting(),
        type: this.foldSettings ? "page" : "group",
        items: [
          {
            name: m.settings_typesetting_enabled(),
            desc: m.settings_typesetting_enabled_desc(),
            control: { key: "typesettingEnabled", type: "toggle", defaultValue: true },
          },
          {
            /** 缩进 */
            name: m.settings_typesetting_indent(),
            desc: m.settings_typesetting_indent_desc(),
            visible: this.plugin.settings.typesettingEnabled,
            control: {
              key: "typesettingIndent",
              type: "slider",
              min: 0,
              max: 4,
              step: 1,
              defaultValue: 2,
            },
          },
          {
            name: m.settings_typesetting_line_height(),
            desc: m.settings_typesetting_line_height_desc(),
            visible: this.plugin.settings.typesettingEnabled,
            control: {
              key: "typesettingLineHeight",
              type: "slider",
              min: 1,
              max: 3,
              step: 0.25,
              defaultValue: 2,
            },
          },
        ],
      },
      {
        /** 网格线分组 */
        name: m.settings_gridlines(),
        heading: m.settings_gridlines(),
        type: this.foldSettings ? "page" : "group",
        items: [
          {
            name: m.settings_gridlines_enabled(),
            desc: m.settings_gridlines_enabled_desc(),
            control: { key: "gridlinesEnabled", type: "toggle", defaultValue: true },
          },
          {
            name: m.settings_gridlines_size(),
            desc: m.settings_gridlines_size_desc(),
            visible: this.plugin.settings.gridlinesEnabled,
            control: {
              key: "gridlinesSize",
              type: "slider",
              min: 1,
              max: 10,
              step: 1,
              defaultValue: 5,
            },
          },
          {
            name: m.settings_gridlines_ratio(),
            desc: m.settings_gridlines_ratio_desc(),
            visible: this.plugin.settings.gridlinesEnabled,
            control: {
              key: "gridlinesRatio",
              type: "slider",
              min: 1,
              max: 5,
              step: 1,
              defaultValue: 2,
            },
          },
          {
            name: m.settings_gridlines_thick(),
            desc: m.settings_gridlines_thick_desc(),
            visible: this.plugin.settings.gridlinesEnabled,
            control: {
              key: "gridlinesThick",
              type: "slider",
              min: 1,
              max: 5,
              step: 1,
              defaultValue: 1,
            },
          },
          {
            name: m.settings_gridlines_opacity(),
            desc: m.settings_gridlines_opacity_desc(),
            visible: this.plugin.settings.gridlinesEnabled,
            control: {
              key: "gridlinesOpacity",
              type: "slider",
              min: 0,
              max: 100,
              step: 5,
              defaultValue: 75,
            },
          },
        ],
      },
      {
        /** 字数统计分组 */
        name: m.settings_word_count(),
        heading: m.settings_word_count(),
        type: this.foldSettings ? "page" : "group",
        items: [
          {
            name: m.settings_word_count_enabled(),
            desc: m.settings_word_count_enabled_desc(),
            control: { key: "wordCountEnabled", type: "toggle", defaultValue: true },
          },
          {
            name: m.settings_word_count_suffix(),
            desc: m.settings_word_count_suffix_desc(),
            control: { key: "wordCountSuffix", type: "text", defaultValue: "字" },
          },
        ],
      },
      {
        /** 关于页面 */
        name: m.settings_about(),
        heading: m.settings_about(),
        type: this.foldSettings ? "page" : "group",
        items: [
          {
            /** 版本号 */
            name: m.settings_about_version(),
            render: (setting: Setting) => {
              setting.controlEl.createSpan({
                text: this.plugin.manifest.version,
              });
            },
          },
        ],
      },
    ];
  }

  /** 设置项变更时触发：更新运行时状态并刷新设置页 */
  async setControlValue(key: string, value: unknown) {
    await super.setControlValue(key, value);
    switch (key) {
      case "locale":
        // 语言切换：跟随系统或手动选择
        if (value === "app") {
          await setLocale(toLocale(getLanguage()) ?? baseLocale, { reload: false });
        } else {
          await setLocale(toLocale(value) ?? baseLocale, { reload: false });
        }
        break;
      case "foldSettings":
        // 折叠设置：缓存值用于控制分组是否为 page 类型
        this.foldSettings = value;
        break;
      case "typesettingEnabled":
        // 切换排版 CSS class
        window.document.documentElement.toggleClass(
          "novel-typesetting",
          this.plugin.settings.typesettingEnabled,
        );
        break;
      case "typesettingIndent":
        // 更新段落缩进 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-typesetting-indent",
          `${this.plugin.settings.typesettingIndent}rem`,
        );
        break;
      case "typesettingLineHeight":
        // 更新行高 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-typesetting-line-height",
          `${this.plugin.settings.typesettingLineHeight}rem`,
        );
        break;
      case "gridlinesEnabled":
        // 切换网格线 CSS class
        window.document.documentElement.toggleClass(
          "novel-gridlines",
          this.plugin.settings.gridlinesEnabled,
        );
        break;
      case "gridlinesSize":
        // 更新网格单元格大小及间距 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-gridlines-size",
          `${this.plugin.settings.gridlinesSize}px`,
        );
        window.document.documentElement.style.setProperty(
          "--novel-gridlines-space",
          `${this.plugin.settings.gridlinesSize * this.plugin.settings.gridlinesRatio}px`,
        );
        break;
      case "gridlinesRatio":
        // 更新网格间距倍数 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-gridlines-space",
          `${this.plugin.settings.gridlinesSize * this.plugin.settings.gridlinesRatio}px`,
        );
        break;
      case "gridlinesThick":
        // 更新网格线粗细 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-gridlines-thick",
          `${this.plugin.settings.gridlinesThick}px`,
        );
        break;
      case "wordCountEnabled":
        // 切换字数统计 CSS class
        window.document.documentElement.toggleClass(
          "novel-word-count",
          this.plugin.settings.wordCountEnabled,
        );
        break;
      case "wordCountSuffix":
        // 重置字数统计功能
        await resetWordCount(this.plugin);
        break;
      case "gridlinesOpacity":
        // 更新网格线不透明度 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-gridlines-opacity",
          `${this.plugin.settings.gridlinesOpacity}%`,
        );
        break;

      default:
        break;
    }
    this.update();
  }
}

/** 将设置页注册到 Obsidian */
export async function addSettingTab(plugin: ObsidianPlugin) {
  plugin.addSettingTab(new CorePluginSettingTab(plugin));
}
