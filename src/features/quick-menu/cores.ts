import { Notice, TFile, TFolder } from "obsidian";
import Nzhcn from "nzh/cn";
import { t } from "../../cores/i18n";
import type { ChapterCountMode, ChapterNumberStyle } from "../../cores/settings";
import type NovelistsAssistantPlugin from "../../main";
import { isInsideOrSelf } from "../../utils/path";
import type { ChapterRenumberPlan, EditorMenuItem, FileMenuItem } from "./types";
import { VolumeNameModal } from "./components/volume-name-modal";
/** 文件菜单项；后续新增菜单项在此追加条目 */
const FILE_MENU_ITEMS: FileMenuItem[] = [];

/** 编辑菜单项；后续新增菜单项在此追加条目 */
const EDITOR_MENU_ITEMS: EditorMenuItem[] = [];

/** 中文小写数字字符集，与 nzh decodeS 解码能力对齐 */
const CN_LOWER_CHARS = "零一二三四五六七八九十百千万";

/** 中文大写数字字符集，与 nzh decodeB 解码能力对齐 */
const CN_UPPER_CHARS = "零壹贰叁肆伍陆柒捌玖拾佰仟万亿";

/** 编号样式类型守卫：data.json 脏值回退默认 digit，避免分支落入未定义行为 */
function isChapterNumberStyle(style: unknown): style is ChapterNumberStyle {
  return style === "digit" || style === "chineseLower" || style === "chineseUpper";
}

/** 计数范围类型守卫：data.json 脏值回退默认 perVolume，保持存量行为不变 */
function isChapterCountMode(mode: unknown): mode is ChapterCountMode {
  return mode === "perVolume" || mode === "unified";
}

/**
 * 按章节/卷格式与编号样式构建名称匹配正则：转义格式后把 # 占位替换为对应样式的数字捕获组，锚定开头。
 * style 为 "any" 时匹配三种编号样式任一（数字/中文小写/中文大写），用于章节/卷转换识别混合编号。
 * 格式不含 # 时按字面整体匹配（编号从 1 开始）。
 * 章节与卷的格式语法一致，故共用本函数（调用方传入各自的 format 与 style）。
 */
function buildChapterRegex(format: string, style: ChapterNumberStyle | "any"): RegExp {
  const pattern =
    style === "digit"
      ? "(\\d+)"
      : style === "chineseLower"
        ? `([${CN_LOWER_CHARS}]+)`
        : style === "chineseUpper"
          ? `([${CN_UPPER_CHARS}]+)`
          : `(\\d+|[${CN_LOWER_CHARS}]+|[${CN_UPPER_CHARS}]+)`;
  return new RegExp(`^${format.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/#/g, pattern)}`);
}

/** 按编号样式把章节数字 token 解码为数值；解码失败返回 NaN 由调用方忽略 */
function decodeChapterNumber(token: string, style: ChapterNumberStyle): number {
  if (style === "digit") return Number(token);
  return Number(style === "chineseLower" ? Nzhcn.decodeS(token) : Nzhcn.decodeB(token));
}

/** 按编号样式把数值编码为章节数字 */
function encodeChapterNumber(num: number, style: ChapterNumberStyle): string {
  if (style === "digit") return String(num);
  return style === "chineseLower" ? Nzhcn.encodeS(num) : Nzhcn.encodeB(num);
}

/** 按 token 形态解码章节数字（数字/中文小写/中文大写），解码失败返回 NaN 由调用方忽略 */
function decodeChapterToken(token: string): number {
  if (/^\d+$/.test(token)) return Number(token);
  if ([...token].every((char) => CN_LOWER_CHARS.includes(char))) return Number(Nzhcn.decodeS(token));
  return Number(Nzhcn.decodeB(token));
}

/**
 * 新建下一章：目标为文件时在其所在目录创建，目标为文件夹时在其内部创建。
 * 分卷计数时遍历目标目录内符合章节格式与编号样式的文件取最大编号 +1；
 * 统一计数时取正文目录下全部章节的最大编号 +1（创建位置仍为目标目录）。
 * 文件名冲突时继续递增；创建空文件后在当前标签页打开。
 * @param plugin 插件实例
 * @param target 文件菜单点击目标（文件或文件夹）
 */
