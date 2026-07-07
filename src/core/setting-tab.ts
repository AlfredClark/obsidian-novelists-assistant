import { getLanguage, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { ObsidianPlugin } from "./types";
import { setLocale, toLocale, baseLocale, locales } from "../i18n/paraglide/runtime";
import * as m from "../i18n/paraglide/messages";

export class TemplatePluginSettingTab extends PluginSettingTab {
  plugin: ObsidianPlugin;

  constructor(plugin: ObsidianPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        heading: m.settings_general(),
        type: "group",
        items: [
          {
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
                  await this.plugin.saveData(this.plugin.settings);
                  if (value === "app") {
                    await setLocale(toLocale(getLanguage()) ?? baseLocale, { reload: false });
                  } else {
                    await setLocale(toLocale(value) ?? baseLocale, { reload: false });
                  }
                  this.update();
                });
              });
            },
          },
        ],
      },
      {
        name: m.settings_about(),
        type: "page",
        items: [
          {
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

export async function addSettingTab(plugin: ObsidianPlugin) {
  plugin.addSettingTab(new TemplatePluginSettingTab(plugin));
}
