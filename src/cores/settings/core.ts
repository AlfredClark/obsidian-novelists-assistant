import { Notice, PluginSettingTab } from "obsidian";
import type { SettingDefinitionItem, SettingGroupItem } from "obsidian";
import type { NovelistsAssistantSettings } from "./types";
import { createDefaultStructure, getDefaultDirectories } from "../../features/structure";
import { t } from "../i18n";
import type NovelistsAssistantPlugin from "../../main";

/** 设置默认值。data.json 缺失字段时（如旧版本升级）以此为兜底合并 */
export const DEFAULT_SETTINGS: NovelistsAssistantSettings = {
  collapsible: false,
  language: "system",
  loreDir: "",
  novelDir: "",
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

  // 创建过程进行中标记：防止连点并发创建导致 createFolder 竞态误报失败
  private creating = false;

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
      // 开启折叠行为时目录设置收进可导航子页，否则内联展开
      ...(this.plugin.settings.collapsible
        ? [
            {
              type: "page" as const,
              name: t("settings.directory"),
              desc: t("settings.directoryDesc"),
              items: this.getDirectoryItems(),
            },
          ]
        : [
            {
              type: "group" as const,
              name: t("settings.directory"),
              heading: t("settings.directory"),
              items: this.getDirectoryItems(),
            },
          ]),
    ];
  }

  /**
   * 目录设置条目：两个目录选择控件与一键创建入口。
   * group 与 page 两种容器共用，仅容器形态由 collapsible 决定。
   */
  private getDirectoryItems(): SettingGroupItem<keyof NovelistsAssistantSettings>[] {
    const [lore, novel] = getDefaultDirectories();
    return [
      {
        name: t("settings.loreDir"),
        desc: t("settings.loreDirDesc"),
        control: {
          type: "folder",
          key: "loreDir",
          defaultValue: "",
          placeholder: t("settings.directoryPlaceholder"),
        },
      },
      {
        name: t("settings.novelDir"),
        desc: t("settings.novelDirDesc"),
        control: {
          type: "folder",
          key: "novelDir",
          defaultValue: "",
          placeholder: t("settings.directoryPlaceholder"),
        },
      },
      {
        name: t("settings.createStructure"),
        desc: t("settings.createStructureDesc", {
          lore: lore?.name ?? "",
          novel: novel?.name ?? "",
        }),
        action: () => {
          void this.handleCreateStructure();
        },
      },
    ];
  }

  /**
   * 一键创建默认目录结构并按结果反馈；完成后重渲染使目录控件显示新指向。
   * 失败提示保留更长时间以便阅读，成功提示即时消失。
   */
  private async handleCreateStructure(): Promise<void> {
    if (this.creating) return;
    this.creating = true;
    try {
      const result = await createDefaultStructure(this.plugin);
      if (result.created.length > 0) {
        new Notice(t("structure.created", { dirs: result.created.join(", ") }));
      }
      if (result.failed.length > 0) {
        new Notice(t("structure.failed", { dirs: result.failed.join(", ") }), 5000);
      }
      if (result.created.length === 0 && result.failed.length === 0) {
        new Notice(t("structure.noChange"));
      }
      this.update();
    } finally {
      this.creating = false;
    }
  }

  setControlValue(key: string, value: unknown) {
    void super.setControlValue(key, value);
    void this.update();
  }
}