export async function createNextChapter(plugin: NovelistsAssistantPlugin, target: TFile | TFolder): Promise<void> {
  const { chapterFormat, chapterNumberStyle, chapterCountMode, novelDir } = plugin.settings;
  // 设置层已强制格式含 #；此处兜底 data.json 脏值，防无编号命名与冲突递增死循环
  if (!chapterFormat.includes("#")) return;
  const style = isChapterNumberStyle(chapterNumberStyle) ? chapterNumberStyle : "digit";
  const dir = target instanceof TFile ? (target.parent?.path ?? "") : target.path;
  if (dir === "") return;
  const folder = plugin.app.vault.getAbstractFileByPath(dir);
  if (!(folder instanceof TFolder)) return;
  const regex = buildChapterRegex(chapterFormat, style);
  let max = 0;
  if (isChapterCountMode(chapterCountMode) && chapterCountMode === "unified" && novelDir !== "") {
    // 统一计数：正文目录下全部 md 章节的最大编号（仅当前编号样式，与分卷计数口径一致）
    for (const file of plugin.app.vault.getFiles()) {
      if (file.extension !== "md" || !isInsideOrSelf(file.path, novelDir)) continue;
      const match = regex.exec(file.basename);
      if (match?.[1]) {
        const num = decodeChapterNumber(match[1], style);
        if (Number.isFinite(num)) {
          max = Math.max(max, num);
        }
      }
    }
  } else {
    for (const child of folder.children) {
      if (!(child instanceof TFile)) continue;
      const match = regex.exec(child.basename);
      if (match?.[1]) {
        const num = decodeChapterNumber(match[1], style);
        if (Number.isFinite(num)) {
          max = Math.max(max, num);
        }
      }
    }
  }
  // 编号冲突时递增直至可用，避免 create 报错中断
  let next = max + 1;
  let path = "";
  do {
    path = `${dir}/${chapterFormat.replace(/#/g, encodeChapterNumber(next, style))}.md`;
    next += 1;
  } while (plugin.app.vault.getAbstractFileByPath(path));
  try {
    const file = await plugin.app.vault.create(path, "");
    await plugin.app.workspace.getLeaf(false).openFile(file);
  } catch {
    // 创建失败（非法字符/竞态等）静默放弃，不抛未处理 Promise
  }
}

/**
 * 章节转换：将 novelDir 内匹配源格式的章节文件重命名为目标格式（chapterFormat + chapterNumberStyle）。
 * 源格式的 # 匹配三种编号样式任一；已是目标格式、目标名冲突或重命名失败均计入跳过。
 * @param plugin 插件实例
 * @param sourceFormat 源章节格式（与 chapterFormat 同语法，# 为编号占位）
 * @returns 转换统计，调用方负责反馈
 */
export async function convertChapters(
  plugin: NovelistsAssistantPlugin,
  sourceFormat: string,
): Promise<{ converted: number; skipped: number }> {
  const { chapterFormat, chapterNumberStyle } = plugin.settings;
  const style = isChapterNumberStyle(chapterNumberStyle) ? chapterNumberStyle : "digit";
  const novelDir = plugin.settings.novelDir;
  // 源格式无 # 或正文目录未配置时无可转换目标，直接返回由调用方提示
  if (!sourceFormat.includes("#") || novelDir === "") return { converted: 0, skipped: 0 };
  const regex = buildChapterRegex(sourceFormat, "any");
  let converted = 0;
  let skipped = 0;
  for (const file of plugin.app.vault.getFiles()) {
    if (!isInsideOrSelf(file.path, novelDir)) continue;
    const match = regex.exec(file.basename);
    if (!match?.[1]) continue;
    const num = decodeChapterToken(match[1]);
    if (!Number.isFinite(num)) {
      skipped += 1;
      continue;
    }
    // 保留匹配前缀之后的原标题后缀（如 "第 1 章 穿越" 的 " 穿越"），仅替换编号部分
    const suffix = file.basename.slice((match[0] ?? "").length);
    const newPath = `${file.parent?.path ?? ""}/${chapterFormat.replace(/#/g, encodeChapterNumber(num, style))}${suffix}.md`;
    // 已是目标格式或目标名被占用时跳过，避免 rename 报错与编号映射错乱
    if (newPath === file.path || plugin.app.vault.getAbstractFileByPath(newPath)) {
      skipped += 1;
      continue;
    }
    try {
      // rename 由 Obsidian 自动更新内部链接
      await plugin.app.vault.rename(file, newPath);
      converted += 1;
    } catch {
      skipped += 1;
    }
  }
  return { converted, skipped };
}

