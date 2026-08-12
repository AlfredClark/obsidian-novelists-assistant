/**
 * 全局环境声明文件。保持无顶层 import/export（全局脚本），
 * 其中的 declare module 才是环境模块声明而非模块增强。
 * 独立声明文件：模块文件内的 declare module 会被视为增强（augmentation），
 * 且 TS 对同名 .ts/.d.ts 只保留 .ts，故不与 svelte.ts 同名。
 */
declare module "*.svelte" {
  import type { Component } from "svelte";
  const component: Component;
  export default component;
}
