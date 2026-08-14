import { EditorSelection, EditorState, Text } from "@codemirror/state";
import type { Extension, Transaction, TransactionSpec } from "@codemirror/state";
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { PUNCT_PAIRS } from "./types";
import type NovelistsAssistantPlugin from "../../main";

/** 左标点 → 右标点映射，配对插入与退格删对共用 */
const OPEN_TO_CLOSE = new Map(PUNCT_PAIRS);

/** 全部右标点集合，跳过右标点查表用 */
const CLOSE_MARKS = new Set(PUNCT_PAIRS.map(([, close]) => close));

/** 不补齐的上下文：代码块/公式/frontmatter 等，token 类由 Obsidian 的 markdown 语言注入 */
const IGNORED_CONTEXT = /frontmatter|code|math|templater|hashtag/;

/**
 * 候选替换修复时间窗的兜底默认值（毫秒）：fcitx5 等输入法的标点候选流程会先提交默认左标点
 * （被自动补齐），再在光标处提交选中的候选；仅当设置项 punctuationRepairInterval 为非法值时使用
 */
const DEFAULT_REPAIR_WINDOW_MS = 3000;

/** 最近自动补齐的空对记录（open 位置为创建时的文档坐标），供 IME 候选替换修复判断 */
interface RecentPair {
  openPos: number; // 左标点在文档中的位置
  open: string; // 左标点
  close: string; // 右标点
  time: number; // 创建时间戳
}

/** 最近创建的空对；修剪窗口内数量有限，随创建/查找修剪防无限增长 */
const RECENT_PAIRS: RecentPair[] = [];

/**
 * 读取候选替换修复时间窗：设置值为非有限或负数（data.json 脏值）时回退默认值；
 * 0 表示禁用修复（findRecentPair 恒不命中，记录随之被修剪清空）
 * @param plugin 插件实例
 */
function getRepairWindow(plugin: NovelistsAssistantPlugin): number {
  const value = plugin.settings.punctuationRepairInterval;
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_REPAIR_WINDOW_MS;
}

/** 移除超出修复时间窗的记录 */
function pruneRecentPairs(windowMs: number): void {
  const now = Date.now();
  for (let i = RECENT_PAIRS.length - 1; i >= 0; i--) {
    const pair = RECENT_PAIRS[i];
    if (pair === undefined) continue;
    if (now - pair.time > windowMs) {
      RECENT_PAIRS.splice(i, 1);
    }
  }
}

/** 登记新创建的空对 */
function recordPair(openPos: number, open: string, close: string, windowMs: number): void {
  pruneRecentPairs(windowMs);
  RECENT_PAIRS.push({ openPos, open, close, time: Date.now() });
}

/**
 * 查找 openPos 处仍为原样空对（左+右紧邻，未被输入内容或移动破坏）的最近记录，命中即消费。
 * 位置与字符双重校验，保证只命中记录自身对应的空对；windowMs 为 0 时修复禁用恒不命中。
 * @param state 改动前状态，保证空对内容与坐标一致
 * @param openPos 空对左标点的文档位置
 * @param windowMs 修复时间窗（毫秒）
 */
function findRecentPair(state: EditorState, openPos: number, windowMs: number): boolean {
  pruneRecentPairs(windowMs);
  if (windowMs === 0) return false;
  for (let i = RECENT_PAIRS.length - 1; i >= 0; i--) {
    const pair = RECENT_PAIRS[i];
    if (pair === undefined) continue;
    if (pair.openPos !== openPos) continue;
    if (state.doc.sliceString(openPos, openPos + 1) !== pair.open) continue;
    if (state.doc.sliceString(openPos + 1, openPos + 2) !== pair.close) continue;
    RECENT_PAIRS.splice(i, 1);
    return true;
  }
  return false;
}

/** 判断位置是否位于不补齐的上下文；startState 保证语法树与改动前文档一致 */
function isIgnoredContext(state: EditorState, pos: number): boolean {
  const node = syntaxTree(state).resolveInner(pos, 1);
  const props = node.type.prop(tokenClassNodeProp);
  return props !== undefined && IGNORED_CONTEXT.test(props);
}

/** 文本输入事务的逐改动区间分析结果：改动按原始位置改写，光标按改动后的新位置计算 */
interface ChangeAnalysis {
  /** 改写后的改动序列，未命中的区间原样保留 */
  changes: TransactionSpec["changes"];
  /** 各改动区间对应的新光标位置 */
  heads: number[];
  /** 是否有区间被改写 */
  modified: boolean;
}

