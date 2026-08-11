# Obsidian Plugin Template

**English** | [简体中文](docs/README_zh-CN.md)

A production-ready [Obsidian](https://obsidian.md) plugin development template with a modular architecture, built-in internationalization, declarative settings, and Svelte 5 support.

## Features

- **Modular architecture** — code is organized into `cores/` (shared infrastructure), `features/` (business features), and `utils/` (stateless utilities), with every module following a consistent three-file structure
- **Internationalization** — hand-rolled i18n with zero dependencies; English, Simplified Chinese, and Traditional Chinese built in; type-safe translation keys with editor auto-completion
- **Declarative settings** — settings page built on the Obsidian 1.13.0+ declarative API (`getSettingDefinitions`) with automatic persistence
- **Svelte 5 support** — compile `.svelte` components via esbuild-svelte (styles inlined through `css: "injected"`), type-checked by svelte-check, plus a `mountComponent` utility for mounting components into views
- **Strict quality gates** — TypeScript strict mode, ESLint with Obsidian-specific rules, Stylelint, Prettier, and a CI pipeline that enforces them all
- **Zero runtime dependencies** — everything, including Svelte, is bundled into a single `main.js` at build time; nothing ships in `node_modules`

## Tech Stack

- **bun** — package manager and script runner
- **TypeScript 6** — type checking only (`tsc -noEmit`)
- **esbuild 0.28** — CJS bundling; `obsidian`/`electron`/`@codemirror/*`/`@lezer/*`/Node builtins are externalized
- **Svelte 5** — UI components
- **ESLint 10 + eslint-plugin-obsidianmd** — Obsidian-specific linting
- **Stylelint 17 + stylelint-config-standard** — CSS linting
- **Prettier 3 + prettier-plugin-svelte** — unified code formatting

## Getting Started

### Prerequisites

- [bun](https://bun.sh) 1.x or later

### Create your plugin

1. Create a repository from this template (GitHub **Use this template**, or clone it directly)
2. Update `manifest.json` — set `id`, `name`, `description`, and `author` for your plugin
3. Update `package.json` — set the `name` field
4. Install dependencies: `bun install`

### Link to your vault

Connect the built output to your vault's plugin directory:

```bash
bun run link <vault>/.obsidian/plugins/<plugin-id>
```

This also writes a hot-reload flag (see `--hotreload`), so install the [obsidian-hot-reload](https://github.com/pjeby/hot-reload) plugin to reload automatically on each rebuild.

Then enable the plugin in Obsidian: **Settings → Community plugins → your plugin** (turn on **Developer mode** first if it is not visible).

### Develop

```bash
bun run dev
```

Watches `src/` and static assets, rebuilds, and syncs the output to `dist/`.

### Manual install (no hot reload)

If you prefer not to use the link command:

```bash
bun run build
```

Copy `main.js`, `manifest.json`, and `styles.css` to `<vault>/.obsidian/plugins/<plugin-id>/`.

## Project Structure

```
├── .github/workflows/       # GitHub Actions (lint checks + auto release)
├── docs/                    # Localized documentation
├── dist/                    # Build output copy (gitignored; linkable to a vault)
├── scripts/                 # Build helper scripts (never imported at runtime)
├── src/
│   ├── cores/               # Shared infrastructure across features
│   │   ├── i18n/            # Internationalization module
│   │   │   └── locales/     # Language resources
│   │   └── settings/        # Persistent settings + declarative settings page
│   ├── features/            # Business features (empty skeleton)
│   ├── utils/               # Stateless utilities (e.g. svelte mounting)
│   └── main.ts              # Plugin entry point
├── .prettierrc              # Prettier config (2 spaces, double quotes, 128 cols, LF)
├── .stylelintrc.json        # Stylelint config
├── AGENTS.md                # Development conventions (for contributors and AI assistants)
├── bun.lock                 # bun lockfile
├── cliff.toml               # git-cliff changelog config
├── esbuild.config.ts        # esbuild build config
├── eslint.config.mts        # ESLint config (flat config)
├── LICENSE                  # GPL-3.0-only
├── manifest.json            # Plugin manifest (id/name/version)
├── package.json             # Package definition and scripts
├── styles.css               # Plugin styles (release artifact)
├── tsconfig.json            # TypeScript config (strict)
└── versions.json            # Version compatibility mapping (minAppVersion)
```

## Development Guide

For full conventions (naming, module structure, commit rules), see [AGENTS.md](AGENTS.md).

### Add a feature module

1. Create `src/features/<name>/` with the standard three files: `index.ts` (re-exports only), `types.ts` (type definitions), and `core.ts` (logic, exporting `init<Name>()`)
2. The init function receives the concrete `TemplatePlugin` class via `import type` (no runtime cycles)
3. If the feature registers resources (views, listeners, etc.), return a cleanup function
4. Register the init call in `src/features/index.ts` — cleanups are collected there and invoked by `cleanFeatures()` in `onunload()`

### Add a core module

1. Create `src/cores/<name>/` with the same three-file structure
2. Register the init call in `src/cores/index.ts` — `initCores()` runs before `initFeatures()` in `main.ts`

### Add a Svelte component

1. Place `.svelte` files in the owning module's `components/` directory
2. Add `"src/**/*.svelte"` to the `include` in `tsconfig.json` so svelte-check can find them
3. Mount it with `mountComponent(target, Component, props?)` from `src/utils/svelte.ts` — it returns `{ instance, destroy() }`; call `destroy()` when the view closes (e.g. in `onClose()`)
4. Precise props types are validated by svelte-check, which runs as part of `bun run build` whenever `.svelte` files exist

### Internationalize the UI

1. Add keys to `src/cores/i18n/locales/en.ts` (the type source)
2. Mirror them in `src/cores/i18n/locales/zh.ts` (`zh` and `zh-TW`) — the `TranslationResource` type enforces structural equality at compile time
3. Use `t("key.path", { vars })` anywhere; keys are auto-completed by the editor
4. To add a new language: create a locale file, then register it in `i18n/types.ts`, `i18n/core.ts`, and the settings dropdown options

## Available Scripts

| Script                 | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `bun run dev`          | Watch `src/` and static assets; rebuild and sync `dist/`          |
| `bun run build`        | Type check (tsc + svelte-check) + production build + sync `dist/` |
| `bun run lint`         | ESLint check (must be clean before committing)                    |
| `bun run format`       | Format all code with Prettier + Stylelint                         |
| `bun run format:check` | Verify formatting (must pass before committing)                   |
| `bun run version`      | Bump version across package.json / manifest.json / versions.json  |
| `bun run link <path>`  | Link `dist/` to a vault plugin directory (hot reload by default)  |
| `bun run unlink`       | Remove the link                                                   |

## Versioning & Release

1. `bun run version` bumps the version from `package.json` into `manifest.json` and `versions.json`
2. Push a tag `x.y.z` — GitHub Actions builds the plugin and creates a Release containing `main.js`, `manifest.json`, `styles.css`, and an auto-generated changelog (git-cliff)

## License

[GPL-3.0-only](LICENSE)
