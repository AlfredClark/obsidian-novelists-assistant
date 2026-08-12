import type { Menu } from "obsidian";

/** setSubmenu 为未文档化 API（官方类型包未声明）：无参调用即创建并返回二级菜单实例（meta-bind/editing-toolbar 等主流插件实证） */
declare module "obsidian" {
  interface MenuItem {
    setSubmenu(): Menu;
  }
}
