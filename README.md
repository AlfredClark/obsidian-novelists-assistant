# Novelists Assistant

**English** | [简体中文](docs/README_zh-CN.md)

![Novelists Assistant preview](docs/images/preview.png)

Enhance your novel writing experience with various writing tools to keep complex storylines organized.

## Features

### Default directory structure

- One-click creation of the `Lore`, `Novel`, and `Outline` folders (localized: `设定`/`正文`/`纲要` in Chinese UI) with settings auto-pointed to them; the outline folder holds synopses, detailed outlines, foreshadowing, and timelines
- Folders that already exist are detected on startup and linked automatically

### Sidebar

- "Lore" and "Outline" tabs at the top with a search box filtering entries on the current page (a matching group name keeps the whole group); one level of groups plus an ungrouped area, Markdown files only
- Click an entry to preview it inside the sidebar with only a back button on top; vault changes refresh automatically
- Entries per row are configurable per tab under **Settings → Sidebar** (lore defaults to 4, outline to 1, range 1–10); multi-column and outline entries are centered with ellipsis
- The lore tab shows groups first with ungrouped notes last; the outline tab shows ungrouped notes first without a header, followed by groups

### Novel typesetting

- First-line indent and line height for files in the novel folder, in both source and reading (preview) view
- Font family and font weight (100–900) are configurable separately for source and reading views; an empty font family inherits the theme font
- Reading view has an independent toggle and parameters; soft line breaks render as independently indented lines

### Grid lines

- Dashed grid lines under each line of novel files in source view, like manuscript paper
- Dash length, gap, thickness, and opacity are all configurable

### Quick menu

- **New chapter** (file menu): creates the next chapter in the novel folder with auto-incrementing numbers, supporting digits, Chinese lowercase, and Chinese uppercase, then opens it in the current tab
- **New volume** (file menu): creates the next volume folder at the novel root with a name-confirmation dialog (auto-numbered, editable)
- **Dissolve volume** (file menu, novel subfolders only): moves everything inside the volume to the novel root, skipping name conflicts
- **Renumber chapters** (settings): resequence existing chapters per the counting strategy with a confirmation preview
- **Add to lore** (editor menu): turns the selected text into a lore note inside a chosen lore subfolder
- **Sync lore links** / **Clear lore links** (editor menu): wrap or unwrap every lore name in the current note as wikilinks in one click
- **Chapter / volume conversion** (settings): batch-rename existing chapters or volumes between numbering formats

### Punctuation

- Auto-completes the matching closing mark when typing an opening mark (Chinese IME friendly), skips over an existing closing mark, and deletes empty pairs with backspace
- Disabled inside code blocks, math formulas, and frontmatter; the IME candidate-replacement repair interval is configurable

### Word count (file explorer)

- Per-file word count shown next to each file — markdown syntax is stripped before counting; CJK characters count individually, Latin letters and digits count as words
- Folder stats: the lore folder shows total lore notes and groups, the novel folder shows total words and chapters, and each lore subfolder shows its note count
- All units are configurable and can be hidden

### Export

- **Export to clipboard** (file menu): copies the note's text with every Markdown marker stripped
- **Export as txt file** (file menu): saves that plain text through the system save dialog, so any folder and file name can be chosen
- Both items appear on Markdown files inside the novel folder; a note without body text is skipped with a notice
- Blank lines, a leading title, and keeping the Markdown markup can be configured under **Settings → Export**

## Installation

### Community plugins (recommended)

1. In Obsidian, open **Settings → Community plugins**
2. Turn off **Restricted mode**
3. Click **Browse**, search for "Novelists Assistant", and install

### Manual

1. From [latest release](https://github.com/AlfredClark/obsidian-novelists-assistant/releases) download `main.js`, `manifest.json`, and `styles.css` directly
2. Place the files into `Vault/.obsidian/plugins/novelists-assistant/`

## Settings

All features are grouped in the settings tab and can be toggled independently. The interface language follows your Obsidian language (English, Simplified Chinese, Traditional Chinese) and can be overridden.

## Compatibility

- Obsidian 1.13.1 or higher
- Desktop only

## License

This project is licensed under GPL-3.0-only — see [LICENSE](LICENSE).
