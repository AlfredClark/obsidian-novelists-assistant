import { TFile, TFolder } from "obsidian";
import type NovelistsAssistantPlugin from "../../main";
import type { FolderCountRole } from "./types";
import { PROCESSED_CLASS, WORD_COUNT_CLASS } from "./types";

/** 统计缓存：path → 文件 mtime 与字数；mtime 未变时直接复用，避免每次渲染重复读取文件 */
const countCache = new Map<string, { mtime: number; count: number }>();

/** 文件夹统计缓存：path → 角色与数量；条目含角色，目录设置变更导致同路径角色变化时自愈失效。
 *  total 仅 loreGroups 角色使用（递归设定总数），其余角色为 0 */
const folderCountCache = new Map<string, { role: FolderCountRole; count: number; total: number }>();

/** 文件树渲染变更的 debounce 定时器，批量处理 MutationObserver 捕获的新增项 */
let scanTimer: number | null = null;

/** 状态栏字数元素：init 时创建、卸载时移除；null 表示未初始化（settings 联动先于 init 触发时防御） */
let statusBarEl: HTMLElement | null = null;

/** 状态栏字数刷新的 debounce 定时器，合并 editor-change 高频触发（大章节每击键全量正则成本高） */
let statusTimer: number | null = null;

/** CJK 逐字计数测试：汉字/假名/谚文 + 全角字母数字；全角标点不在范围自然不计 */
const CJK_CHAR_RE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/u;

/** 半角拉丁/数字词测试：词内撇号与连字符视为同一词，避免 "well-known" 被拆成两词 */
const LATIN_WORD_RE = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

/**
 * 剔除 Markdown 语法标识，仅保留正文文字。
 * 顺序有依赖：frontmatter/代码块先于行内处理，图片先于链接（防 ! 残留），行首标记逐行剔除。
 * @param text 原始 Markdown 文本
 * @returns 清洗后的纯文本
 */
export function stripMarkdown(text: string): string {
  return (
    text
      // YAML frontmatter（仅文件开头）；非贪婪避免吞掉正文中的 --- 分隔线
      .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/m, "")
      // 围栏代码块（``` 与 ~~~ 两种围栏），内容整体剔除不计
      .replace(/(```|~~~)[\s\S]*?\1/g, "")
      // Obsidian 行内注释
      .replace(/%%.*?%%/g, "")
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

/**
 * 字数统计：CJK（汉字/假名/谚文）与全角字母数字逐字计 1，
 * 连续半角拉丁字母/数字序列计 1（标点与空白不计）。
 * @param text 原始 Markdown 文本
 * @returns 字数
 */
export function countWords(text: string): number {
  const cleaned = stripMarkdown(text);
  let count = 0;
  for (const char of cleaned) {
    if (CJK_CHAR_RE.test(char)) count += 1;
  }
  count += cleaned.match(LATIN_WORD_RE)?.length ?? 0;
  return count;
}

/** 属性值转义：data-path 可能含引号反斜杠，防止选择器解析失败 */
function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** 按路径查找文件标题元素；重渲染后旧节点失效，每次按需查询不缓存引用 */
function findTitleElement(path: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.nav-file-title[data-path="${escapeAttrValue(path)}"]`);
}

/** 按 mtime 失效缓存读取文件字数：未变直接复用，变更后重算并回写 */
async function getWordCount(plugin: NovelistsAssistantPlugin, file: TFile): Promise<number> {
  const cached = countCache.get(file.path);
  if (cached && cached.mtime === file.stat.mtime) return cached.count;
  const content = await plugin.app.vault.cachedRead(file);
  const count = countWords(content);
  countCache.set(file.path, { mtime: file.stat.mtime, count });
  return count;
}

/** 按单位拼接统计文案：单位非空时以空格分隔（如 "123 字"），为空时仅数字无尾随空格 */
function formatCount(count: number, unit: string): string {
  return unit === "" ? String(count) : `${count} ${unit}`;
}

/** 更新文件标题的统计文案；元素已不存在（折叠/开关关闭）时静默跳过 */
async function updateTitleCount(plugin: NovelistsAssistantPlugin, file: TFile): Promise<void> {
  const element = findTitleElement(file.path);
  if (!element) return;
  const count = await getWordCount(plugin, file);
  const span = element.querySelector(`:scope > .${WORD_COUNT_CLASS}`);
  span?.setText(formatCount(count, plugin.settings.wordCountUnit));
}

/** 装饰单个文件标题：仅 md 文件；追加统计 span 并打标记，文案异步填充 */
function decorateTitle(plugin: NovelistsAssistantPlugin, element: HTMLElement): void {
  const path = element.getAttribute("data-path");
  if (!path) return;
  const file = plugin.app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile) || file.extension !== "md") return;
  element.classList.add(PROCESSED_CLASS);
  element.createSpan({ cls: WORD_COUNT_CLASS });
  void updateTitleCount(plugin, file);
}

