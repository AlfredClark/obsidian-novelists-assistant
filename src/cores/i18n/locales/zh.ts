import type { TranslationResource } from "../types";

/** 简体中文资源。标注 TranslationResource 强制与英文同构，键缺失或多余都会编译报错 */
export const zh: TranslationResource = {
  settings: {
    collapsible: "折叠分组",
    collapsibleDesc: "是否折叠设置分组",
    general: "通用设置",
    language: "插件语言",
    languageDesc: "设置插件语言",
    languageOptions: {
      system: "跟随系统",
      en: "英文",
      zh: "简体中文",
      "zh-TW": "繁体中文",
    },
  },
};

/** 繁体中文资源。标注 TranslationResource 强制与英文同构，键缺失或多余都会编译报错 */
export const zhTW: TranslationResource = {
  settings: {
    collapsible: "摺疊分組",
    collapsibleDesc: "是否摺疊設定分組",
    general: "通用設定",
    language: "外掛程式語言",
    languageDesc: "設定外掛程式語言",
    languageOptions: {
      system: "跟隨系統",
      en: "英文",
      zh: "簡體中文",
      "zh-TW": "繁體中文",
    },
  },
};
