import { Plugin } from "obsidian";
import { locales } from "../i18n/paraglide/runtime";

export type Settings = {
  locale: "app" | (typeof locales)[number];
};

export const DEFAULT_SETTINGS: Settings = {
  locale: "app",
};

export class ObsidianPlugin extends Plugin {
  declare settings: Settings;
  commands_ids: string[] | undefined;
}
