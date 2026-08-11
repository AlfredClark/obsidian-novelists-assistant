import type { TranslationResource } from "../types";

/** 简体中文资源。标注 TranslationResource 强制与英文同构，键缺失或多余都会编译报错 */
export const zh: TranslationResource = {
  settings: {
    collapsible: "折叠分组",
    collapsibleDesc: "是否折叠设置分组",
    createStructure: "创建默认目录结构",
    createStructureDesc: "在库根目录创建 {lore} 与 {novel} 文件夹，并自动指向上述设置",
    directory: "目录设置",
    directoryDesc: "配置小说设定与正文的存放目录",
    directoryPlaceholder: "未选择",
    general: "通用设置",
    language: "插件语言",
    languageDesc: "设置插件语言",
    languageOptions: {
      system: "跟随系统",
      en: "英文",
      zh: "简体中文",
      "zh-TW": "繁体中文",
    },
    loreDir: "设定目录",
    loreDirDesc: "存放小说设定笔记的目录",
    novelDir: "正文目录",
    novelDirDesc: "存放小说正文的目录",
  },
  structure: {
    created: "已创建文件夹：{dirs}",
    defaultLore: "设定",
    defaultNovel: "正文",
    failed: "创建文件夹失败：{dirs}",
    noChange: "默认目录结构已就绪",
  },
};

/** 繁体中文资源。标注 TranslationResource 强制与英文同构，键缺失或多余都会编译报错 */
export const zhTW: TranslationResource = {
  settings: {
    collapsible: "摺疊分組",
    collapsibleDesc: "是否摺疊設定分組",
    createStructure: "建立預設目錄結構",
    createStructureDesc: "在庫根目錄建立 {lore} 與 {novel} 資料夾，並自動指向上述設定",
    directory: "目錄設定",
    directoryDesc: "設定小說設定與正文的存放目錄",
    directoryPlaceholder: "未選擇",
    general: "通用設定",
    language: "外掛程式語言",
    languageDesc: "設定外掛程式語言",
    languageOptions: {
      system: "跟隨系統",
      en: "英文",
      zh: "簡體中文",
      "zh-TW": "繁體中文",
    },
    loreDir: "設定目錄",
    loreDirDesc: "存放小說設定筆記的目錄",
    novelDir: "正文目錄",
    novelDirDesc: "存放小說正文的目錄",
  },
  structure: {
    created: "已建立資料夾：{dirs}",
    defaultLore: "設定",
    defaultNovel: "正文",
    failed: "建立資料夾失敗：{dirs}",
    noChange: "預設目錄結構已就緒",
  },
};
