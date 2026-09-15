import { Notice, TFile } from "obsidian";
import type { TAbstractFile } from "obsidian";
import { t } from "../../cores/i18n";
import { stripFrontmatter, stripMarkdown } from "../../utils/markdown";
import { isInsideOrSelf } from "../../utils/path";
import type NovelistsAssistantPlugin from "../../main";
import { EXPORT_EXTENSION, EXPORT_MIME_TYPE } from "./types";
import type { ExportPayload } from "./types";

/**
 * 生成导出文本：按设置决定是否保留 Markdown 标记，再统一行尾、按需前置标题、处理空行并裁剪首尾空白。
 * 顺序有依赖：标题在空行处理之前插入，「清除空行」开启时标题后的分隔空行一并消失，全程无空行。
 * 首行缩进属排版层的视觉效果，不写入纯文本。
 */
function buildExportText(plugin: NovelistsAssistantPlugin, raw: string, basename: string): string {
  const { exportClearBlankLines, exportKeepMarkup, exportTitle } = plugin.settings;
  // 保留标记仅剔除文件头 frontmatter，其余标记原样输出
  let text = exportKeepMarkup ? stripFrontmatter(raw) : stripMarkdown(raw);
  // 行尾空白剔除，顺带把 CRLF 归一为 LF
  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
  // 同名跳过：首个非空行经 stripMarkdown 归一（吃掉行首 # / - 等标记）后与文件名比较，防 txt 开头出现两行相同标题
  const firstLine = text.split("\n").find((line) => line !== "") ?? "";
  if (exportTitle && stripMarkdown(firstLine).trim() !== basename) {
    text = `${basename}\n\n${text}`;
  }
  text = exportClearBlankLines
    ? text
        .split("\n")
        .filter((line) => line !== "")
        .join("\n")
    : text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * 读取正文并转换为导出载荷：cachedRead 复用解析缓存，避免为一次性导出强制重新读盘。
 * 清洗后无正文（如仅含 frontmatter）时返回 null，由调用方提示。
 */
async function buildExportPayload(plugin: NovelistsAssistantPlugin, file: TFile): Promise<ExportPayload | null> {
  const text = buildExportText(plugin, await plugin.app.vault.cachedRead(file), file.basename);
  if (text === "") return null;
  return { name: `${file.basename}${EXPORT_EXTENSION}`, text };
}

/**
 * 触发浏览器下载流程保存 txt：Electron 未设置保存路径时弹出系统「另存为」对话框，
 * 由用户选择保存位置与文件名；取消对话框无副作用，故不追加结果提示。
 * 对象 URL 在点击后立即撤销释放内存，下载已由浏览器接管，不影响进行中的保存。
 */
function downloadTextFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: EXPORT_MIME_TYPE }));
  const link = document.body.createEl("a", { href: url });
  link.download = name;
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * 导出到剪切板：剔除 Markdown 标识后写入系统剪切板。
 * 剪切板 API 可能不可用（权限/焦点），失败提示而非静默。
 * @param plugin 插件实例
 * @param file 目标正文文件
 */
export async function exportToClipboard(plugin: NovelistsAssistantPlugin, file: TFile): Promise<void> {
  const payload = await buildExportPayload(plugin, file);
  if (!payload) {
    new Notice(t("export.empty"), 5000);
    return;
  }
  try {
    await navigator.clipboard.writeText(payload.text);
    new Notice(t("export.copied", { name: file.basename }));
  } catch {
    new Notice(t("export.copyFailed"), 5000);
  }
}

/**
 * 导出为 txt 文件：剔除 Markdown 标识后经系统保存对话框落盘，默认文件名为原文件名加 .txt 扩展名。
 * @param plugin 插件实例
 * @param file 目标正文文件
 */
export async function exportToTxt(plugin: NovelistsAssistantPlugin, file: TFile): Promise<void> {
  const payload = await buildExportPayload(plugin, file);
  if (!payload) {
    new Notice(t("export.empty"), 5000);
    return;
  }
  downloadTextFile(payload.name, payload.text);
}

/** 解析导出目标：仅正文目录内的 md 文件可导出，其余返回 null（直接返回收窄结果，免去回调内的类型收窄依赖） */
function resolveExportTarget(plugin: NovelistsAssistantPlugin, file: TAbstractFile): TFile | null {
  const novelDir = plugin.settings.novelDir;
  if (novelDir === "") return null;
  if (!(file instanceof TFile) || file.extension !== "md") return null;
  return isInsideOrSelf(file.path, novelDir) ? file : null;
}

/**
 * 初始化导出功能：在文件右键菜单注册「导出到剪切板」「导出为 txt 文件」。
 * 菜单项在 init 内构建而非模块级常量，保证 t() 在 i18n 初始化后求值；
 * file-menu 经 plugin.registerEvent 注册，Obsidian 卸载自动回收，无 DOM 或样式残留。
 * @param plugin 插件实例
 * @returns 清理函数，由 features 聚合层在卸载时回收
 */
export function initExport(plugin: NovelistsAssistantPlugin): () => void {
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu, file) => {
      const target = resolveExportTarget(plugin, file);
      if (!target) return;
      // 首个条目前插分隔符，与 Obsidian 默认菜单项分割（与 quick-menu 同款做法）
      menu.addSeparator();
      menu.addItem((item) =>
        item
          .setTitle(t("export.toClipboard"))
          .setIcon("clipboard-copy")
          .onClick(() => void exportToClipboard(plugin, target)),
      );
      menu.addItem((item) =>
        item
          .setTitle(t("export.toTxt"))
          .setIcon("file-text")
          .onClick(() => void exportToTxt(plugin, target)),
      );
    }),
  );
  // 事件由 Obsidian 卸载自动回收，无残留资源需要清理
  return () => {};
}