/** 移除全部统计 span 与标记：开关关闭时清空残留，重新开启后再次装饰（幂等） */
function removeAllWordCounts(): void {
  document.querySelectorAll(`.nav-file-title.${PROCESSED_CLASS}`).forEach((element) => {
    element.classList.remove(PROCESSED_CLASS);
    element.querySelector(`:scope > .${WORD_COUNT_CLASS}`)?.remove();
  });
}

/**
 * 刷新字数统计：开关开启时装饰全部未处理的文件标题，关闭时移除全部统计。
 * 已标记元素跳过，仅新增文件触发异步计数。
 * @param plugin 插件实例
 */
export function refreshWordCount(plugin: NovelistsAssistantPlugin): void {
  if (!plugin.settings.wordCount) {
    removeAllWordCounts();
    return;
  }
  document.querySelectorAll<HTMLElement>(".nav-file-title[data-path]").forEach((element) => {
    if (element.classList.contains(PROCESSED_CLASS)) return;
    decorateTitle(plugin, element);
  });
}

/**
 * 重设全部已装饰标题的统计文案：单位设置变更时调用。
 * 与 refreshWordCount 区分——后者跳过已处理项且由 MutationObserver 高频触发，
 * 全量重算会造成无谓的 DOM 遍历；此处只改文案，字数经缓存命中不重读文件。
 * @param plugin 插件实例
 */
export function refreshWordCountTexts(plugin: NovelistsAssistantPlugin): void {
  document.querySelectorAll<HTMLElement>(`.nav-file-title.${PROCESSED_CLASS}[data-path]`).forEach((element) => {
    const path = element.getAttribute("data-path");
    if (!path) return;
    const file = plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile) || file.extension !== "md") return;
    void updateTitleCount(plugin, file);
  });
}

/**
 * 判定文件夹的统计角色：设定文件夹自身计组数、正文文件夹自身计章节数、
 * 设定文件夹的直接子文件夹计设定数、正文文件夹的直接子文件夹计章节数。
 * 精确匹配优先于子文件夹规则，且 lore 规则优先于 novel 规则，
 * 防 loreDir/novelDir 嵌套或相等时角色冲突。
 * @param plugin 插件实例
 * @param path 文件夹路径
 * @returns 角色；目录未配置或路径不命中时返回 null
 */
function resolveFolderRole(plugin: NovelistsAssistantPlugin, path: string): FolderCountRole | null {
  const { loreDir, novelDir } = plugin.settings;
  if (loreDir !== "" && path === loreDir) return "loreGroups";
  if (novelDir !== "" && path === novelDir) return "chapters";
  // 归一化尾斜杠防手输 "目录/" 失效；直接子文件夹相对路径不含 "/"
  const lorePrefix = loreDir.replace(/\/+$/, "") + "/";
  if (loreDir !== "" && path.startsWith(lorePrefix)) {
    const relative = path.slice(lorePrefix.length);
    if (relative !== "" && !relative.includes("/")) return "loreNotes";
  }
  // 正文直接子文件夹计章节数；如需任意层级，去掉相对路径不含 "/" 的判定即可
  const novelPrefix = novelDir.replace(/\/+$/, "") + "/";
  if (novelDir !== "" && path.startsWith(novelPrefix)) {
    const relative = path.slice(novelPrefix.length);
    if (relative !== "" && !relative.includes("/")) return "novelSubdirs";
  }
  return null;
}