/**
 * 计算下一卷自动名（不落盘）：遍历正文目录的直接子文件夹中符合卷格式与编号样式的项取最大编号 +1，
 * 目录名冲突时继续递增；供新建分卷弹窗预填。
 * @param plugin 插件实例
 * @returns 自动卷名；配置无效时返回 null
 */
export function getNextVolumeName(plugin: NovelistsAssistantPlugin): string | null {
  const { volumeFormat, volumeNumberStyle, novelDir } = plugin.settings;
  // 设置层已强制格式含 #；此处兜底 data.json 脏值，防无编号命名与冲突递增死循环
  if (!volumeFormat.includes("#") || novelDir === "") return null;
  const style = isChapterNumberStyle(volumeNumberStyle) ? volumeNumberStyle : "digit";
  const folder = plugin.app.vault.getAbstractFileByPath(novelDir);
  if (!(folder instanceof TFolder)) return null;
  const regex = buildChapterRegex(volumeFormat, style);
  let max = 0;
  // 卷为目录，仅统计直接子文件夹（章节位于卷内，不与卷同层）
  for (const child of folder.children) {
    if (!(child instanceof TFolder)) continue;
    const match = regex.exec(child.name);
    if (match?.[1]) {
      const num = decodeChapterNumber(match[1], style);
      if (Number.isFinite(num)) {
        max = Math.max(max, num);
      }
    }
  }
  // 编号冲突时递增直至可用，避免创建时报错中断
  let next = max + 1;
  let name = "";
  do {
    name = volumeFormat.replace(/#/g, encodeChapterNumber(next, style));
    next += 1;
  } while (plugin.app.vault.getAbstractFileByPath(`${novelDir}/${name}`));
  return name;
}

/**
 * 按指定名在正文目录根层创建卷目录。
 * @param plugin 插件实例
 * @param name 卷目录名（调用方已 trim；空名与冲突由调用方前置拦截）
 * @returns 新建的卷目录；配置无效或创建失败时返回 null
 */
export async function createVolume(plugin: NovelistsAssistantPlugin, name: string): Promise<TFolder | null> {
  const { novelDir } = plugin.settings;
  if (novelDir === "") return null;
  const folder = plugin.app.vault.getAbstractFileByPath(novelDir);
  if (!(folder instanceof TFolder)) return null;
  const path = `${novelDir}/${name}`;
  if (plugin.app.vault.getAbstractFileByPath(path)) return null;
  try {
    await plugin.app.vault.createFolder(path);
    const created = plugin.app.vault.getAbstractFileByPath(path);
    return created instanceof TFolder ? created : null;
  } catch {
    // 创建失败（非法字符/竞态等）静默放弃，不抛未处理 Promise
    return null;
  }
}

/**
 * 确认新建分卷名并落盘：空名保持弹窗（由用户继续输入或 Esc 退出），
 * 同名冲突或创建失败提示并保持弹窗供修正，成功关闭弹窗。
 * 弹窗位于 Modal 容器（文件树之外），空格等按键天然不受文件树监听影响。
 * @param plugin 插件实例
 * @param modal 新建分卷弹窗，成功时关闭
 * @param name 用户输入的卷名
 */
async function confirmVolumeName(plugin: NovelistsAssistantPlugin, modal: VolumeNameModal, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === "") return;
  const path = `${plugin.settings.novelDir}/${trimmed}`;
  if (plugin.app.vault.getAbstractFileByPath(path)) {
    new Notice(t("quickMenu.volumeExists", { name: trimmed }));
    return;
  }
  const folder = await createVolume(plugin, trimmed);
  if (!folder) {
    new Notice(t("quickMenu.volumeCreateFailed", { name: trimmed }));
    return;
  }
  modal.close();
}

/**
 * 分卷转换：将正文目录的直接子文件夹中匹配源格式的卷目录重命名为目标格式（volumeFormat + volumeNumberStyle）。
 * 源格式的 # 匹配三种编号样式任一；保留编号之后的原目录名后缀（如 "第 1 卷 风起" 的 " 风起"）。
 * 已是目标格式、目标名冲突或重命名失败均计入跳过。
 * @param plugin 插件实例
 * @param sourceFormat 源卷格式（与 volumeFormat 同语法，# 为编号占位）
 * @returns 转换统计，调用方负责反馈
 */
