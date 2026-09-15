/**
 * 剔除文件头的 YAML frontmatter（仅文件开头）；非贪婪避免吞掉正文中的 --- 分隔线。
 * 单独导出供「保留标记」导出复用：该模式只去元数据、保留其余 Markdown 标记。
 * @param text 原始 Markdown 文本
 * @returns 无 frontmatter 的文本
 */
export function stripFrontmatter(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/m, "");
}

/**
 * 剔除 Markdown 语法标识，仅保留正文文字。
 * 顺序有依赖：frontmatter/代码块先于行内处理，图片先于链接（防 ! 残留），行首标记逐行剔除。
 * 自 word-count 迁出：字数统计与导出共用同一清洗口径，避免 feature 之间互相依赖。
 * @param text 原始 Markdown 文本
 * @returns 清洗后的纯文本
 */
export function stripMarkdown(text: string): string {
  return (
    stripFrontmatter(text)
      // 围栏代码块（``` 与 ~~~ 两种围栏），内容整体剔除不计
      .replace(/(```|~~~)[\s\S]*?\1/g, "")
      // Obsidian 注释（%% 可跨行成块，非贪婪取到最近的闭合 %%）
      .replace(/%%[\s\S]*?%%/g, "")
      // HTML 注释与标签；注释先于标签剔除，避免注释内容混入正文
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\/?[A-Za-z][^>]*>/g, "")
      // 图片与嵌入（![[…]] 与 ![alt](url)）整体剔除；先于链接处理
      .replace(/!\[\[[^\]]*]]/g, "")
      .replace(/!\[[^\]]*]\([^)]*\)/g, "")
      // wikilink：[[path|alias]] 取别名，[[path]] 取路径
      .replace(/\[\[([^\]|]*)\|([^\]]*)]]/g, "$2")
      .replace(/\[\[([^\]]*)]]/g, "$1")
      // Markdown 链接 [text](url) 取 text
      .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
      // 行内代码
      .replace(/`[^`]*`/g, "")
      // 数学公式（$$ 块级先于 $ 行内）
      .replace(/\$\$[\s\S]*?\$\$/g, "")
      .replace(/\$[^$\n]+?\$/g, "")
      // 脚注定义行 [^1]: 与行内引用 [^1]
      .replace(/^ {0,3}\[\^[^\]]*]:.*$/gm, "")
      .replace(/\[\^[^\]]*]/g, "")
      // 标题/引用/列表等行首标记，逐行剔除
      .replace(/^ {0,3}#{1,6}\s*/gm, "")
      .replace(/^ {0,3}(?:>\s?)+/gm, "")
      .replace(/^ {0,3}[-*+]\s+/gm, "")
      .replace(/^ {0,3}\d+[.)]\s+/gm, "")
      // 分隔线（---/***/___）与表格分隔行（|:-- 等，仅含 | : - 空白的行）
      .replace(/^ {0,3}([-*_])\s*(?:\1\s*){2,}$/gm, "")
      .replace(/^ {0,3}[\s|:-]+$/gm, "")
      // callout 类型标记 [!note]/[!+]；引用标记已剔除，正文保留
      .replace(/\[![^\]]*]/g, "")
      // 话题标签；字母数字前无 # 才算标签，防误伤 "C#语言" 类文本
      .replace(/(?<![\p{L}\p{N}])#[^\s#]+/gu, "")
      // 删除线/高亮与加粗/斜体/下划线标记
      .replace(/~~/g, "")
      .replace(/==/g, "")
      .replace(/[*_]/g, "")
      // 转义反斜杠；被转义字符本体保留，直接剔除
      .replace(/\\/g, "")
  );
}
