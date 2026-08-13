import { Notice, PluginSettingTab, TextComponent } from "obsidian";
import type { SettingDefinitionItem, SettingGroupItem } from "obsidian";
import type { NovelistsAssistantSettings } from "./types";
import { createDefaultStructure, getDefaultDirectories } from "../../features/structure";
import { refreshTypeset, rerenderPreviewLeaves } from "../../features/typeset";
import { refreshGridlines } from "../../features/gridlines";
import { convertChapters } from "../../features/quick-menu";
import { refreshFolderCounts, refreshStatusBar, refreshWordCount, refreshWordCountTexts } from "../../features/word-count";
import { t } from "../i18n";
import type NovelistsAssistantPlugin from "../../main";

/** 影响排版效果的设置键，变更时须刷新排版类 */
const TYPESET_SETTING_KEYS: readonly string[] = [
  "novelDir",
  "novelTypeset",
  "novelPreviewTypeset",
  "novelIndent",
  "novelLineHeight",
  "novelPreviewIndent",
  "novelPreviewLineHeight",
];

/** 影响网格线效果的设置键，变更时须刷新网格线类 */
const GRIDLINES_SETTING_KEYS: readonly string[] = [
  "novelDir",
  "novelGridlines",
  "novelGridlinesSize",
  "novelGridlinesSpace",
  "novelGridlinesThick",
  "novelGridlinesOpacity",
];

/** 需要重渲染设置页的设置键：文案联动、分组结构与开关联动的可见性变化；其余控件自带显示，避免滑块拖动触发全页重建 */
const UPDATE_SETTING_KEYS: readonly string[] = [
  "language",
  "collapsible",
  "novelTypeset",
  "novelPreviewTypeset",
  "novelGridlines",
  "wordCount",
  "folderCount",
];

/** 影响字数统计效果的设置键，变更时须刷新文件列表装饰 */
const WORD_COUNT_SETTING_KEYS: readonly string[] = ["wordCount"];

/** 影响文件夹统计效果的设置键，变更时须刷新文件夹装饰 */
const FOLDER_COUNT_SETTING_KEYS: readonly string[] = [
  "folderCount",
  "folderCountGroupUnit",
  "folderCountLoreUnit",
  "folderCountChapterUnit",
  "loreDir",
  "novelDir",
];