export async function convertVolumes(
  plugin: NovelistsAssistantPlugin,
  sourceFormat: string,
): Promise<{ converted: number; skipped: number }> {
  const { volumeFormat, volumeNumberStyle, novelDir } = plugin.settings;
  const style = isChapterNumberStyle(volumeNumberStyle) ? volumeNumberStyle : "digit";
  // 源格式无 # 或正文目录未配置时无可转换目标，直接返回由调用方提示
  if (!sourceFormat.includes("#") || novelDir === "") return { converted: 0, skipped: 0 };
  const folder = plugin.app.vault.getAbstractFileByPath(novelDir);
  if (!(folder instanceof TFolder)) return { converted: 0, skipped: 0 };
  const regex = buildChapterRegex(sourceFormat, "any");
  let converted = 0;
  let skipped = 0;
  // 仅遍历直接子文件夹，卷不与章节同层；先快照再执行——rename 会扰动 children 活数组，直接遍历会跳项
  const children = [...folder.children];
  for (const child of children) {
    if (!(child instanceof TFolder)) continue;
    const match = regex.exec(child.name);
    if (!match?.[1]) continue;
    const num = decodeChapterToken(match[1]);
    if (!Number.isFinite(num)) {
      skipped += 1;
      continue;
    }
    // 保留匹配前缀之后的原标题后缀（如 "第 1 卷 风起" 的 " 风起"），仅替换编号部分
    const suffix = child.name.slice((match[0] ?? "").length);
    const newPath = `${novelDir}/${volumeFormat.replace(/#/g, encodeChapterNumber(num, style))}${suffix}`;
    // 已是目标格式或目标名被占用时跳过，避免 rename 报错与编号映射错乱
    if (newPath === child.path || plugin.app.vault.getAbstractFileByPath(newPath)) {
      skipped += 1;
      continue;
    }
    try {
      // rename 由 Obsidian 自动更新内部链接
      await plugin.app.vault.rename(child, newPath);
      converted += 1;
    } catch {
      skipped += 1;
    }
  }
  return { converted, skipped };
}

/** 重编号临时文件名中缀：两阶段改名避让 A→B/B→A 互占，执行完无残留 */
const RENUMBER_TEMP_PREFIX = "__renumber_";

/** 字符串升序比较：排序 tiebreak 确定性用，不依赖 ICU 本地化差异 */
function comparePath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 推演章节重编号方案：扫描正文目录下匹配当前章节格式的 md 文件，按计数策略重排编号。
 * 分卷计数按父目录分组、组内按当前编号升序重排 1..N（根目录零散章节自成一组）；
 * 统一计数按卷语义全局排序（根文件排首→卷编号升序→非卷目录排尾）后重排 1..N。
 * 仅当前编号样式参与推演；标题后缀保留；终名被非候选占用计入 skipped。
 * 纯内存推演不落盘，由调用方弹窗确认后经 applyChapterRenumber 执行。
 * @param plugin 插件实例
 * @returns 重编号方案
 */
