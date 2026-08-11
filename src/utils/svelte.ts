import { mount, unmount } from "svelte";
import type { Component, ComponentProps } from "svelte";

/** 组件挂载到容器后的句柄，统一组件的回收入口 */
export interface MountedComponent<T = unknown> {
  /** Svelte 组件实例，组件导出（如 $export）经此访问 */
  instance: T;
  /** 卸载组件并清空挂载容器 */
  destroy(): void;
}

/**
 * 将 Svelte 组件挂载到目标容器（如视图的 contentEl）。
 * 先清空容器再挂载，保证重复打开时不会累积 DOM。
 * 组件样式经 css: "injected" 注入 <head>，卸载后样式标签残留，
 * 但编译期 class 哈希保证样式隔离，不影响其他 UI。
 * 实例类型放宽为 unknown：mount 的导出类型无法从泛型 Component 精确推导，
 * 需要访问组件导出时在调用侧按需收窄。
 * @param target 挂载目标元素
 * @param component Svelte 组件类
 * @param props 传给组件的属性；精确类型由 svelte-check 校验
 * @returns 挂载句柄，destroy() 卸载组件并清空容器
 */
export function mountComponent<T extends Component>(
  target: HTMLElement,
  component: T,
  props?: ComponentProps<T>,
): MountedComponent {
  target.empty();
  const instance = mount(component, { target, props });
  return {
    instance,
    destroy: () => {
      // unmount 类型为 void | Promise<void>，未开 outro 时同步销毁，void 标记显式忽略
      void unmount(instance);
      target.empty();
    },
  };
}
