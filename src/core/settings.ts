import { getLanguage, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { ObsidianPlugin } from "./types";
import * as m from "../i18n/paraglide/messages";
import { setLocale, toLocale, baseLocale } from "../i18n/paraglide/runtime";
import { resetWordCount } from "../features/wordcount";
import { applyLoreStyles } from "../features/lore";

/** 插件设置页 */
export class CorePluginSettingTab extends PluginSettingTab {
  plugin: ObsidianPlugin;

  constructor(plugin: ObsidianPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  /** 获得设定库需要使用的dropdown数据 */
  getLorePaths(): Record<string, string> {
    let paths: Record<string, string> = { "": m.settings_lore_path_none() };
    this.plugin.app.vault.getAllFolders().forEach((folder) => {
      paths[folder.path] = folder.path;
    });
    return paths;
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
        name: m.settings_typeset(),
        heading: m.settings_typeset(),
        type: this.plugin.settings.foldSettings ? "page" : "group",
        items: [
          {
            name: m.settings_typeset_enabled(),
            desc: m.settings_typeset_enabled_desc(),
            control: { key: "typesetEnabled", type: "toggle", defaultValue: true },
          },
          {
            /** 缩进 */
            name: m.settings_typeset_indent(),
            desc: m.settings_typeset_indent_desc(),
            visible: this.plugin.settings.typesetEnabled,
            control: {
              key: "typesetIndent",
              type: "slider",
              min: 0,
              max: 4,
              step: 1,
              defaultValue: 2,
            },
          },
          {
            name: m.settings_typeset_line_height(),
            desc: m.settings_typeset_line_height_desc(),
            visible: this.plugin.settings.typesetEnabled,
            control: {
              key: "typesetLineHeight",
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
        type: this.plugin.settings.foldSettings ? "page" : "group",
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
        /** 设定库分组 */
        name: m.settings_lore(),
        heading: m.settings_lore(),
        type: this.plugin.settings.foldSettings ? "page" : "group",
        items: [
          {
            name: m.settings_lore_path(),
            desc: m.settings_lore_path_desc(),
            control: {
              key: "lorePath",
              type: "dropdown",
              options: this.getLorePaths(),
              defaultValue: "",
            },
          },
          {
            name: m.settings_lore_quick_create(),
            desc: m.settings_lore_quick_create_desc(),
            visible: this.plugin.settings.lorePath !== "",
            control: { key: "loreQuickCreateEnabled", type: "toggle", defaultValue: true },
          },
          {
            name: m.settings_lore_styles_disabled(),
            desc: m.settings_lore_styles_disabled_desc(),
            visible: this.plugin.settings.lorePath !== "",
            control: { key: "loreStylesDisabled", type: "toggle", defaultValue: true },
          },
          {
            name: m.settings_lore_suggest_prefix(),
            desc: m.settings_lore_suggest_prefix_desc(),
            visible: this.plugin.settings.lorePath !== "",
            control: { key: "loreSuggestPrefix", type: "text", defaultValue: "//" },
          },
        ],
      },
      {
        /** 字数统计分组 */
        name: m.settings_wordcount(),
        heading: m.settings_wordcount(),
        type: this.plugin.settings.foldSettings ? "page" : "group",
        items: [
          {
            name: m.settings_wordcount_enabled(),
            desc: m.settings_wordcount_enabled_desc(),
            control: { key: "wordCountEnabled", type: "toggle", defaultValue: true },
          },
          {
            name: m.settings_wordcount_suffix(),
            desc: m.settings_wordcount_suffix_desc(),
            control: { key: "wordCountSuffix", type: "text", defaultValue: "字" },
          },
        ],
      },
      {
        /** 编号分组 */
        name: m.settings_numbering(),
        heading: m.settings_numbering(),
        type: this.plugin.settings.foldSettings ? "page" : "group",
        items: [
          {
            name: m.settings_numbering_format(),
            desc: m.settings_numbering_format_desc(),
            control: { key: "numberingFormat", type: "text", defaultValue: "第{}章" },
          },
          {
            name: m.settings_numbering_type(),
            desc: m.settings_numbering_type_desc(),
            control: {
              key: "numberingType",
              type: "dropdown",
              defaultValue: "number",
              options: {
                number: m.settings_numbering_type_number(),
                cns: m.settings_numbering_type_cns(),
                cnb: m.settings_numbering_type_cnb(),
              },
            },
          },
          {
            name: m.settings_numbering_fill(),
            desc: m.settings_numbering_fill_desc(),
            control: {
              key: "numberingFill",
              type: "slider",
              min: 0,
              max: 5,
              step: 1,
              defaultValue: 0,
            },
          },
        ],
      },
      {
        /** 预览排版分组 */
        name: m.settings_preview(),
        heading: m.settings_preview(),
        type: this.plugin.settings.foldSettings ? "page" : "group",
        items: [
          {
            name: m.settings_preview_enabled(),
            desc: m.settings_preview_enabled_desc(),
            control: { key: "previewEnabled", type: "toggle", defaultValue: false },
          },
          {
            name: m.settings_preview_indent(),
            desc: m.settings_preview_indent_desc(),
            visible: this.plugin.settings.previewEnabled,
            control: {
              key: "previewIndent",
              type: "slider",
              min: 0,
              max: 4,
              step: 1,
              defaultValue: 2,
            },
          },
          {
            name: m.settings_preview_line_height(),
            desc: m.settings_preview_line_height_desc(),
            visible: this.plugin.settings.previewEnabled,
            control: {
              key: "previewLineHeight",
              type: "slider",
              min: 1,
              max: 3,
              step: 0.25,
              defaultValue: 1.5,
            },
          },
          {
            name: m.settings_preview_spacing(),
            desc: m.settings_preview_spacing_desc(),
            visible: this.plugin.settings.previewEnabled,
            control: {
              key: "previewSpacing",
              type: "slider",
              min: 0,
              max: 4,
              step: 0.25,
              defaultValue: 1,
            },
          },
          {
            name: m.settings_preview_links_enabled(),
            desc: m.settings_preview_links_enabled_desc(),
            visible: this.plugin.settings.previewEnabled,
            control: { key: "previewLinksEnabled", type: "toggle", defaultValue: true },
          },
        ],
      },
      {
        /** 关于页面 */
        name: m.settings_about(),
        heading: m.settings_about(),
        type: this.plugin.settings.foldSettings ? "page" : "group",
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
        break;
      case "typesetEnabled":
        // 切换排版 CSS class
        window.document.documentElement.toggleClass(
          "novel-typeset",
          this.plugin.settings.typesetEnabled,
        );
        break;
      case "typesetIndent":
        // 更新段落缩进 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-typeset-indent",
          `${this.plugin.settings.typesetIndent}rem`,
        );
        break;
      case "typesetLineHeight":
        // 更新行高 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-typeset-line-height",
          `${this.plugin.settings.typesetLineHeight}rem`,
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
      case "gridlinesOpacity":
        // 更新网格线不透明度 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-gridlines-opacity",
          `${this.plugin.settings.gridlinesOpacity}%`,
        );
        break;
      case "lorePath":
        applyLoreStyles(this.plugin, this.plugin.app.workspace.getLeaf());
        break;
      case "loreQuickCreateEnabled":
        break;
      case "loreStylesDisabled":
        applyLoreStyles(this.plugin, this.plugin.app.workspace.getLeaf());
        break;
      case "loreSuggestPrefix":
        break;
      case "wordCountEnabled":
        // 切换字数统计 CSS class
        window.document.documentElement.toggleClass(
          "novel-wordcount",
          this.plugin.settings.wordCountEnabled,
        );
        break;
      case "wordCountSuffix":
        // 重置字数统计功能
        await resetWordCount(this.plugin);
        break;
      case "previewEnabled":
        // 切换预览排版 CSS class
        window.document.documentElement.toggleClass(
          "novel-preview",
          this.plugin.settings.previewEnabled,
        );
        break;
      case "previewIndent":
        // 更新预览缩进 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-preview-indent",
          `${this.plugin.settings.previewIndent}rem`,
        );
        break;
      case "previewLineHeight":
        // 更新预览行高 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-preview-line-height",
          `${this.plugin.settings.previewLineHeight}rem`,
        );
        break;
      case "previewSpacing":
        // 更新预览段落间距 CSS 变量
        window.document.documentElement.style.setProperty(
          "--novel-preview-spacing",
          `${this.plugin.settings.previewSpacing}rem`,
        );
        break;
      case "previewLinksEnabled":
        break;
      case "numberingFormat":
        break;
      case "numberingType":
        break;
      case "numberingFill":
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