export function planChapterRenumber(plugin: NovelistsAssistantPlugin): ChapterRenumberPlan {
  const empty: ChapterRenumberPlan = { changes: [], unchanged: 0, skipped: 0 };
  const { chapterFormat, chapterNumberStyle, chapterCountMode, volumeFormat, novelDir } = plugin.settings;
  if (!chapterFormat.includes("#") || novelDir === "") return empty;
  const style = isChapterNumberStyle(chapterNumberStyle) ? chapterNumberStyle : "digit";
  const matchRegex = buildChapterRegex(chapterFormat, "any");
  const candidates: { file: TFile; num: number; suffix: string }[] = [];
  for (const file of plugin.app.vault.getFiles()) {
    if (file.extension !== "md" || !isInsideOrSelf(file.path, novelDir)) continue;
    const match = matchRegex.exec(file.basename);
    if (!match?.[1]) continue;
    const num = decodeChapterToken(match[1]);
    if (!Number.isFinite(num)) continue;
    // 保留匹配前缀之后的原标题后缀（如 "第 1 章 穿越" 的 " 穿越"），仅重排编号部分
    candidates.push({ file, num, suffix: file.basename.slice((match[0] ?? "").length) });
  }
  if (candidates.length === 0) return empty;
  const unified = isChapterCountMode(chapterCountMode) && chapterCountMode === "unified";
  // 分组：分卷计数按父目录，统一计数全体一组后按卷语义排序
  const groups = new Map<string, typeof candidates>();
  if (unified) {
    groups.set("", candidates);
  } else {
    for (const candidate of candidates) {
      const key = candidate.file.parent?.path ?? "";
      const group = groups.get(key);
      if (group) group.push(candidate);
      else groups.set(key, [candidate]);
    }
  }
  const volumeRegex = unified && volumeFormat.includes("#") ? buildChapterRegex(volumeFormat, "any") : null;
  // 卷排序值：根目录零散章节排首，卷按编号升序，非卷目录排尾（脏格式回退路径比较）
  const rankOfDir = (dir: string): number => {
    if (dir === novelDir) return -1;
    const relative = dir.startsWith(`${novelDir}/`) ? dir.slice(novelDir.length + 1) : dir;
    const top = relative.split("/")[0] ?? "";
    if (volumeRegex) {
      const match = volumeRegex.exec(top);
      if (match?.[1]) {
        const num = decodeChapterToken(match[1]);
        if (Number.isFinite(num)) return num;
      }
    }
    return Number.POSITIVE_INFINITY;
  };
  const changes: ChapterRenumberPlan["changes"] = [];
  let unchanged = 0;
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => {
      if (unified) {
        const rank = rankOfDir(a.file.parent?.path ?? "") - rankOfDir(b.file.parent?.path ?? "");
        if (rank !== 0) return rank;
      }
      return a.num - b.num || comparePath(a.file.path, b.file.path);
    });
    ordered.forEach((candidate, index) => {
      const dir = candidate.file.parent?.path ?? "";
      const to = `${dir}/${chapterFormat.replace(/#/g, encodeChapterNumber(index + 1, style))}${candidate.suffix}.md`;
      if (to === candidate.file.path) unchanged += 1;
      else changes.push({ file: candidate.file, from: candidate.file.path, to });
    });
  }
  // 占用预判：终名被不移动的文件（非候选或无需改动项）占用时跳过；候选互占由两阶段改名解决
  const vacated = new Set(changes.map((change) => change.from));
  const kept = changes.filter((change) => {
    const occupier = plugin.app.vault.getAbstractFileByPath(change.to);
    return !occupier || vacated.has(change.to);
  });
  return { changes: kept, unchanged, skipped: changes.length - kept.length };
}

/**
 * 执行章节重编号：两阶段改名避让互占（先全部改临时名，再改终名）。
 * 终名在执行间隙被外部占用时改回原名计跳过；rename 由 Obsidian 自动更新内部链接。
 * @param plugin 插件实例
 * @param plan planChapterRenumber 推演的方案
 * @returns 实际改名与跳过统计（unchanged 见 plan）
 */
export async function applyChapterRenumber(
  plugin: NovelistsAssistantPlugin,
  plan: ChapterRenumberPlan,
): Promise<{ changed: number; skipped: number }> {
  let changed = 0;
  let skipped = plan.skipped;
  const finals = new Set(plan.changes.map((change) => change.to));
  const staged: { file: TFile; from: string; to: string }[] = [];
  let index = 0;
  for (const change of plan.changes) {
    const dir = change.file.parent?.path ?? "";
    // 临时名避让现存路径与全部终名，防阶段一误占
    let temp = "";
    do {
      temp = `${dir}/${RENUMBER_TEMP_PREFIX}${index}.md`;
      index += 1;
    } while (plugin.app.vault.getAbstractFileByPath(temp) || finals.has(temp));
    try {
      await plugin.app.vault.rename(change.file, temp);
      staged.push({ file: change.file, from: change.from, to: change.to });
    } catch {
      skipped += 1;
    }
  }
  for (const item of staged) {
    if (plugin.app.vault.getAbstractFileByPath(item.to)) {
      // 终名被外部占用：改回原名计跳过；改回失败则保持临时名，由用户手动处理
      try {
        await plugin.app.vault.rename(item.file, item.from);
      } catch {
        // 保持临时名，不抛未处理 Promise
      }
      skipped += 1;
      continue;
    }
    try {
      await plugin.app.vault.rename(item.file, item.to);
      changed += 1;
    } catch {
      try {
        await plugin.app.vault.rename(item.file, item.from);
      } catch {
        // 同上
      }
      skipped += 1;
    }
  }
  return { changed, skipped };
}

