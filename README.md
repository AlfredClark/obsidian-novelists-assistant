English | [简体中文](./README_zh.md)

# Obsidian Plugin Template

A Vite based Obsidian plugin development template with TypeScript, Svelte, and Paraglide JS i18n support.

## Features

-   **Vite Build** — Uses Vite for bundling, supports ESNext syntax
-   **TypeScript** — Full type checking support
-   **Svelte** — Reactive UI components for settings panels and modals
-   **Paraglide JS** — Type-safe i18n with automatic message extraction and machine translation
-   **Hot Reload** — `npm run dev` watches file changes and auto rebuilds with output sync
-   **Settings Panel** — Example SettingTab with Svelte component integration
-   **Multimode Build** — development mode with inline sourcemaps, production mode minified

## Quick Start

```bash
# Clone the template
git clone <repo-url> <your-plugin-name>
cd <your-plugin-name>

# Install dependencies
npm install

# Compile i18n messages (required before first build)
npm run i18n:compile

# Start dev mode (auto rebuild on file changes)
npm run dev

# Production build
npm run build
```

> [!IMPORTANT]
> **i18n compilation is required before building.** The `i18n:compile` script generates the Paraglide JS runtime from your translation messages. Run it after `npm install`, after pulling new translations, or after editing messages in `src/i18n/messages/`. Without this step, the build will fail with missing module errors from `src/i18n/paraglide/`.

Place the plugin directory under your Obsidian vault at `.obsidian/plugins/<your-plugin-name>/`, then enable it in Obsidian.

> [!NOTE]
> **Hot Reload**: `npm run dev` only handles auto building and syncing `main.js`. Obsidian does not detect file changes and reload plugins on its own. Install the [hot-reload](https://github.com/pjeby/hot-reload) plugin — it automatically reloads the corresponding plugin when `main.js` or `manifest.json` changes, giving you a near true hot reload experience.

## Available Scripts

| Command                     | Description                                            |
|-----------------------------|--------------------------------------------------------|
| `npm run dev`               | Dev mode, watch file changes and auto rebuild          |
| `npm run build`             | Type check + production build                          |
| `npm run lint`              | Lint source files with ESLint                          |
| `npm run check`             | Check code formatting with Prettier                    |
| `npm run format`            | Format source files with Prettier                      |
| `npm run i18n:compile`      | Compile Paraglide JS messages to runtime               |
| `npm run machine-translate` | Auto-translate messages via inlang machine translation |
| `npm run dist-link`         | Symlink dist to test vault plugin directory            |
| `npm run clean`             | Remove dist and output files                           |
| `npm run clean:dist`        | Remove contents inside dist (keep the directory)       |
| `npm run clean:deep`        | Remove dist, output files and node_modules             |
| `npm run version`           | Bump version, sync manifest.json and versions.json     |

## Project Structure

```
.
├── src/
│   ├── main.ts                         # Plugin entry, orchestrates all registrations
│   ├── svelte-env.d.ts                 # Svelte type declarations for TypeScript
│   ├── core/                           # Core plugin modules (one register* per file)
│   │   ├── types.ts                    # Types, interfaces, and base ObsidianPlugin class
│   │   ├── settings.ts                 # Settings load/save logic
│   │   ├── locales.ts                  # Locale initialization
│   │   ├── sidebar.ts                  # Sidebar ItemView definition and registration
│   │   ├── ribbon-icon.ts              # Ribbon icon to toggle sidebar
│   │   ├── setting-tab.ts             # Plugin settings tab UI
│   │   └── menu.ts                     # Context menu handlers (file-menu, editor-menu)
│   ├── components/                     # Svelte components and related tools
│   │   ├── types.ts                    # Bridge helpers (ObsidianSvelteComponent, HTMLComponent)
│   │   └── settings/                   # Settings-related components
│   │       └── LocaleSettings.svelte   # Language switcher component
│   ├── features/                       # Feature-specific modules
│   └── i18n/                           # Internationalization
│       ├── messages/                   # Translation message files (per locale)
│       ├── paraglide/                  # Compiled Paraglide JS runtime (auto-generated)
│       └── project.inlang/             # inlang project configuration
├── manifest.json                       # Obsidian plugin manifest
├── styles.css                          # Plugin styles
├── dist-link.ts                        # Symlink dist to test vault plugin directory
├── vite.config.ts                      # Vite build configuration (Svelte + Paraglide plugins)
├── tsconfig.json                       # TypeScript configuration (type check only)
├── eslint.config.ts                    # ESLint configuration (TS + Svelte)
├── prettier.config.ts                  # Prettier configuration (TS + Svelte)
├── version-bump.ts                     # Version bump script
└── versions.json                       # Version compatibility mapping
```

## Customization

1. Edit `id`, `name`, `description`, `author` etc. in `manifest.json`
2. Replace `TemplatePlugin` → `YourPluginName` globally (`src/main.ts`, `src/core/`)
3. Edit translation messages in `src/i18n/messages/` for each locale
4. Run `npm run i18n:compile` after editing messages
5. Remove example code from `src/main.ts` and `src/settings.ts` before development

## Tech Stack

-   [Vite](https://vitejs.dev) build tool
-   [TypeScript](https://www.typescriptlang.org) type checking
-   [Svelte](https://svelte.dev) reactive UI components
-   [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) type-safe i18n
-   [ESLint](https://eslint.org) code linting
-   [Prettier](https://prettier.io) code formatting
-   [Obsidian API](https://docs.obsidian.md) plugin development

## CI/CD

| Workflow      | Trigger             | Description                     |
|---------------|---------------------|---------------------------------|
| `lint.yml`    | Push / PR to `main` | ESLint + Prettier check         |
| `release.yml` | Tag push (`x.y.z`)  | Build and create GitHub Release |

### Conventional Commits

This project uses [git-cliff](https://github.com/orhun/git-cliff) to generate changelogs from [Conventional Commits](https://www.conventionalcommits.org). Use the following prefixes for commit messages:

| Prefix           | Group         |
|------------------|---------------|
| `feat:`          | Features      |
| `fix:`           | Bug Fixes     |
| `doc:`           | Documentation |
| `perf:`          | Performance   |
| `refactor:`      | Refactor      |
| `style:`         | Styling       |
| `test:`          | Testing       |
| `chore:` / `ci:` | Miscellaneous |
| `revert:`        | Revert        |

> Commits not matching these prefixes will be excluded from the changelog.

## License

[GPL-3.0](LICENSE)
