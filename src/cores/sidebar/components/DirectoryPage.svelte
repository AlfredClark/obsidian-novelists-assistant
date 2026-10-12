<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../../i18n";
  import { buildDirectoryModel, filterDirectoryModel } from "../cores";
  import { SIDEBAR_DIR_KEYS } from "../types";
  import type { DirectoryPageProps, DirModel, SidebarPage } from "../types";

  /** 所属页面、搜索词与打开回调；目录由页面经 SIDEBAR_DIR_KEYS 解析 */
  let { plugin, page, query, onopen }: DirectoryPageProps = $props();

  /** 目录模型；初建与页面切换经 effect 重建，vault 事件经订阅重建 */
  let model = $state<DirModel | null>(null);

  /** 过滤后的模型；空查询返回原模型 */
  let filtered = $derived(model ? filterDirectoryModel(model, query) : null);

  /** 是否处于搜索态；搜索无命中时显示无匹配而非空目录 */
  let filtering = $derived(query.trim() !== "");

  /** 重建模型：读取最新设置指向并重新遍历，全程内存操作 */
  function refresh(target: SidebarPage): void {
    model = buildDirectoryModel(plugin, plugin.settings[SIDEBAR_DIR_KEYS[target]]);
  }

  // 订阅结构变更并在卸载时退订；不用 plugin.registerEvent——语言切换 #key 重建会叠加注册
  onMount(() => {
    const createRef = plugin.app.vault.on("create", () => refresh(page));
    const deleteRef = plugin.app.vault.on("delete", () => refresh(page));
    const renameRef = plugin.app.vault.on("rename", () => refresh(page));
    const layoutRef = plugin.app.workspace.on("layout-change", () => refresh(page));
    return () => {
      plugin.app.vault.offref(createRef);
      plugin.app.vault.offref(deleteRef);
      plugin.app.vault.offref(renameRef);
      plugin.app.workspace.offref(layoutRef);
    };
  });

  // 页面切换重建模型；activePage 在 #key 块外保留，返回时不丢页
  $effect(() => {
    refresh(page);
  });
</script>

{#if model && filtered}
  {#if !model.configured}
    <div class="novel-side-empty">{t("sidebar.unconfigured")}</div>
  {:else if !model.exists}
    <div class="novel-side-empty">{t("sidebar.missing")}</div>
  {:else if filtered.groups.length === 0 && filtered.rootFiles.length === 0}
    <div class="novel-side-empty">{filtering ? t("sidebar.noMatch") : t("sidebar.empty")}</div>
  {:else}
    {#each filtered.groups as group (group.folder.path)}
      <details class="novel-side-group" open>
        <summary class="novel-side-group-title">{group.folder.name}</summary>
        {#if group.files.length === 0}
          <div class="novel-side-empty-sub">{t("sidebar.groupEmpty")}</div>
        {:else}
          {#each group.files as file (file.path)}
            <button type="button" class="novel-side-file" onclick={() => onopen(file)}>
              {file.basename}
            </button>
          {/each}
        {/if}
      </details>
    {/each}
    {#if filtered.rootFiles.length > 0}
      <div class="novel-side-ungrouped-title">{t("sidebar.ungrouped")}</div>
      {#each filtered.rootFiles as file (file.path)}
        <button type="button" class="novel-side-file" onclick={() => onopen(file)}>
          {file.basename}
        </button>
      {/each}
    {/if}
  {/if}
{/if}

<style>
  .novel-side-empty {
    padding: 24px 12px;
    color: var(--text-muted);
    text-align: center;
    font-size: var(--font-ui-small);
  }

  .novel-side-group {
    margin-bottom: 4px;
  }

  .novel-side-group-title {
    padding: 6px 8px;
    border-radius: var(--radius-s);
    color: var(--text-normal);
    font-weight: 600;
    font-size: var(--font-ui-small);
    cursor: pointer;
  }

  .novel-side-group-title:hover {
    background: var(--background-modifier-hover);
  }

  .novel-side-empty-sub {
    padding: 4px 8px 4px 20px;
    color: var(--text-faint);
    font-size: var(--font-ui-smaller);
  }

  .novel-side-ungrouped-title {
    margin-top: 8px;
    padding: 6px 8px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: var(--font-ui-small);
  }

  .novel-side-file {
    display: block;
    width: 100%;
    margin: 0;
    padding: 5px 8px 5px 20px;
    border: none;
    border-radius: var(--radius-s);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--font-ui-small);
    text-align: left;
    cursor: pointer;
  }

  .novel-side-file:hover {
    background: var(--background-modifier-hover);
    color: var(--text-normal);
  }
</style>
