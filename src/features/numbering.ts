import { ObsidianPlugin } from "../core/types";
import { TFolder, TFile, Menu } from "obsidian";
import * as m from "../i18n/paraglide/messages";
import Nzh from "nzh";

const cn = Nzh.cn;

/** 根据编号格式和类型构建匹配已有章节文件的正则 */
function buildChapterRegex(format: string, type: string): RegExp {
  const placeholder = "\x00NUM\x00";
  const withPlaceholder = format.replace("{}", placeholder);
  const escaped = withPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let numPattern: string;
  switch (type) {
    case "cns":
      // 匹配中文小写数字（一二三四五六七八九十百千万亿）
      numPattern = "[一二三四五六七八九十百千万亿]+";
      break;
    case "cnb":
      // 匹配中文大写数字（壹贰叁肆伍陆柒捌玖拾佰仟万亿）
      numPattern = "[壹贰叁肆伍陆柒捌玖拾佰仟万亿]+";
      break;
    default:
      // 匹配阿拉伯数字
      numPattern = "\\d+";
  }
  const regexStr = escaped.replace(placeholder, `(${numPattern})`);
  return new RegExp(regexStr);
}

/** 将解析出的章节编号字符串转为数字 */
function parseChapterNumber(numStr: string, type: string): number {
  switch (type) {
    case "cns":
      return parseInt(cn.decodeS(numStr), 10);
    case "cnb":
      return parseInt(cn.decodeB(numStr), 10);
    default:
      return parseInt(numStr, 10);
  }
}

/** 将数字格式化为指定类型的编号字符串 */
function formatChapterNumber(num: number, type: string, fill: number): string {
  switch (type) {
    case "cns":
      return cn.encodeS(num);
    case "cnb":
      return cn.encodeB(num);
    default:
      return num.toString().padStart(fill, "0");
  }
}

/** 从格式和编号生成文件名 */
function buildChapterFilename(format: string, numStr: string): string {
  return format.replace("{}", numStr) + ".md";
}

/** 在目标文件夹中扫描已有章节，返回最大编号 */
async function findMaxChapterNumber(
  folder: TFolder,
  format: string,
  type: string,
): Promise<number> {
  const regex = buildChapterRegex(format, type);
  let max = 0;
  for (const child of folder.children) {
    if (child instanceof TFile && child.extension === "md") {
      const name = child.name.slice(0, -3);
      const match = name.match(regex);
      if (match && match[1]) {
        const num = parseChapterNumber(match[1], type);
        if (num > max) max = num;
      }
    }
  }
  return max;
}

/** 初始化编号功能：注册文件列表右键菜单"创建新章节" */
export async function initNumbering(plugin: ObsidianPlugin) {
  // 注册文件菜单事件
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu: Menu, file, source: string) => {
      if (source !== "file-explorer-context-menu") return;

      // 确定目标文件夹：右键文件夹使用自身，右键文件使用其父目录
      let targetFolder: TFolder | null = null;
      if (file instanceof TFolder) {
        targetFolder = file;
      } else if (file instanceof TFile) {
        targetFolder = file.parent;
      }
      if (!targetFolder) return;

      menu.addItem((item) => {
        menu.addSeparator();
        item
          .setTitle(m.numbering_create_chapter())
          .setIcon("plus")
          .onClick(async () => {
            const { numberingFormat, numberingType, numberingFill } = plugin.settings;
            // 扫描已有章节获取最大编号
            const maxNum = await findMaxChapterNumber(
              targetFolder!,
              numberingFormat,
              numberingType,
            );
            // 生成下一编号
            const nextNum = maxNum + 1;
            const numStr = formatChapterNumber(nextNum, numberingType, numberingFill);
            const filename = buildChapterFilename(numberingFormat, numStr);
            const filePath = `${targetFolder!.path}/${filename}`;

            // 文件已存在则跳过
            if (plugin.app.vault.getAbstractFileByPath(filePath)) return;

            // 创建新文件，写入章节标题
            const title = filename.slice(0, -3);
            await plugin.app.vault.create(filePath, `# ${title}\n`);
          });
      });
    }),
  );
}

/** 卸载编号功能：事件通过 plugin.registerEvent 自动清理 */
export function unloadNumbering() {
  // 无需手动清理
}