/** 设定文件夹的组数：直接子文件夹（TFolder）个数 */
function countLoreGroups(folder: TFolder): number {
  return folder.children.filter((child) => child instanceof TFolder).length;
}

/** 设定子文件夹的设定数：直接 md 文件个数（非递归） */
function countLoreNotes(folder: TFolder): number {
  return folder.children.filter((child) => child instanceof TFile && child.extension === "md").length;
}

/** 目录递归 md 文件数：前缀下所有 md 文件（含子文件夹），设定总数与章节数共用的计数口径 */
function countMdFiles(plugin: NovelistsAssistantPlugin, dir: string): number {
  const prefix = dir.replace(/\/+$/, "") + "/";
  return plugin.app.vault.getFiles().filter((file) => file.extension === "md" && file.path.startsWith(prefix)).length;
}

/** 目录总字数：前缀下递归 md 文件字数之和；经 getWordCount 共用 per-file 缓存，同一文件同一 mtime 只读一次 */
async function sumWordCounts(plugin: NovelistsAssistantPlugin, dir: string): Promise<number> {
  const prefix = dir.replace(/\/+$/, "") + "/";
  const files = plugin.app.vault.getFiles().filter((file) => file.extension === "md" && file.path.startsWith(prefix));
  const counts = await Promise.all(files.map((file) => getWordCount(plugin, file)));
  return counts.reduce((sum, count) => sum + count, 0);
}

/** 按角色读取文件夹统计：缓存条目角色一致直接复用，不一致（目录设置变更）重算回写 */
function getFolderCounts(
  plugin: NovelistsAssistantPlugin,
  path: string,
  role: FolderCountRole,
): { count: number; total: number } {
  const cached = folderCountCache.get(path);
  if (cached && cached.role === role) return cached;
  const folder = plugin.app.vault.getAbstractFileByPath(path);
  if (!(folder instanceof TFolder)) return { count: 0, total: 0 };
  let count: number;
  let total = 0;
  if (role === "loreGroups") {
    count = countLoreGroups(folder);
    total = countMdFiles(plugin, plugin.settings.loreDir);
  } else if (role === "loreNotes") {
    count = countLoreNotes(folder);
  } else if (role === "chapters") {
    count = countMdFiles(plugin, plugin.settings.novelDir);
  } else {
    count = countMdFiles(plugin, path);
  }
  folderCountCache.set(path, { role, count, total });
  return { count, total };
}

/**
 * 按角色组装文件夹统计文案，多段以 " | " 连接：
 * loreGroups 为「设定总数 | 组数」；chapters 为「总字数 | 章节数」（wordCount 关闭时仅章节数）；
 * novelSubdirs 与 chapters 同口径，但字数按子文件夹自身前缀递归；loreNotes 仅设定数。
 * 各段单位为空时无空格分隔。
 */
async function buildFolderCountText(plugin: NovelistsAssistantPlugin, path: string, role: FolderCountRole): Promise<string> {
  const { count, total } = getFolderCounts(plugin, path, role);
  if (role === "chapters" || role === "novelSubdirs") {
    const chapters = formatCount(count, plugin.settings.folderCountChapterUnit);
    if (!plugin.settings.wordCount) return chapters;
    // chapters 用设置值求和（路径与设置严格相等，防御带尾斜杠的脏路径）；子文件夹用自身路径
    const dir = role === "chapters" ? plugin.settings.novelDir : path;
    const words = await sumWordCounts(plugin, dir);
    return `${formatCount(words, plugin.settings.wordCountUnit)} | ${chapters}`;
  }
  if (role === "loreGroups") {
    const groups = formatCount(count, plugin.settings.folderCountGroupUnit);
    const notes = formatCount(total, plugin.settings.folderCountLoreUnit);
    return `${notes} | ${groups}`;
  }
  return formatCount(count, plugin.settings.folderCountLoreUnit);
}