/** 分析文本输入事务：配对插入/选区包裹/跳过右标点，未命中区间保持原样 */
function analyzeTyping(tr: Transaction, windowMs: number): ChangeAnalysis {
  const changes: { from: number; to: number; insert: string | Text }[] = [];
  const heads: number[] = [];
  let modified = false;
  tr.changes.iterChanges((from, to, fromNew, toNew, inserted) => {
    const text = inserted.sliceString(0);
    // 多字符插入（粘贴/内置 closeBrackets 已配好对等）不处理
    if (text.length !== 1) {
      changes.push({ from, to, insert: inserted });
      heads.push(toNew);
      return;
    }
    // 代码块/公式等上下文内不补齐
    if (isIgnoredContext(tr.startState, from)) {
      changes.push({ from, to, insert: inserted });
      heads.push(toNew);
      return;
    }
    const close = OPEN_TO_CLOSE.get(text);
    if (close !== undefined) {
      // IME 候选替换修复：fcitx5 标点候选流程先提交默认左标点（被补齐）再在光标处提交选中候选，
      // 光标紧邻最近空对的左标点插入视为替换——整对替换为新标点对（【】+「 → 「」）
      if (from === to && findRecentPair(tr.startState, from - 1, windowMs)) {
        changes.push({ from: from - 1, to: from + 1, insert: text + close });
        heads.push(fromNew + 1);
        recordPair(fromNew, text, close, windowMs);
        modified = true;
        return;
      }
      // 候选替换的替换型几何：改动区间恰好覆盖空对左标点（部分输入法以替换方式提交候选）
      if (to - from === 1 && findRecentPair(tr.startState, from, windowMs)) {
        changes.push({ from, to: from + 2, insert: text + close });
        heads.push(fromNew + 1);
        recordPair(fromNew, text, close, windowMs);
        modified = true;
        return;
      }
      // 配对插入：无选区时插入「左+右」光标居中，有选区时包裹选区光标在闭合符前
      const selected = tr.startState.sliceDoc(from, to);
      changes.push({ from, to, insert: text + selected + close });
      heads.push(fromNew + 1 + (to - from));
      if (from === to) {
        recordPair(fromNew, text, close, windowMs);
      }
      modified = true;
      return;
    }
    // 跳过右标点：光标后紧邻同字符时不重复插入，仅前移光标
    if (from === to && CLOSE_MARKS.has(text) && tr.startState.doc.sliceString(from, from + 1) === text) {
      changes.push({ from, to, insert: "" });
      heads.push(fromNew + 1);
      modified = true;
      return;
    }
    changes.push({ from, to, insert: inserted });
    heads.push(toNew);
  });
  return { changes, heads, modified };
}

/**
 * 构建标点补齐编辑器扩展：事务过滤器改写文本输入与退格事务。
 * 开关经闭包实时读取 plugin.settings，切换即时生效无需重注册；
 * IME 组合输入提交的字符同样是 input.type 事务，中文标点天然命中。
 * @param plugin 插件实例
 */
export function createPunctuationExtension(plugin: NovelistsAssistantPlugin): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!plugin.settings.punctuationComplete) return tr;
    // 退格且光标位于空对中间时一次删除整对（忽略上下文：手动键入的对删除是预期行为）
    if (tr.isUserEvent("delete.backward") && tr.startState.selection.main.empty) {
      const pos = tr.startState.selection.main.head;
      const open = tr.startState.doc.sliceString(pos - 1, pos);
      const close = tr.startState.doc.sliceString(pos, pos + 1);
      if (OPEN_TO_CLOSE.get(open) === close) {
        return {
          changes: { from: pos - 1, to: pos + 1, insert: "" },
          selection: EditorSelection.single(pos - 1),
        };
      }
      return tr;
    }
    // 仅处理单字符文本输入，其余（粘贴/删除/程序性变更）原样放行
    if (!tr.isUserEvent("input.type") || !tr.docChanged) return tr;
    const { changes, heads, modified } = analyzeTyping(tr, getRepairWindow(plugin));
    if (!modified) return tr;
    return {
      changes,
      selection: EditorSelection.create(heads.map((head) => EditorSelection.cursor(head))),
    };
  });
}

/**
 * 初始化标点补齐功能：注册 CM6 编辑器扩展。
 * 扩展生命周期由 Obsidian 管理（卸载自动回收），无需手动清理。
 * @param plugin 插件实例
 */
export function initPunctuation(plugin: NovelistsAssistantPlugin): () => void {
  plugin.registerEditorExtension(createPunctuationExtension(plugin));
  return () => undefined;
}
