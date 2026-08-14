import type { NodeProp } from "@lezer/common";

/**
 * tokenClassNodeProp 为 Obsidian 运行时自带的未声明导出：其 markdown 语言向语法树节点注入
 * token 类（如 hmd-codeblock/hmd-frontmatter/inline-code），官方 npm 包未声明，此处补齐类型
 */
declare module "@codemirror/language" {
  export const tokenClassNodeProp: NodeProp<string>;
}