/**
 * 在指定目录下创建以选中文本命名的设定文件（.md，空内容）。
 * 名称仅做 trim 不做字符清洗，非法字符/超长由创建失败兜底提示；
 * 仓库内任何位置存在同名（basename 大小写不敏感）设定时跳过并提示，创建成功与失败均提示。
 * @param plugin 插件实例
 * @param name 选中文本
 * @param dir 目标目录路径
 */
export async function createLoreNote(plugin: NovelistsAssistantPlugin, name: string, dir: string): Promise<void> {
  const noteName = name.trim();
  // 纯空白选中静默跳过，不打扰用户
  if (noteName === "") return;
  // 全库查重：覆盖原目标路径检查——目标路径文件若存在，其 basename 必然与 noteName 相同
  const normalized = noteName.toLowerCase();
  if (plugin.app.vault.getFiles().some((file) => file.basename.toLowerCase() === normalized)) {
    new Notice(t("quickMenu.loreExists", { name: noteName }));
    return;
  }
  try {
    await plugin.app.vault.create(`${dir}/${noteName}.md`, "");
    new Notice(t("quickMenu.loreCreated", { name: noteName }));
  } catch {
    new Notice(t("quickMenu.loreCreateFailed", { name: noteName }), 5000);
  }
}

/** 收集 loreDir 内全部文件的纯名称（不含扩展名），去重保序 */
function getLoreNames(plugin: NovelistsAssistantPlugin): string[] {
  const loreDir = plugin.settings.loreDir;
  if (loreDir === "") return [];
  return [
    ...new Set(
      plugin.app.vault
        .getFiles()
        .filter((file) => isInsideOrSelf(file.path, loreDir))
        .map((file) => file.basename),
    ),
  ];
}

/**
 * 单遍扫描包裹设定链接：已有的 wikilink 与 Markdown 内链（含别名/路径形式）整体跳过不重复包裹，
 * 未链接的名称按长度降序匹配后以 [[]] 包裹；count 为实际包裹处数。
 * 已知边界：引用式链接 [文本][ref] / [文本] 形式不在保护范围。
 */
function wrapLoreNames(text: string, names: string[]): { text: string; count: number } {
  if (names.length === 0) return { text, count: 0 };
  // 链接分支优先消费整个 wikilink 或 Markdown 内链 [文本](链接)，名称分支按长度降序避免短名先匹配破坏长名
  const alternation = [...names]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const regex = new RegExp(`(\\[\\[[^\\]]*]]|\\[[^\\]]*]\\([^)]*\\))|(${alternation})`, "g");
  let count = 0;
  // 显式标注回调参数类型：replace 的扩展参数默认为 any，触发 no-unsafe-return
  const updated = text.replace(regex, (_match: string, link: string | undefined, name: string | undefined) => {
    if (link) return link;
    count += 1;
    return `[[${name ?? ""}]]`;
  });
  return { text: updated, count };
}

/**
 * 解除设定链接：仅精确匹配 [[名称]] 的包裹，含别名（[[名|别名]]）或路径的链接不动；
 * count 为实际解除处数。
 */
function unwrapLoreNames(text: string, names: string[]): { text: string; count: number } {
  if (names.length === 0) return { text, count: 0 };
  const alternation = [...names]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const regex = new RegExp(`\\[\\[(${alternation})]]`, "g");
  let count = 0;
  // 显式标注回调参数类型：replace 的扩展参数默认为 any，触发 no-unsafe-return
  const updated = text.replace(regex, (_match: string, name: string | undefined) => {
    count += 1;
    return name ?? "";
  });
  return { text: updated, count };
}

/** 正则特殊字符转义，防设定名称破坏匹配模式 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 初始化快捷菜单功能：注册文件菜单与编辑菜单事件，分别按 FILE_MENU_ITEMS/EDITOR_MENU_ITEMS 配置渲染菜单项。
 * 菜单项在 init 内注册而非模块级常量，保证 t() 在 i18n 初始化后求值。
 * 两事件经 plugin.registerEvent 注册，Obsidian 在卸载时自动回收；
 * 与 typeset/gridlines 不同，本模块无 DOM 类或样式残留，清理函数仅清空注册条目（防重载后菜单项重复）。
 * @param plugin 插件实例
 * @returns 清理函数，由 features 聚合层在卸载时回收
 */
