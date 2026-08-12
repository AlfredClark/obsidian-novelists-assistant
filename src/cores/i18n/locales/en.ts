/** 英文资源。结构作为 TranslationResource 的类型源，其余语言与其同构保证键一致 */
const en = {
  settings: {
    collapsible: "Collapsible groups",
    collapsibleDesc: "Allow settings groups to be collapsed",
    createStructure: "Create default directory structure",
    createStructureDesc: "Create {lore} and {novel} folders at the vault root and point the settings above to them",
    directory: "Directories",
    directoryDesc: "Configure folders for novel lore notes and main text",
    directoryPlaceholder: "Not selected",
    general: "General",
    language: "Plugin language",
    languageDesc: "Set the plugin interface language",
    languageOptions: {
      system: "Follow system",
      en: "English",
      zh: "简体中文",
      "zh-TW": "繁體中文",
    },
    loreDir: "Lore folder",
    loreDirDesc: "Folder for novel lore notes",
    novelDir: "Novel folder",
    novelDirDesc: "Folder for the novel's main text",
    novelIndent: "Indent size",
    novelIndentDesc: "First-line indent for novel files (rem)",
    novelLineHeight: "Line height",
    novelLineHeightDesc: "Line height for novel files (rem)",
    novelTypeset: "Novel typesetting",
    novelTypesetDesc: "Apply typesetting styles to files in the novel folder",
    typeset: "Typesetting",
    typesetDesc: "Configure typesetting applied to files in the novel folder",
  },
  structure: {
    created: "Created folders: {dirs}",
    defaultLore: "Lore",
    defaultNovel: "Novel",
    failed: "Failed to create folders: {dirs}",
    noChange: "Default directory structure already in place",
  },
} as const;

export default en;