/** 更新文件夹标题的统计文案；setText 前比对旧值，防高频扫描时无谓的 DOM 写入 */
async function updateFolderCount(plugin: NovelistsAssistantPlugin, element: HTMLElement, role: FolderCountRole): Promise<void> {
  const path = element.getAttribute("data-path");
  if (!path) return;
  const text = await buildFolderCountText(plugin, path, role);
  const span = element.querySelector(`:scope > .${WORD_COUNT_CLASS}`);
  if (span && span.getText() !== text) span.setText(text);
}

/** 装饰单个文件夹标题：追加统计 span 并打标记，文案异步填充（总字数需读取文件） */
function decorateFolderTitle(plugin: NovelistsAssistantPlugin, element: HTMLElement, role: FolderCountRole): void {
  element.classList.add(PROCESSED_CLASS);
  element.createSpan({ cls: WORD_COUNT_CLASS });
  void updateFolderCount(plugin, element, role);
}

/** 移除全部文件夹统计 span 与标记：开关关闭时清空残留，重新开启后再次装饰（幂等） */
function removeAllFolderCounts(): void {
  document.querySelectorAll(`.nav-folder-title.${PROCESSED_CLASS}`).forEach((element) => {
    element.classList.remove(PROCESSED_CLASS);
    element.querySelector(`:scope > .${WORD_COUNT_CLASS}`)?.remove();
  });
}

/**
 * 刷新文件夹统计：开关关闭时移除全部统计；开启时按角色装饰命中文件夹，
 * 目录设置变更后不再命中的已装饰项移除残留。
 * 同步计数（children/getFiles 均在内存）高频扫描安全，总字数经 per-file 缓存求和。
 * @param plugin 插件实例
 */
export function refreshFolderCounts(plugin: NovelistsAssistantPlugin): void {
  if (!plugin.settings.folderCount) {
    removeAllFolderCounts();
    return;
  }
  document.querySelectorAll<HTMLElement>(".nav-folder-title[data-path]").forEach((element) => {
    const path = element.getAttribute("data-path");
    if (!path) return;
    const role = resolveFolderRole(plugin, path);
    if (!role) {
      if (element.classList.contains(PROCESSED_CLASS)) {
        element.classList.remove(PROCESSED_CLASS);
        element.querySelector(`:scope > .${WORD_COUNT_CLASS}`)?.remove();
      }
      return;
    }
    if (element.classList.contains(PROCESSED_CLASS)) {
      void updateFolderCount(plugin, element, role);
    } else {
      decorateFolderTitle(plugin, element, role);
    }
  });
}

/** 调度 debounce 扫描：MutationObserver 与 vault 结构事件共用，批量刷新文件与文件夹装饰 */
function scheduleScan(plugin: NovelistsAssistantPlugin): void {
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    refreshWordCount(plugin);
    refreshFolderCounts(plugin);
  }, 100);
}

/** 自动禁用核心 word-count 插件：app.plugins 为未文档化 API（官方类型包未声明），
 *  经窄接口断言访问，防双数值并存（wordCount 关闭时不禁用，用户可回归原生统计） */
function disableCoreWordCount(plugin: NovelistsAssistantPlugin): void {
  const plugins = (plugin.app as unknown as { plugins: { disablePlugin(id: string): void } }).plugins;
  plugins.disablePlugin("word-count");
}

/**
 * 刷新状态栏字数：按 wordCount 开关与活动编辑器内容统计（未保存内容实时计入），
 * 单位复用 wordCountUnit。非 md 文件或无活动编辑器时清空文案。
 * 保存后与文件树统计（按磁盘内容）收敛一致。
 * @param plugin 插件实例
 */
export function refreshStatusBar(plugin: NovelistsAssistantPlugin): void {
  if (!statusBarEl) return;
  const activeEditor = plugin.app.workspace.activeEditor;
  const file = activeEditor?.file;
  if (!plugin.settings.wordCount || !file || file.extension !== "md" || !activeEditor?.editor) {
    statusBarEl.setText("");
    return;
  }
  const count = countWords(activeEditor.editor.getValue());
  statusBarEl.setText(formatCount(count, plugin.settings.wordCountUnit));
}

