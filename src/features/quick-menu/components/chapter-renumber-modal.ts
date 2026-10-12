import { Modal } from "obsidian";
import type { App } from "obsidian";
import { t } from "../../../cores/i18n";
import type { ChapterRenumberPlan } from "../types";

/**
 * 章节重编号确认弹窗：展示将改/免改/跳过计数与旧→新对照清单，确认后执行。
 * 纯展示组件，执行逻辑由调用方（settings 层）经回调传入。
 */
export class ChapterRenumberModal extends Modal {
  private plan: ChapterRenumberPlan;
  private onConfirm: () => void;

  /**
   * @param app Obsidian 应用实例
   * @param plan planChapterRenumber 推演的方案
   * @param onConfirm 确认回调，调用方执行改名并反馈
   */
  constructor(app: App, plan: ChapterRenumberPlan, onConfirm: () => void) {
    super(app);
    this.plan = plan;
    this.onConfirm = onConfirm;
  }

  /** 渲染标题、计数、对照清单（超长滚动）与确认/取消按钮 */
  onOpen(): void {
    const { plan } = this;
    this.setTitle(t("quickMenu.renumberTitle"));
    this.contentEl.createEl("p", {
      text: t("quickMenu.renumberSummary", {
        changed: plan.changes.length,
        unchanged: plan.unchanged,
        skipped: plan.skipped,
      }),
    });
    const list = this.contentEl.createDiv({ cls: "novel-renumber-list" });
    for (const change of plan.changes) {
      list.createDiv({
        cls: "novel-renumber-item",
        text: `${change.file.basename} → ${change.to.split("/").pop() ?? ""}`,
      });
    }
    const actions = this.contentEl.createDiv({ cls: "novel-renumber-actions" });
    actions.createEl("button", { text: t("quickMenu.renumberCancel") }).addEventListener("click", () => this.close());
    actions.createEl("button", { cls: "mod-cta", text: t("quickMenu.renumberConfirm") }).addEventListener("click", () => {
      this.close();
      this.onConfirm();
    });
  }

  /** 关闭时清空内容，防重复打开残留 */
  onClose(): void {
    this.contentEl.empty();
  }
}
