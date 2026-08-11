import type en from "./locales/en";

/** 插件界面语言设置项的可选值（system 表示跟随 Obsidian 界面语言） */
export type PluginLanguage = "system" | "en" | "zh" | "zh-TW";

/** 实际支持的语言，en 为缺省回退语言 */
export type SupportedLanguage = "en" | "zh" | "zh-TW";

/** 递归将资源叶子类型放宽为 string，供其他语言资源标注用（结构同构强制、值不限字面量） */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

/** 翻译资源结构，由英文推导保证各语言键完全一致 */
export type TranslationResource = DeepStringify<typeof en>;

/** 递归展开嵌套资源为点分键，t() 参数由此获得自动补全 */
type FlattenKeys<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : FlattenKeys<T[K], `${P}${K}.`>;
}[keyof T & string];

/** 全部翻译键的联合类型，如 "settings.language" */
export type TranslationKey = FlattenKeys<TranslationResource>;
