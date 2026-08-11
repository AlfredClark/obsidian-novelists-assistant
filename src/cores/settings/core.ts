import { PluginSettingTab } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type { NovelistsAssistantSettings } from "./types";
import { t } from "../i18n";
import type NovelistsAssistantPlugin from "../../main";

/** 设置默认值。data.json 缺失字段时（如旧版本升级）以此为兜底合并 */
export const DEFAULT_SETTINGS: NovelistsAssistantSettings = {
  collapsible: false,
  language: "system",
};

/**
 * 初始化设置模块：加载持久化设置并注册设置页。
 * 必须在业务功能初始化之前调用，后者依赖 settings 已就绪。
 * @param plugin 插件实例；type-only 导入具体类，运行时无循环
 */
export async function initSettings(plugin: NovelistsAssistantPlugin): Promise<void> {
  plugin.settings = await loadSettings(plugin);
  plugin.addSettingTab(new SettingsTab(plugin));
}

/**
 * 从 data.json 读取设置并与默认值浅合并。
 * 用展开运算而非 Object.assign，避免共享默认对象被意外修改。
 * @param plugin 插件实例
 * @returns 合并后的完整设置对象
 */
export async function loadSettings(plugin: NovelistsAssistantPlugin): Promise<NovelistsAssistantSettings> {
  const data = (await plugin.loadData()) as Partial<NovelistsAssistantSettings> | null;
  return { ...DEFAULT_SETTINGS, ...data };
}

/**
 * 设置页。使用 1.13.0+ 声明式 API（getSettingDefinitions），不用已废弃的 display()：
 * 读写 plugin.settings 与持久化由 Obsidian 自动完成，无需手写 onChange。
 */
export class SettingsTab extends PluginSettingTab {
  plugin: NovelistsAssistantPlugin;

  constructor(plugin: NovelistsAssistantPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem<keyof NovelistsAssistantSettings>[] {
    return [
      {
        type: "group",
        name: t("settings.general"),
        heading: t("settings.general"),
        items: [
          {
            name: t("settings.language"),
            desc: t("settings.languageDesc"),
            control: {
              type: "dropdown",
              key: "language",
              defaultValue: "system",
              options: {
                system: t("settings.languageOptions.system"),
                en: t("settings.languageOptions.en"),
                zh: t("settings.languageOptions.zh"),
                "zh-TW": t("settings.languageOptions.zh-TW"),
              },
            },
          },
          {
            name: t("settings.collapsible"),
            desc: t("settings.collapsibleDesc"),
            control: {
              type: "toggle",
              key: "collapsible",
              defaultValue: false,
            },
          },
        ],
      },
    ];
  }

  setControlValue(key: string, value: unknown) {
    void super.setControlValue(key, value);
    void this.update();
  }
}