/** 调度状态栏刷新：editor-change 每击键触发，debounce 合并同批击键后再全量计数 */
function scheduleStatusRefresh(plugin: NovelistsAssistantPlugin): void {
  if (statusTimer !== null) window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    statusTimer = null;
    refreshStatusBar(plugin);
  }, 200);
}

/**
 * 初始化字数统计：在文件列表每个 md 文件标题后追加「XXX 字」，
 * 并在设定/正文文件夹标题后追加「设定总数 | 组数」「总字数 | 章节数」统计，
 * 正文文件夹的直接子文件夹同样追加「总字数 | 章节数」（按自身前缀递归）；
 * 状态栏追加当前文件字数（复用 wordCount 开关与 wordCountUnit 单位），
 * 并自动禁用核心 word-count 插件避免两个数值并存。
 * 文件树项渲染无现成事件：MutationObserver 监听主文档子树（debounce）捕获新增项，
 * layout-change 兜底折叠/排序等重渲染；modify 事件按路径即时更新字数并联动目录总字数，
 * create/delete/rename 清文件夹缓存并重扫（折叠文件夹无子节点 DOM 变更，MutationObserver 兜不住）。
 * @param plugin 插件实例
 * @returns 清理函数，由 features 聚合层在卸载时回收残留装饰
 */
export function initWordCount(plugin: NovelistsAssistantPlugin): () => void {
  const observer = new MutationObserver(() => scheduleScan(plugin));
  observer.observe(document.body, { childList: true, subtree: true });

  statusBarEl = plugin.addStatusBarItem();
  // 核心 word-count 插件统计原始文本，与自定义统计并存会显示两个不同数值：开启时自动禁用
  if (plugin.settings.wordCount) {
    disableCoreWordCount(plugin);
  }
  plugin.registerEvent(plugin.app.workspace.on("editor-change", () => scheduleStatusRefresh(plugin)));
  plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", () => refreshStatusBar(plugin)));
  refreshStatusBar(plugin);

  plugin.registerEvent(
    plugin.app.vault.on("modify", (file) => {
      if (!plugin.settings.wordCount || !(file instanceof TFile)) return;
      countCache.delete(file.path);
      void updateTitleCount(plugin, file);
      // 正文目录内文件字数变化影响目录总字数：刷新文件夹统计（重算仅重读被改文件）
      const novelPrefix = plugin.settings.novelDir.replace(/\/+$/, "") + "/";
      if (plugin.settings.novelDir !== "" && file.path.startsWith(novelPrefix)) {
        refreshFolderCounts(plugin);
      }
    }),
  );
  // 结构变更只影响文件夹统计；清缓存后重扫，DOM 新增项由 MutationObserver 兜底
  const invalidateFolderCounts = () => {
    folderCountCache.clear();
    scheduleScan(plugin);
  };
  plugin.registerEvent(plugin.app.vault.on("create", invalidateFolderCounts));
  plugin.registerEvent(plugin.app.vault.on("delete", invalidateFolderCounts));
  plugin.registerEvent(
    plugin.app.vault.on("rename", (_file, oldPath) => {
      countCache.delete(oldPath);
      invalidateFolderCounts();
    }),
  );
  plugin.registerEvent(
    plugin.app.workspace.on("layout-change", () => {
      refreshWordCount(plugin);
      refreshFolderCounts(plugin);
    }),
  );

  refreshWordCount(plugin);
  refreshFolderCounts(plugin);

  return () => {
    observer.disconnect();
    if (scanTimer !== null) window.clearTimeout(scanTimer);
    scanTimer = null;
    if (statusTimer !== null) window.clearTimeout(statusTimer);
    statusTimer = null;
    statusBarEl?.remove();
    statusBarEl = null;
    removeAllWordCounts();
    removeAllFolderCounts();
    countCache.clear();
    folderCountCache.clear();
  };
}
