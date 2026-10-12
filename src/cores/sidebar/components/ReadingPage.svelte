<script lang="ts">
  import { Component, MarkdownRenderer } from "obsidian";
  import { onMount } from "svelte";
  import { t } from "../../i18n";
  import type { ReadingPageProps } from "../types";

  /** 插件实例与待读文件；路径变化由调用方经 #key 重建本组件 */
  let { plugin, file }: ReadingPageProps = $props();

  /** 渲染容器；MarkdownRenderer 将预览 HTML 写入此节点 */
  let container: HTMLElement | undefined = $state();

  /** 文件被删除标记；删除后显示提示而非残留旧文 */
  let gone = $state(false);

  /** 渲染管线持有者；内嵌代码块等子渲染器经其管理生命周期 */
  let renderComponent: Component | null = null;

  /** 重渲染当前文件：清空后经 cachedRead 取磁盘内容渲染，sourcePath 保证相对资源解析 */
  async function render(): Promise<void> {
    if (!container) return;
    container.empty();
    renderComponent?.unload();
    const component = new Component();
    component.load();
    renderComponent = component;
    const text = await plugin.app.vault.cachedRead(file);
    await MarkdownRenderer.render(plugin.app, text, container, file.path, component);
  }

  // 订阅文件变更并在卸载时退订；路径比对防对象替换后失配
  onMount(() => {
    void render();
    const modifyRef = plugin.app.vault.on("modify", (changed) => {
      if (changed.path === file.path) void render();
    });
    const renameRef = plugin.app.vault.on("rename", (renamed) => {
      if (renamed === file) void render();
    });
    const deleteRef = plugin.app.vault.on("delete", (deleted) => {
      if (deleted.path === file.path) gone = true;
    });
    return () => {
      plugin.app.vault.offref(modifyRef);
      plugin.app.vault.offref(renameRef);
      plugin.app.vault.offref(deleteRef);
      renderComponent?.unload();
      renderComponent = null;
    };
  });
</script>

{#if gone}
  <div class="novel-side-empty">{t("sidebar.deleted")}</div>
{:else}
  <div class="novel-side-reading" bind:this={container}></div>
{/if}

<style>
  .novel-side-empty {
    padding: 24px 12px;
    color: var(--text-muted);
    text-align: center;
    font-size: var(--font-ui-small);
  }

  .novel-side-reading {
    line-height: 1.75;
    overflow-wrap: anywhere;
  }
</style>
