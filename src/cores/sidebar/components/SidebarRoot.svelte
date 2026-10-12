<script lang="ts">
  import { subscribeLanguageChange, t } from "../../i18n";
  import type { SidebarPage, SidebarRootProps } from "../types";
  import type { TFile } from "obsidian";
  import DirectoryPage from "./DirectoryPage.svelte";
  import ReadingPage from "./ReadingPage.svelte";

  /** 插件实例；经视图挂载属性传入，向下透传给页面组件 */
  let { plugin }: SidebarRootProps = $props();

  /** 当前激活页面；tab 点击切换，阅读态返回后保留 */
  let activePage = $state<SidebarPage>("lore");

  /** 搜索关键词；#key 块外保留，语言切换不丢，tab 切换不清 */
  let query = $state("");

  /** 阅读中的文件；非空时进入阅读态并隐藏标签栏 */
  let readingFile = $state<TFile | null>(null);

  /** 语言版本标记；语言切换时递增，{#key} 强制重建内容块使模板中的 t() 重新求值 */
  let langTick = $state(0);

  // 订阅语言变更并在卸载时自动退订；t() 为普通函数调用，Svelte 无法追踪其依赖，须经 #key 重建
  $effect(() => {
    return subscribeLanguageChange(() => (langTick += 1));
  });

  /** tab 配置列表；label 懒求值，新增页面时在此追加条目并在下方 {#if} 分支补充组件 */
  const TABS: Array<{ id: SidebarPage; label: () => string }> = $derived([
    { id: "lore", label: () => t("sidebar.tabs.lore") },
    { id: "outline", label: () => t("sidebar.tabs.outline") },
  ]);
</script>

{#key langTick}
  <div class="novel-sidebar">
    {#if readingFile}
      <nav class="novel-sidebar-tabs">
        <button type="button" class="novel-sidebar-tab" onclick={() => (readingFile = null)}>
          ← {t("sidebar.back")}
        </button>
      </nav>
      <div class="novel-sidebar-content">
        {#key readingFile.path}
          <ReadingPage {plugin} file={readingFile} />
        {/key}
      </div>
    {:else}
      <nav class="novel-sidebar-tabs">
        {#each TABS as tab (tab.id)}
          <button
            type="button"
            class="novel-sidebar-tab"
            class:active={activePage === tab.id}
            onclick={() => (activePage = tab.id)}
          >
            {tab.label()}
          </button>
        {/each}
      </nav>
      <div class="novel-sidebar-search-row">
        <input
          type="text"
          class="novel-sidebar-search"
          style="display: block; box-sizing: border-box; width: 100%;"
          placeholder={t("sidebar.searchPlaceholder")}
          bind:value={query}
          spellcheck={false}
        />
      </div>
      <div class="novel-sidebar-content">
        {#if activePage === "lore"}
          <DirectoryPage {plugin} page="lore" {query} onopen={(file) => (readingFile = file)} />
        {:else}
          <DirectoryPage {plugin} page="outline" {query} onopen={(file) => (readingFile = file)} />
        {/if}
      </div>
    {/if}
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
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .novel-sidebar-tab {
    flex: 1;
    padding: 9px 8px;
    border: none;
    border-radius: var(--radius-s);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--font-ui-medium);
    cursor: pointer;
  }

  .novel-sidebar-tab:hover {
    background: var(--background-modifier-hover);
  }

  .novel-sidebar-tab.active {
    background: var(--background-modifier-active-hover);
    color: var(--text-normal);
  }

  .novel-sidebar-search-row {
    padding: 0 8px 8px;
  }

  /* 父类名 + 元素属性选择器 (0,2,1)，严格高于主题 input[type="text"] (0,1,1)，与注入顺序无关 */
  .novel-sidebar-search-row input[type="text"] {
    display: block;
    box-sizing: border-box;
    width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: var(--font-ui-small);
  }

  .novel-sidebar-search:focus {
    border-color: var(--interactive-accent);
    outline: none;
  }

  .novel-sidebar-search::placeholder {
    color: var(--text-faint);
  }

  .novel-sidebar-content {
    flex: 1;
    width: 100%;
    padding: 12px;
    overflow-y: auto;
  }
</style>
