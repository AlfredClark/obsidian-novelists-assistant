import { BaseComponent } from "obsidian";
import { mount, Component, unmount } from "svelte";

/**
 * 将 Svelte 组件桥接到 Obsidian 设置 UI
 *
 * 包装为 Obsidian BaseComponent，可传入 Setting.addComponent 使用。
 * 自动处理 mount / unmount 生命周期。
 */
export class ObsidianSvelteComponent extends BaseComponent {
  instance: Record<string, unknown>;
  disabled = false;

  constructor(el: HTMLElement, component: Component, props?: Record<string, unknown>) {
    super();
    this.instance = mount(component, { target: el, props });
  }

  destroy(): void {
    void unmount(this.instance);
  }

  then(cb: (component: this) => unknown): this {
    cb(this);
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    return this;
  }
}

/**
 * 通过 HTML 标签名与选项创建原生元素，包装为 BaseComponent
 */
export class HTMLComponent extends BaseComponent {
  constructor(el: HTMLElement, tag: keyof HTMLElementTagNameMap, option: DomElementInfo) {
    super();
    el.createEl(tag, option);
  }
}
