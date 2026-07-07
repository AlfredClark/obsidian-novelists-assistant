import { getLanguage, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { ObsidianPlugin } from "./types";
import { setLocale, toLocale, baseLocale, locales } from "../i18n/paraglide/runtime";
import * as m from "../i18n/paraglide/messages";

/** 插件设置页 */
export class TemplatePluginSettingTab extends PluginSettingTab {
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
            /** 语言下拉框 */
            name: m.settings_language(),
            desc: m.settings_language_desc(),
            render: (setting: Setting) => {
              setting.addDropdown((dropdown) => {
                dropdown.addOption("app", m.settings_language_option_app());
                for (const locale of locales) {
                  const key = `settings_language_option_${locale}` as const;
                  dropdown.addOption(locale, m[key]());
                }
                dropdown.setValue(this.plugin.settings.locale);
                dropdown.onChange(async (value) => {
                  this.plugin.settings.locale = value as "app" | (typeof locales)[number];
                  await this.plugin.saveSettings();
                  if (value === "app") {
                    await setLocale(toLocale(getLanguage()) ?? baseLocale, { reload: false });
                  } else {
                    await setLocale(toLocale(value) ?? baseLocale, { reload: false });
                  }
                  /** 切换语言后刷新设置页 UI */
                  this.update();
                });
              });
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
}

/** 将设置页注册到 Obsidian */
export async function addSettingTab(plugin: ObsidianPlugin) {
  plugin.addSettingTab(new TemplatePluginSettingTab(plugin));
}
