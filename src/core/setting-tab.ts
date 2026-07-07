import { getLanguage, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { ObsidianPlugin } from "./types";
import * as m from "../i18n/paraglide/messages";
import { setLocale, toLocale, baseLocale } from "../i18n/paraglide/runtime";

/** 插件设置页 */
export class CorePluginSettingTab extends PluginSettingTab {
  plugin: ObsidianPlugin;

  constructor(plugin: ObsidianPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
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
            name: m.settings_language(),
            desc: m.settings_language_desc(),
            control: {
              key: "locale",
              type: "dropdown",
              defaultValue: "app",
              options: {
                app: m.settings_language_option_app(),
                en: m.settings_language_option_en(),
                zh: m.settings_language_option_zh(),
              },
            },
          },
        ],
      },
      {
        /** 排版分组 */
        heading: m.settings_typesetting(),
        type: "group",
        items: [
          {
            name: m.settings_typesetting_enabled(),
            desc: m.settings_typesetting_enabled_desc(),
            control: { key: "typesettingEnabled", type: "toggle", defaultValue: true },
          },
          {
            /** 缩进 */
            name: m.settings_indent(),
            desc: m.settings_indent_desc(),
            visible: this.plugin.settings.typesettingEnabled,
            control: { key: "indent", type: "slider", min: 0, max: 4, step: 1, defaultValue: 2 },
          },
          {
            name: m.settings_line_height(),
            desc: m.settings_line_height_desc(),
            visible: this.plugin.settings.typesettingEnabled,
            control: {
              key: "lineHeight",
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
        heading: m.settings_gridlines(),
        type: "group",
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
              defaultValue: 50,
            },
          },
        ],
      },
      {
        /** 关于页面 */
        name: m.settings_about(),
        type: "page",
        items: [
          {
            /** 版本号 */
            name: m.settings_version(),
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

  async setControlValue(key: string, value: unknown) {
    await super.setControlValue(key, value);
    switch (key) {
      case "locale":
        if (value === "app") {
          await setLocale(toLocale(getLanguage()) ?? baseLocale, { reload: false });
        } else {
          await setLocale(toLocale(value) ?? baseLocale, { reload: false });
        }
        break;
      case "typesettingEnabled":
        window.document.documentElement.toggleClass(
          "novel-typesetting",
          this.plugin.settings.typesettingEnabled,
        );
        break;
      case "indent":
        window.document.documentElement.style.setProperty(
          "--novel-typesetting-indent",
          `${this.plugin.settings.indent}rem`,
        );
        break;
      case "lineHeight":
        window.document.documentElement.style.setProperty(
          "--novel-typesetting-line-height",
          `${this.plugin.settings.lineHeight}rem`,
        );
        break;
      case "gridlinesEnabled":
        window.document.documentElement.toggleClass(
          "novel-gridlines",
          this.plugin.settings.gridlinesEnabled,
        );
        break;
      case "gridlinesSize":
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
        window.document.documentElement.style.setProperty(
          "--novel-gridlines-space",
          `${this.plugin.settings.gridlinesSize * this.plugin.settings.gridlinesRatio}px`,
        );
        break;
      case "gridlinesThick":
        window.document.documentElement.style.setProperty(
          "--novel-gridlines-thick",
          `${this.plugin.settings.gridlinesThick}px`,
        );
        break;
      case "gridlinesOpacity":
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