export function initQuickMenu(plugin: NovelistsAssistantPlugin): () => void {
  FILE_MENU_ITEMS.push({
    title: t("quickMenu.newChapter"),
    icon: "file-plus",
    showIf: (file) => {
      const novelDir = plugin.settings.novelDir;
      return novelDir !== "" && isInsideOrSelf(file.path, novelDir);
    },
    action: async (file) => {
      if (file instanceof TFile || file instanceof TFolder) {
        await createNextChapter(plugin, file);
      }
    },
  });
  FILE_MENU_ITEMS.push({
    title: t("quickMenu.newVolume"),
    icon: "folder-plus",
    showIf: (file) => {
      const novelDir = plugin.settings.novelDir;
      return novelDir !== "" && isInsideOrSelf(file.path, novelDir);
    },
    // 卷目录始终创建在正文目录根层，与点击目标所在层级无关；先弹窗确认卷名再创建
    action: async () => {
      const initial = getNextVolumeName(plugin);
      if (!initial) return;
      const modal = new VolumeNameModal(plugin.app, initial, (name) => {
        void confirmVolumeName(plugin, modal, name);
      });
      modal.open();
    },
  });
  EDITOR_MENU_ITEMS.push({
    title: t("quickMenu.addToLore"),
    icon: "library",
    showIf: (editor) => editor.somethingSelected() && plugin.settings.loreDir !== "",
    submenu: (submenu, editor) => {
      const folder = plugin.app.vault.getAbstractFileByPath(plugin.settings.loreDir);
      if (!(folder instanceof TFolder)) return;
      // 二级菜单仅列直接子文件夹，点击后按选中文本命名创建设定文件
      for (const child of folder.children) {
        if (!(child instanceof TFolder)) continue;
        submenu.addItem((menuItem) =>
          menuItem
            .setTitle(child.name)
            .setIcon("folder")
            .onClick(() => void createLoreNote(plugin, editor.getSelection(), child.path)),
        );
      }
    },
  });
  EDITOR_MENU_ITEMS.push({
    title: t("quickMenu.syncLoreLinks"),
    icon: "link",
    showIf: (editor) => !editor.somethingSelected() && plugin.settings.loreDir !== "",
    action: async (editor) => {
      const { text, count } = wrapLoreNames(editor.getValue(), getLoreNames(plugin));
      if (count > 0) {
        editor.setValue(text);
        new Notice(t("quickMenu.syncResult", { count }));
      }
    },
  });
  EDITOR_MENU_ITEMS.push({
    title: t("quickMenu.clearLoreLinks"),
    icon: "unlink",
    showIf: (editor) => !editor.somethingSelected() && plugin.settings.loreDir !== "",
    action: async (editor) => {
      const { text, count } = unwrapLoreNames(editor.getValue(), getLoreNames(plugin));
      if (count > 0) {
        editor.setValue(text);
        new Notice(t("quickMenu.clearResult", { count }));
      }
    },
  });
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu, file, source) => {
      let separated = false;
      for (const item of FILE_MENU_ITEMS) {
        if (item.showIf && !item.showIf(file, source)) continue;
        // 首个通过 showIf 的条目前插分隔符，与 Obsidian 默认菜单项分割；无条目时不添加
        if (!separated) {
          menu.addSeparator();
          separated = true;
        }
        menu.addItem((menuItem) =>
          menuItem
            .setTitle(item.title)
            .setIcon(item.icon ?? "file")
            .onClick(() => void item.action(file, source)),
        );
      }
    }),
  );
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu, editor, info) => {
      let separated = false;
      for (const item of EDITOR_MENU_ITEMS) {
        if (item.showIf && !item.showIf(editor, info)) continue;
        // 首个通过 showIf 的条目前插分隔符，与 Obsidian 默认菜单项分割；无条目时不添加
        if (!separated) {
          menu.addSeparator();
          separated = true;
        }
        menu.addItem((menuItem) => {
          menuItem.setTitle(item.title).setIcon(item.icon ?? "file");
          // 二级菜单项与点击项二选一：有 submenu 时悬停展开，否则点击触发 action
          const { action, submenu } = item;
          if (submenu) {
            // setSubmenu() 立即创建并返回二级菜单实例，随即填充条目；悬停时由 Obsidian 展示
            submenu(menuItem.setSubmenu(), editor, info);
          } else if (action) {
            menuItem.onClick(() => void action(editor, info));
          }
        });
      }
    }),
  );
  return () => {
    // 清空注册条目，插件重载时 init 再次 push 不会产生重复菜单项
    FILE_MENU_ITEMS.length = 0;
    EDITOR_MENU_ITEMS.length = 0;
  };
}
