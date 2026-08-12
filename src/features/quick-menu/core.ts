import { TFile, TFolder } from "obsidian";
import Nzhcn from "nzh/cn";
import { t } from "../../cores/i18n";
import type { ChapterNumberStyle } from "../../cores/settings";
import type NovelistsAssistantPlugin from "../../main";
import type { EditorMenuItem, FileMenuItem } from "./types";

/** 文件菜单项；后续新增菜单项在此追加条目 */
const FILE_MENU_ITEMS: FileMenuItem[] = [];

/** 编辑菜单项；后续新增菜单项在此追加条目 */
const EDITOR_MENU_ITEMS: EditorMenuItem[] = [];

/** 中文小写数字字符集，与 nzh decodeS 解码能力对齐 */
const CN_LOWER_CHARS = "零一二三四五六七八九十百千万";

/** 中文大写数字字符集，与 nzh decodeB 解码能力对齐 */
const CN_UPPER_CHARS = "零壹贰叁肆伍陆柒捌玖拾佰仟万亿";

/** 判断路径是否位于目录内（含目录自身）；归一化尾斜杠防手输 "目录/" 失效，空目录前缀 "/" 恒不匹配 */
function isInsideOrSelf(filePath: string, dirPath: string): boolean {
  const dir = dirPath.replace(/\/+$/, "");
  return filePath === dir || filePath.startsWith(dir + "/");
}

/** 编号样式类型守卫：data.json 脏值回退默认 digit，避免分支落入未定义行为 */
function isChapterNumberStyle(style: unknown): style is ChapterNumberStyle {
  return style === "digit" || style === "chineseLower" || style === "chineseUpper";
}

/**
 * 按章节格式与编号样式构建章节名匹配正则：转义格式后把 # 占位替换为对应样式的数字捕获组，锚定开头。
 * 格式不含 # 时按字面整体匹配（编号从 1 开始）。
 */
function buildChapterRegex(format: string, style: ChapterNumberStyle): RegExp {
  const pattern = style === "digit" ? "(\\d+)" : `([${style === "chineseLower" ? CN_LOWER_CHARS : CN_UPPER_CHARS}]+)`;
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

/**
 * 新建下一章：目标为文件时在其所在目录创建，目标为文件夹时在其内部创建。
 * 遍历目标目录中符合章节格式与编号样式的文件取最大编号 +1，文件名冲突时继续递增；
 * 创建空文件后在当前标签页打开。
 * @param plugin 插件实例
 * @param target 文件菜单点击目标（文件或文件夹）
 */
export async function createNextChapter(plugin: NovelistsAssistantPlugin, target: TFile | TFolder): Promise<void> {
  const { chapterFormat, chapterNumberStyle } = plugin.settings;
  // 设置层已强制格式含 #；此处兜底 data.json 脏值，防无编号命名与冲突递增死循环
  if (!chapterFormat.includes("#")) return;
  const style = isChapterNumberStyle(chapterNumberStyle) ? chapterNumberStyle : "digit";
  const dir = target instanceof TFile ? (target.parent?.path ?? "") : target.path;
  if (dir === "") return;
  const folder = plugin.app.vault.getAbstractFileByPath(dir);
  if (!(folder instanceof TFolder)) return;
  const regex = buildChapterRegex(chapterFormat, style);
  let max = 0;
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
        // 首个条目前插分隔符，与 Obsidian 默认菜单项分割；无条目时不添加
        if (!separated) {
          menu.addSeparator();
          separated = true;
        }
        menu.addItem((menuItem) =>
          menuItem
            .setTitle(item.title)
            .setIcon(item.icon ?? "file")
            .onClick(() => void item.action(editor, info)),
        );
      }
    }),
  );
  return () => {
    // 清空注册条目，插件重载时 init 再次 push 不会产生重复菜单项
    FILE_MENU_ITEMS.length = 0;
    EDITOR_MENU_ITEMS.length = 0;
  };
}
