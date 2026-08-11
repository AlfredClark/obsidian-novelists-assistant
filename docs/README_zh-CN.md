# Obsidian 插件模板

[English](../README.md) | **简体中文**

一个开箱即用的 [Obsidian](https://obsidian.md) 插件开发模板：模块化架构、内置国际化、声明式设置页，并支持 Svelte 5。

## 特性

- **模块化架构** — 代码按 `cores/`（共享基础设施）、`features/`（业务功能）、`utils/`（无状态工具）分层，每个模块遵循统一的三段式文件结构
- **国际化** — 手写实现、零第三方依赖；内置英文、简体中文、繁体中文；翻译键类型安全，编辑器自动补全
- **声明式设置** — 基于 Obsidian 1.13.0+ 声明式 API（`getSettingDefinitions`）构建设置页，持久化自动完成
- **Svelte 5 支持** — esbuild-svelte 编译 `.svelte` 组件（样式经 `css: "injected"` 内联），svelte-check 类型检查，并提供 `mountComponent` 工具将组件挂载进视图
- **严格质量门禁** — TypeScript strict 全开、ESLint（含 Obsidian 专用规则）、Stylelint、Prettier，CI 强制全部通过
- **零运行时依赖** — 包括 Svelte 在内的一切在构建时打包进单个 `main.js`，发布不含 `node_modules`

## 技术栈

- **bun** — 包管理器与脚本执行器
- **TypeScript 6** — 仅类型检查（`tsc -noEmit`）
- **esbuild 0.28** — CJS 打包；`obsidian`/`electron`/`@codemirror/*`/`@lezer/*`/Node 内置模块外部化
- **Svelte 5** — UI 组件
- **ESLint 10 + eslint-plugin-obsidianmd** — Obsidian 专用检查
- **Stylelint 17 + stylelint-config-standard** — CSS 检查
- **Prettier 3 + prettier-plugin-svelte** — 统一代码格式

## 如何开始

### 前置要求

- [bun](https://bun.sh) 1.x 或更高版本

### 创建你的插件

1. 基于本模板创建仓库（GitHub **Use this template**，或直接克隆）
2. 修改 `manifest.json` — 设置 `id`、`name`、`description`、`author`
3. 修改 `package.json` — 设置 `name` 字段
4. 安装依赖：`bun install`

### 链接到你的 vault

将构建产物链接到 vault 的插件目录：

```bash
bun run link <vault>/.obsidian/plugins/<plugin-id>
```

该命令会同时写入热重载标记（见 `--hotreload`），请安装 [obsidian-hot-reload](https://github.com/pjeby/hot-reload) 插件以便每次构建后自动重载。

然后在 Obsidian 中启用插件：**设置 → 第三方插件 → 你的插件**（若不可见，先在"开发模式"中开启）。

### 开发

```bash
bun run dev
```

监听 `src/` 与静态资源，构建后同步到 `dist/`。

### 手动安装（无热重载）

如果不使用 link 命令：

```bash
bun run build
```

将 `main.js`、`manifest.json`、`styles.css` 复制到 `<vault>/.obsidian/plugins/<plugin-id>/`。

## 目录结构

```
├── .github/workflows/       # GitHub Actions（lint 检查 + 自动发布）
├── docs/                    # 本地化文档
├── dist/                    # 构建产物副本（gitignore，可 link 至 vault）
├── scripts/                 # 构建辅助脚本（不得被插件运行时引用）
├── src/
│   ├── cores/               # 核心能力：跨功能共享的基础设施
│   │   ├── i18n/            # 国际化模块
│   │   │   └── locales/     # 语言资源目录
│   │   └── settings/        # 持久化设置 + 声明式设置页
│   ├── features/            # 业务功能（空骨架）
│   ├── utils/               # 无状态纯函数工具（如 svelte 组件挂载）
│   └── main.ts              # 插件入口
├── .prettierrc              # Prettier 配置（2 空格/双引号/128 列/LF）
├── .stylelintrc.json        # Stylelint 配置
├── AGENTS.md                # 开发规范（面向贡献者与 AI 助手）
├── bun.lock                 # bun 锁文件
├── cliff.toml               # git-cliff 变更日志配置
├── esbuild.config.ts        # esbuild 构建配置
├── eslint.config.mts        # ESLint 配置（flat config）
├── LICENSE                  # GPL-3.0-only
├── manifest.json            # 插件清单（id/name/version）
├── package.json             # 包定义与脚本命令
├── styles.css               # 插件样式（发布产物）
├── tsconfig.json            # TypeScript 配置（strict）
└── versions.json            # 版本兼容映射（minAppVersion）
```

## 开发指南

完整的开发规范（命名、模块结构、提交规则）见 [AGENTS.md](../AGENTS.md)。

### 新增 feature 模块

1. 创建 `src/features/<名称>/`，包含标准三段式文件：`index.ts`（仅 re-export）、`types.ts`（类型定义）、`core.ts`（核心逻辑，导出 `init<模块>()`）
2. init 方法通过 `import type` 接收具体类 `TemplatePlugin`（运行时无循环）
3. 若功能注册了资源（视图、监听器等），返回清理函数
4. 在 `src/features/index.ts` 中注册 init 调用 — 清理函数由该文件收集，`onunload()` 时经 `cleanFeatures()` 依序执行

### 新增 core 模块

1. 在 `src/cores/<名称>/` 下创建同样三段式结构
2. 在 `src/cores/index.ts` 注册 init 调用 — `initCores()` 先于 `initFeatures()` 在 `main.ts` 中执行

### 新增 Svelte 组件

1. 将 `.svelte` 文件放在所属模块的 `components/` 目录下
2. 在 `tsconfig.json` 的 `include` 中追加 `"src/**/*.svelte"`，供 svelte-check 定位
3. 使用 `src/utils/svelte.ts` 的 `mountComponent(target, Component, props?)` 挂载 — 返回 `{ instance, destroy() }`；视图关闭时（如 `onClose()`）调用 `destroy()`
4. 精确的 props 类型由 svelte-check 校验 — 存在 `.svelte` 文件时 `bun run build` 会自动执行

### 界面国际化

1. 在 `src/cores/i18n/locales/en.ts` 添加键（类型源）
2. 在 `src/cores/i18n/locales/zh.ts` 同步镜像（`zh` 与 `zh-TW`）— `TranslationResource` 类型在编译期强制键完全同构
3. 任意位置使用 `t("键.路径", { 变量 })`，编辑器自动补全
4. 添加新语言：新建语言资源文件，然后在 `i18n/types.ts`、`i18n/core.ts` 与设置页下拉选项中注册

## 常用命令

| 命令                   | 作用                                                    |
| ---------------------- | ------------------------------------------------------- |
| `bun run dev`          | 监听 `src/` 与静态资源；构建并同步 `dist/`              |
| `bun run build`        | 类型检查（tsc + svelte-check）+ 生产构建 + 同步 `dist/` |
| `bun run lint`         | ESLint 检查（提交前必须零错误）                         |
| `bun run format`       | Prettier + Stylelint 格式化全部代码                     |
| `bun run format:check` | 检查格式（提交前必须通过）                              |
| `bun run version`      | 版本提升（package.json → manifest.json/versions.json）  |
| `bun run link <路径>`  | 将 `dist/` 链接到 vault 插件目录（默认启用热重载）      |
| `bun run unlink`       | 取消链接                                                |

## 版本与发布

1. `bun run version` 从 `package.json` 提升版本至 `manifest.json` 与 `versions.json`
2. 推送 `x.y.z` 标签 — GitHub Actions 自动构建并发布 Release，包含 `main.js`、`manifest.json`、`styles.css` 与自动生成的变更日志（git-cliff）

## 许可证

[GPL-3.0-only](../LICENSE)
