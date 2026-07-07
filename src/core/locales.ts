import { getLanguage } from "obsidian";
import { ObsidianPlugin } from "./types";
import { setLocale, toLocale, baseLocale } from "../i18n/paraglide/runtime";

export async function registerLocales(plugin: ObsidianPlugin, reload: boolean = false) {
  if (plugin.settings.locale === "app") {
    await setLocale(toLocale(getLanguage()) ?? baseLocale, { reload });
  } else {
    await setLocale(toLocale(plugin.settings.locale) ?? baseLocale, { reload });
  }
}
