/**
 * .svelte 模块的静态声明；此处放宽 props 类型，精确检查由 svelte-check 承担。
 * 独立声明文件：模块文件内的 declare module 会被视为增强（augmentation），
 * 且 TS 对同名 .ts/.d.ts 只保留 .ts，故不与 svelte.ts 同名。
 */
declare module "*.svelte" {
  import type { Component } from "svelte";
  const component: Component;
  export default component;
}
