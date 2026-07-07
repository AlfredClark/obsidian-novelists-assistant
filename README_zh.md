[English](./README.md) | 简体中文

# Obsidian Plugin Template

基于 Vite 的 Obsidian 插件开发模板，支持 TypeScript、Svelte 和 Paraglide JS 国际化。

## 特性

-   **Vite 构建** — 使用 Vite 打包，支持 ESNext 语法
-   **TypeScript** — 完整的类型检查支持
-   **Svelte** — 响应式 UI 组件，用于设置面板和弹窗
-   **Paraglide JS** — 类型安全的国际化，支持自动提取消息和机器翻译
-   **热重载** — `npm run dev` 监听文件变更自动 rebuild 并同步产物
-   **设置面板** — 示例 SettingTab，集成 Svelte 组件
-   **多模式构建** — development 模式输出 inline sourcemap，production 模式关闭

## 快速开始

```bash
# 克隆模板
git clone <repo-url> <your-plugin-name>
cd <your-plugin-name>

# 安装依赖
npm install

# 编译国际化文件（首次构建前必须执行）
npm run i18n:compile

# 启动开发模式（文件变更自动构建）
npm run dev

# 生产构建
npm run build
```

> [!IMPORTANT]
> **构建前必须先编译国际化文件。** `i18n:compile` 脚本会根据翻译消息生成 Paraglide JS 运行时。请在 `npm install` 之后、拉取新翻译之后或编辑 `src/i18n/messages/` 中的消息后运行此命令。未编译将导致构建时报 `src/i18n/paraglide/` 模块缺失错误。

将插件目录放到 Obsidian vault 的 `.obsidian/plugins/<your-plugin-name>/` 下，在 Obsidian 中启用即可。

> [!NOTE]
> **热重载**：`npm run dev` 仅负责自动构建并同步 `main.js`，Obsidian 本身不会自动检测文件变更并重新加载插件。建议安装 [hot-reload](https://github.com/pjeby/hot-reload) 插件，它会在检测到 `main.js` 或 `manifest.json` 变更时自动重载对应插件，使开发体验接近真正的热重载。

## 可用脚本

| 命令                          | 说明                                     |
|-----------------------------|----------------------------------------|
| `npm run dev`               | 开发模式，watch 文件变更并自动 rebuild             |
| `npm run build`             | 类型检查 + 生产构建                            |
| `npm run lint`              | ESLint 代码检查                            |
| `npm run check`             | Prettier 格式检查                          |
| `npm run format`            | Prettier 格式化                           |
| `npm run i18n:compile`      | 编译 Paraglide JS 消息为运行时代码               |
| `npm run machine-translate` | 通过 inlang 机器翻译自动翻译消息                   |
| `npm run dist-link`         | 将 dist 软链接到测试仓库的插件目录                   |
| `npm run clean`             | 清理 dist 和产物文件                          |
| `npm run clean:dist`        | 清理 dist 目录内容（保留目录本身）                   |
| `npm run clean:deep`        | 清理 dist、产物文件和 node_modules             |
| `npm run version`           | 升级版本号，同步 manifest.json 和 versions.json |

## 项目结构

```
.
├── src/
│   ├── main.ts                         # 插件入口，统合所有注册逻辑
│   ├── svelte-env.d.ts                 # Svelte 的 TypeScript 类型声明
│   ├── core/                           # 核心插件模块（每文件一个 register* 函数）
│   │   ├── types.ts                    # 类型、接口和 ObsidianPlugin 基类
│   │   ├── settings.ts                 # 设置加载/保存逻辑
│   │   ├── locales.ts                  # 语言环境初始化
│   │   ├── sidebar.ts                  # 侧边栏 ItemView 定义与注册
│   │   ├── ribbon-icon.ts              # 用于切换侧边栏的功能区图标
│   │   ├── setting-tab.ts             # 插件设置面板 UI
│   │   └── menu.ts                     # 上下文菜单处理（文件菜单、编辑器菜单）
│   ├── components/                     # Svelte 组件及相关工具
│   │   ├── types.ts                    # 桥接辅助组件（ObsidianSvelteComponent, HTMLComponent）
│   │   └── settings/                   # 设置相关组件
│   │       └── LocaleSettings.svelte   # 语言切换组件
│   ├── features/                       # 功能特定模块
│   └── i18n/                           # 国际化
│       ├── messages/                   # 翻译消息文件（每种语言一个文件）
│       ├── paraglide/                  # 编译后的 Paraglide JS 运行时（自动生成）
│       └── project.inlang/             # inlang 项目配置
├── manifest.json                       # Obsidian 插件清单
├── styles.css                          # 插件样式
├── dist-link.ts                        # 将 dist 软链接到测试仓库插件目录
├── vite.config.ts                      # Vite 构建配置（Svelte + Paraglide 插件）
├── tsconfig.json                       # TypeScript 配置（仅类型检查）
├── eslint.config.ts                    # ESLint 配置（TS + Svelte）
├── prettier.config.ts                  # Prettier 配置（TS + Svelte）
├── version-bump.ts                     # 版本号升级脚本
└── versions.json                       # 版本兼容性映射
```

## 自定义

1. 在 `manifest.json` 中修改 `id`、`name`、`description`、`author` 等信息
2. 全局搜索替换 `TemplatePlugin` → `YourPluginName`（`src/main.ts`、`src/core/`）
3. 在 `src/i18n/messages/` 中编辑各语言的翻译消息
4. 编辑消息后运行 `npm run i18n:compile` 重新编译
5. 开发前清理 `src/main.ts` 和 `src/settings.ts` 中的示例代码

## 技术栈

-   [Vite](https://vitejs.dev) 构建
-   [TypeScript](https://www.typescriptlang.org) 类型检查
-   [Svelte](https://svelte.dev) 响应式 UI 组件
-   [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) 类型安全国际化
-   [ESLint](https://eslint.org) 代码检查
-   [Prettier](https://prettier.io) 代码格式化
-   [Obsidian API](https://docs.obsidian.md) 插件开发

## CI/CD

| Workflow      | 触发条件             | 说明                   |
|---------------|------------------|----------------------|
| `lint.yml`    | 推送 / PR 到 `main` | ESLint + Prettier 检查 |
| `release.yml` | 推送 tag（`x.y.z`）  | 构建并创建 GitHub Release |

### 约定式提交

本项目使用 [git-cliff](https://github.com/orhun/git-cliff) 基于 [Conventional Commits](https://www.conventionalcommits.org) 自动生成 changelog。提交信息请使用以下前缀：

| 前缀               | 分组   |
|------------------|------|
| `feat:`          | 新功能  |
| `fix:`           | 问题修复 |
| `doc:`           | 文档   |
| `perf:`          | 性能优化 |
| `refactor:`      | 重构   |
| `style:`         | 样式   |
| `test:`          | 测试   |
| `chore:` / `ci:` | 杂项   |
| `revert:`        | 回滚   |

> 不符合上述前缀的提交将被排除在 changelog 之外。

## 许可证

[GPL-3.0](LICENSE)
