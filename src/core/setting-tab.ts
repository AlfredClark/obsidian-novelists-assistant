import { PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { ObsidianPlugin } from "./types";
import { HTMLComponent, ObsidianSvelteComponent } from "../components/types";
import LocaleSettings from "../components/settings/LocaleSettings.svelte";
import { locales, setLocale, toLocale, baseLocale } from "../i18n/paraglide/runtime";
import * as m from "../i18n/paraglide/messages";
import { detachSidebar } from "./sidebar";
import { addCommands, removeCommands } from "./commands";

export class TemplatePluginSettingTab extends PluginSettingTab {
  plugin: ObsidianPlugin;
  components: ObsidianSvelteComponent[] | undefined;

  constructor(plugin: ObsidianPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
    this.components = [];
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    this.components = [];

    return [
      {
        heading: m.settings_general(),
        type: "group",
        items: [
          {
            name: m.settings_language(),
            desc: m.settings_language_desc(),
            render: (setting: Setting) => {
              const comp = new ObsidianSvelteComponent(setting.controlEl, LocaleSettings, {
                locale: this.plugin.settings.locale,
                onLocaleChange: async (locale: string) => {
                  this.plugin.settings.locale = locale as "app" | (typeof locales)[number];
                  await setLocale(toLocale(locale) ?? baseLocale, { reload: false });
                  await this.plugin.saveData(this.plugin.settings);
                  await detachSidebar(this.plugin);
                  await removeCommands(this.plugin);
                  await addCommands(this.plugin);
                  this.update();
                },
              });
              this.components?.push(comp);
              return () => {
                comp.destroy();
              };
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
              new HTMLComponent(setting.controlEl, "span", {
                text: this.plugin.manifest.version,
              });
            },
          },
        ],
      },
    ];
  }

  hide(): void {
    this.components?.forEach((component) => {
      component.destroy();
    });
    this.components = [];
  }
}

export async function addSettingTab(plugin: ObsidianPlugin) {
  plugin.addSettingTab(new TemplatePluginSettingTab(plugin));
}