/** 设置默认值。data.json 缺失字段时（如旧版本升级）以此为兜底合并 */
export const DEFAULT_SETTINGS: NovelistsAssistantSettings = {
  collapsible: false,
  language: "system",
  loreDir: "",
  novelDir: "",
  novelIndent: 2,
  novelLineHeight: 1.75,
  novelTypeset: true,
  novelPreviewTypeset: true,
  novelPreviewIndent: 2,
  novelPreviewLineHeight: 1.75,
  novelGridlines: false,
  novelGridlinesSize: 5,
  novelGridlinesSpace: 5,
  novelGridlinesThick: 1,
  novelGridlinesOpacity: 75,
  chapterFormat: "第 # 章",
  chapterNumberStyle: "digit",
  wordCount: true,
  wordCountUnit: "字",
  folderCount: true,
  folderCountGroupUnit: "组",
  folderCountLoreUnit: "条",
  folderCountChapterUnit: "章",
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
      // 可折叠分组：collapsible 开启时收进可导航子页，否则内联展开
      this.buildCollapsibleSection(t("settings.directory"), t("settings.directoryDesc"), this.getDirectoryItems()),
      this.buildCollapsibleSection(t("settings.typeset"), t("settings.typesetDesc"), this.getTypesetItems()),
      this.buildCollapsibleSection(t("settings.gridlines"), t("settings.gridlinesDesc"), this.getGridlinesItems()),
      this.buildCollapsibleSection(t("settings.quickMenu"), t("settings.quickMenuDesc"), this.getQuickMenuItems()),
      this.buildCollapsibleSection(t("settings.wordCount"), t("settings.wordCountDesc"), this.getWordCountItems()),
    ];
  }

  /**
   * 可折叠分组：collapsible 开启时渲染为可导航子页（page），否则内联展开（group）。
   * 两种容器共用条目，仅容器形态由 collapsible 决定。
   */
  private buildCollapsibleSection<K extends string>(
    name: string,
    desc: string | undefined,
    items: SettingGroupItem<K>[],
  ): SettingDefinitionItem<K> {
    return this.plugin.settings.collapsible
      ? { type: "page", name, desc, items }
      : { type: "group", name, heading: name, items };
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
   * 排版设置条目：源码/阅读视图各自的排版开关与缩进、行高参数。
   * 与其他可折叠分组共用条目结构，容器形态由 collapsible 决定。
   */
  private getTypesetItems(): SettingGroupItem<keyof NovelistsAssistantSettings>[] {
    return [
      {
        name: t("settings.novelTypeset"),
        desc: t("settings.novelTypesetDesc"),
        control: {
          type: "toggle",
          key: "novelTypeset",
          defaultValue: true,
        },
      },
      {
        name: t("settings.novelIndent"),
        desc: t("settings.novelIndentDesc"),
        visible: () => this.plugin.settings.novelTypeset,
        control: {
          type: "slider",
          key: "novelIndent",
          defaultValue: 2,
          min: 0,
          max: 4,
          step: 1,
        },
      },
      {
        name: t("settings.novelLineHeight"),
        desc: t("settings.novelLineHeightDesc"),
        visible: () => this.plugin.settings.novelTypeset,
        control: {
          type: "slider",
          key: "novelLineHeight",
          defaultValue: 1.75,
          min: 1,
          max: 2.5,
          step: 0.25,
        },
      },
      {
        name: t("settings.novelPreviewTypeset"),
        desc: t("settings.novelPreviewTypesetDesc"),
        control: {
          type: "toggle",
          key: "novelPreviewTypeset",
          defaultValue: true,
        },
      },
      {
        name: t("settings.novelPreviewIndent"),
        desc: t("settings.novelPreviewIndentDesc"),
        visible: () => this.plugin.settings.novelPreviewTypeset,
        control: {
          type: "slider",
          key: "novelPreviewIndent",
          defaultValue: 2,
          min: 0,
          max: 4,
          step: 1,
        },
      },
      {
        name: t("settings.novelPreviewLineHeight"),
        desc: t("settings.novelPreviewLineHeightDesc"),
        visible: () => this.plugin.settings.novelPreviewTypeset,
        control: {
          type: "slider",
          key: "novelPreviewLineHeight",
          defaultValue: 1.75,
          min: 1,
          max: 2.5,
          step: 0.25,
        },
      },
    ];
  }

  /**
   * 网格线设置条目：开关与 4 个样式参数（虚线长度/间隔/厚度/不透明度）。
   * 与其他可折叠分组共用条目结构，容器形态由 collapsible 决定。
   */
  private getGridlinesItems(): SettingGroupItem<keyof NovelistsAssistantSettings>[] {
    return [
      {
        name: t("settings.novelGridlines"),
        desc: t("settings.novelGridlinesDesc"),
        control: {
          type: "toggle",
          key: "novelGridlines",
          defaultValue: false,
        },
      },
      {
        name: t("settings.gridlinesSize"),
        desc: t("settings.gridlinesSizeDesc"),
        visible: () => this.plugin.settings.novelGridlines,
        control: {
          type: "slider",
          key: "novelGridlinesSize",
          defaultValue: 5,
          min: 0,
          max: 10,
          step: 1,
        },
      },
      {
        name: t("settings.gridlinesSpace"),
        desc: t("settings.gridlinesSpaceDesc"),
        visible: () => this.plugin.settings.novelGridlines,
        control: {
          type: "slider",
          key: "novelGridlinesSpace",
          defaultValue: 5,
          min: 0,
          max: 10,
          step: 1,
        },
      },
      {
        name: t("settings.gridlinesThick"),
        desc: t("settings.gridlinesThickDesc"),
        visible: () => this.plugin.settings.novelGridlines,
        control: {
          type: "slider",
          key: "novelGridlinesThick",
          defaultValue: 1,
          min: 0,
          max: 5,
          step: 0.5,
        },
      },
      {
        name: t("settings.gridlinesOpacity"),
        desc: t("settings.gridlinesOpacityDesc"),
        visible: () => this.plugin.settings.novelGridlines,
        control: {
          type: "slider",
          key: "novelGridlinesOpacity",
          defaultValue: 75,
          min: 0,
          max: 100,
          step: 5,
        },
      },
    ];
  }

  /**
   * 快捷菜单设置条目：自动编号章节格式。
   * 与其他可折叠分组共用条目结构，容器形态由 collapsible 决定。
   */
  private getQuickMenuItems(): SettingGroupItem<keyof NovelistsAssistantSettings>[] {
    return [
      {
        name: t("settings.chapterFormat"),
        desc: t("settings.chapterFormatDesc"),
        control: {
          type: "text",
          key: "chapterFormat",
          defaultValue: "第 # 章",
        },
      },
      {
        name: t("settings.chapterNumberStyle"),
        desc: t("settings.chapterNumberStyleDesc"),
        control: {
          type: "dropdown",
          key: "chapterNumberStyle",
          defaultValue: "digit",
          options: {
            digit: t("settings.numberStyleOptions.digit"),
            chineseLower: t("settings.numberStyleOptions.chineseLower"),
            chineseUpper: t("settings.numberStyleOptions.chineseUpper"),
          },
        },
      },
      {
        name: t("settings.chapterConvert"),
        desc: t("settings.chapterConvertDesc"),
        render: (setting) => {
          // 输入框为临时值不持久化；按钮触发章节转换（提升变量供按钮回调读取）
          let input: TextComponent | null = null;
          setting.addText((text) => {
            text.setPlaceholder(t("settings.chapterConvertPlaceholder"));
            input = text;
          });
          setting.addButton((button) =>
            button.setButtonText(t("settings.chapterConvertAction")).onClick(() => {
              void this.handleChapterConvert(input?.getValue() ?? "");
            }),
          );
        },
      },
    ];
  }

  /**
   * 字数统计设置条目：文件字数开关与单位、文件夹统计开关与三组单位。
   * 与其他可折叠分组共用条目结构，容器形态由 collapsible 决定。
   */
  private getWordCountItems(): SettingGroupItem<keyof NovelistsAssistantSettings>[] {
    return [
      {
        name: t("settings.wordCountToggle"),
        desc: t("settings.wordCountDesc"),
        control: {
          type: "toggle",
          key: "wordCount",
          defaultValue: true,
        },
      },
      {
        name: t("settings.wordCountUnit"),
        desc: t("settings.wordCountUnitDesc"),
        visible: () => this.plugin.settings.wordCount,
        control: {
          type: "text",
          key: "wordCountUnit",
          defaultValue: "字",
          placeholder: t("settings.wordCountUnitPlaceholder"),
        },
      },
      {
        name: t("settings.folderCountToggle"),
        desc: t("settings.folderCountDesc"),
        control: {
          type: "toggle",
          key: "folderCount",
          defaultValue: true,
        },
      },
      {
        name: t("settings.folderCountGroupUnit"),
        desc: t("settings.folderCountGroupUnitDesc"),
        visible: () => this.plugin.settings.folderCount,
        control: {
          type: "text",
          key: "folderCountGroupUnit",
          defaultValue: "组",
        },
      },
      {
        name: t("settings.folderCountLoreUnit"),
        desc: t("settings.folderCountLoreUnitDesc"),
        visible: () => this.plugin.settings.folderCount,
        control: {
          type: "text",
          key: "folderCountLoreUnit",
          defaultValue: "条",
        },
      },
      {
        name: t("settings.folderCountChapterUnit"),
        desc: t("settings.folderCountChapterUnitDesc"),
        visible: () => this.plugin.settings.folderCount,
        control: {
          type: "text",
          key: "folderCountChapterUnit",
          defaultValue: "章",
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
      refreshTypeset(this.plugin);
      refreshGridlines(this.plugin);
    } finally {
      this.creating = false;
    }
  }

  /**
   * 章节转换：源格式必须含 # 编号占位，否则提示无效；转换完成后按统计反馈。
   */
  private async handleChapterConvert(sourceFormat: string): Promise<void> {
    if (!sourceFormat.includes("#")) {
      new Notice(t("settings.chapterConvertInvalid"));
      return;
    }
    const { converted, skipped } = await convertChapters(this.plugin, sourceFormat);
    new Notice(t("quickMenu.convertResult", { converted, skipped }));
  }

  setControlValue(key: string, value: unknown) {
    // 章节格式必须含 # 编号占位，否则拒绝写入并提示（防无编号命名与死循环）
    if (key === "chapterFormat" && typeof value === "string" && !value.includes("#")) {
      new Notice(t("settings.chapterFormatInvalid"));
      void this.update();
      return;
    }
    // 字数单位先 trim 再写入，防手输首尾空格进入展示文案
    if (key === "wordCountUnit" && typeof value === "string") {
      value = value.trim();
    }
    // 文件夹统计三类单位同样 trim
    if (
      (key === "folderCountGroupUnit" || key === "folderCountLoreUnit" || key === "folderCountChapterUnit") &&
      typeof value === "string"
    ) {
      value = value.trim();
    }
    void super.setControlValue(key, value);
    // 网格线渲染依赖排版类（CSS 叠加类门控）：排版关闭时拒绝开启网格线并提示
    if (key === "novelGridlines" && value === true && !this.plugin.settings.novelTypeset) {
      new Notice(t("settings.gridlinesRequiresTypeset"));
    }
    // 关闭正文排版时联动关闭已开启的网格线并提示，避免开关处于无效果的困惑状态
    if (key === "novelTypeset" && value === false && this.plugin.settings.novelGridlines) {
      new Notice(t("settings.gridlinesRequiresTypeset"));
    }
    // 仅文案联动与分组结构变化的键需要重渲染，其余控件自带显示（滑块拖动不重建页面）
    if (UPDATE_SETTING_KEYS.includes(key)) {
      void this.update();
    }
    // 仅排版相关设置变更时刷新排版类，避免语言/折叠等无关设置触发无谓的 DOM 遍历
    if (TYPESET_SETTING_KEYS.includes(key)) {
      refreshTypeset(this.plugin);
      // 阅读视图段落类由渲染管线维护：开关/目录变更须全量重渲染已打开的预览视图即时生效；
      // 滑块变更仅改 CSS 变量（容器类即时生效），无需重建
      if (key === "novelPreviewTypeset" || key === "novelDir") {
        rerenderPreviewLeaves(this.plugin);
      }
    }
    // 仅网格线相关设置变更时刷新网格线类
    if (GRIDLINES_SETTING_KEYS.includes(key)) {
      refreshGridlines(this.plugin);
    }
    // 字数开关变更：刷新文件列表装饰、状态栏显隐，并联动文件夹刷新（正文目录字部分显隐）
    if (WORD_COUNT_SETTING_KEYS.includes(key)) {
      refreshWordCount(this.plugin);
      refreshFolderCounts(this.plugin);
      refreshStatusBar(this.plugin);
    }
    // 单位变更仅影响文案：重设已装饰标题的统计文本，装饰增删由 wordCount 门控处理
    if (key === "wordCountUnit") {
      refreshWordCountTexts(this.plugin);
      // 正文目录总字数的「字」部分与状态栏文案同样消费该单位
      refreshFolderCounts(this.plugin);
      refreshStatusBar(this.plugin);
    }
    // 仅文件夹统计相关设置变更时刷新文件夹装饰（角色/开关/单位/目录）
    if (FOLDER_COUNT_SETTING_KEYS.includes(key)) {
      refreshFolderCounts(this.plugin);
    }
  }
}
