<script lang="ts">
  interface Props {
    locale?: string;
    onLocaleChange?: (locale: string) => void;
  }

  let { locale = "app", onLocaleChange = () => {} }: Props = $props();

  const options = [
    { value: "app", label: "跟随应用" },
    { value: "zh", label: "中文" },
    { value: "en", label: "English" },
  ];

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    onLocaleChange(target.value);
  }
</script>

<div class="locale-settings">
  <label for="locale-select"></label>
  <select id="locale-select" bind:value={locale} onchange={handleChange}>
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>

<style>
  .locale-settings {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
  }

  label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-normal);
  }

  select {
    padding: 6px 10px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: 14px;
  }
</style>
