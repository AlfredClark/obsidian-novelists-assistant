import { Modal } from "obsidian";
import type { App } from "obsidian";
import { t } from "../../../cores/i18n";

/**
 * 新建分卷名弹窗：输入框预填自动编号并把光标置于末尾，方便直接追加卷名。
 * 弹窗位于 Modal 容器（文件树之外），空格等按键天然不受文件树监听影响。
 * 纯展示组件，落盘逻辑由调用方经回调传入。
 */
export class VolumeNameModal extends Modal {
  private initialName: string;
  private onConfirm: (name: string) => void;

  /**
   * @param app Obsidian 应用实例
   * @param initialName 预填的自动卷名
   * @param onConfirm 确认回调，调用方校验落盘；成功时由调用方关闭弹窗
   */
  constructor(app: App, initialName: string, onConfirm: (name: string) => void) {
    super(app);
    this.initialName = initialName;
    this.onConfirm = onConfirm;
  }

  /** 渲染输入框与确认/取消按钮 */
  onOpen(): void {
    this.setTitle(t("quickMenu.volumeNameTitle"));
    const input = this.contentEl.createEl("input", {
      cls: "novel-volume-name-input",
      type: "text",
      value: this.initialName,
    });
    input.spellcheck = false;
    input.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.onConfirm(input.value);
      }
    });
    const actions = this.contentEl.createDiv({ cls: "novel-volume-actions" });
    actions.createEl("button", { text: t("quickMenu.volumeNameCancel") }).addEventListener("click", () => this.close());
    actions
      .createEl("button", { cls: "mod-cta", text: t("quickMenu.volumeNameConfirm") })
      .addEventListener("click", () => this.onConfirm(input.value));
    input.focus();
    // 光标置于末尾：保留自动编号，直接追加卷名（如 "第1卷 风起"）
    input.setSelectionRange(input.value.length, input.value.length);
  }

  /** 关闭时清空内容，防重复打开残留 */
  onClose(): void {
    this.contentEl.empty();
  }
}
