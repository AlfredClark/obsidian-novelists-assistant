import { BaseComponent } from "obsidian";
import { mount, Component, unmount } from "svelte";

/**
 * 将 Svelte 组件桥接到 Obsidian 设置 UI
 *
 * 包装为 Obsidian BaseComponent，可传入 Setting.addComponent 使用。
 * 自动处理 mount / unmount 生命周期。
 */
export class ObsidianSvelteComponent extends BaseComponent {
  /** Svelte 组件实例引用 */
  instance: Record<string, unknown>;
  /** 组件禁用状态 */
  disabled = false;

  /**
   * @param el - 挂载目标容器元素
   * @param component - Svelte 组件构造函数
   * @param props - 传给组件的属性
   */
  constructor(el: HTMLElement, component: Component, props?: Record<string, unknown>) {
    super();
    // 将 Svelte 组件挂载到指定 DOM 节点
    this.instance = mount(component, { target: el, props });
  }

  /** 销毁时卸载 Svelte 组件 */
  destroy(): void {
    void unmount(this.instance);
  }

  /** 链式调用：实例化后立即执行回调 */
  then(cb: (component: this) => unknown): this {
    cb(this);
    return this;
  }

  /** 设置禁用状态 */
  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    return this;
  }
}

/**
 * 通过 HTML 标签名与选项创建原生元素，包装为 BaseComponent
 */
export class HTMLComponent extends BaseComponent {
  /**
   * @param el - 父容器元素
   * @param tag - 要创建的 HTML 标签名
   * @param option - 元素属性配置
   */
  constructor(el: HTMLElement, tag: keyof HTMLElementTagNameMap, option: DomElementInfo) {
    super();
    // 在容器中创建指定标签的原生元素
    el.createEl(tag, option);
  }
}
