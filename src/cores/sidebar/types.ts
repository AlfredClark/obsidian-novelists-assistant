/** 侧边栏视图类型标识，registerView 与 leaf.setViewState 共用 */
export const SIDEBAR_VIEW_TYPE = "novelists-assistant-sidebar";

/** 侧边栏页面标识；新增页面时扩展联合类型并在组件切换处追加分支 */
export type SidebarPage = "page1" | "page2" | "page3";
