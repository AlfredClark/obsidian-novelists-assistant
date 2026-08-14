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
function analyzeTyping(tr: Transaction): ChangeAnalysis {
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
      // 配对插入：无选区时插入「左+右」光标居中，有选区时包裹选区光标在闭合符前
      const selected = tr.startState.sliceDoc(from, to);
      changes.push({ from, to, insert: text + selected + close });
      heads.push(fromNew + 1 + (to - from));
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
    const { changes, heads, modified } = analyzeTyping(tr);
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
