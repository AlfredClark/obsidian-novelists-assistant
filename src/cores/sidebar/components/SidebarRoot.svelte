<script lang="ts">
  import { subscribeLanguageChange, t, type TranslationKey } from "../../i18n";
  import type { SidebarPage } from "../types";
  import PageOne from "./PageOne.svelte";
  import PageTwo from "./PageTwo.svelte";
  import PageThree from "./PageThree.svelte";

  /** 当前激活页面；tab 点击切换，缺省展示第一个页面 */
  let activePage = $state<SidebarPage>("page1");

  /** 语言版本标记；语言切换时递增，{#key} 强制重建内容块使模板中的 t() 重新求值 */
  let langTick = $state(0);

  // 订阅语言变更并在卸载时自动退订；t() 为普通函数调用，Svelte 无法追踪其依赖，须经 #key 重建
  $effect(() => {
    return subscribeLanguageChange(() => (langTick += 1));
  });

  /** tab 配置列表；新增页面时在此追加条目并在下方 {#if} 分支补充组件 */
  const TABS: Array<{ id: SidebarPage; label: TranslationKey }> = [
    { id: "page1", label: "sidebar.tabs.page1" },
    { id: "page2", label: "sidebar.tabs.page2" },
    { id: "page3", label: "sidebar.tabs.page3" },
  ];
</script>

{#key langTick}
  <div class="novel-sidebar">
    <nav class="novel-sidebar-tabs">
      {#each TABS as tab (tab.id)}
        <button
          type="button"
          class="novel-sidebar-tab"
          class:active={activePage === tab.id}
          onclick={() => (activePage = tab.id)}
        >
          {t(tab.label)}
        </button>
      {/each}
    </nav>
    <div class="novel-sidebar-content">
      {#if activePage === "page1"}
        <PageOne />
      {:else if activePage === "page2"}
        <PageTwo />
      {:else}
        <PageThree />
      {/if}
    </div>
  </div>
{/key}

<style lang="css">
  .novel-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .novel-sidebar-tabs {
    display: flex;
    gap: 4px;
    padding: 8px;
  }

  .novel-sidebar-tab {
    flex: 1;
    padding: 6px 8px;
    border: none;
    border-radius: var(--radius-s);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--font-ui-small);
    cursor: pointer;
  }

  .novel-sidebar-tab:hover {
    background: var(--background-modifier-hover);
  }

  .novel-sidebar-tab.active {
    background: var(--background-modifier-active-hover);
    color: var(--text-normal);
  }

  .novel-sidebar-content {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
  }
</style>
