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
            /** 缩进 */
            name: m.settings_indent(),
            desc: m.settings_indent_desc(),
            control: { key: "indent", type: "slider", min: 0, max: 4, step: 1, defaultValue: 2 },
          },
          {
            name: m.settings_line_height(),
            desc: m.settings_line_height_desc(),
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
