# Novelists Assistant — 开发规范

## 项目概览

- Obsidian 小说助手插件：TypeScript → esbuild → `main.js`
- 发布产物：`main.js` / `manifest.json` / `styles.css`（位于根目录，GitHub Release 使用）
- 插件 ID：`novelists-assistant`；许可证：GPL-3.0-only

## 技术栈

- **bun**：包管理器（锁文件 `bun.lock`）
- **TypeScript 6**：原生编译器，仅用于类型检查（`tsc -noEmit`）
- **esbuild 0.28**：CJS 打包；`obsidian`/`electron`/`@codemirror/*`/`@lezer/*`/node 内置模块外部化
- **Svelte 5**：UI 组件框架；esbuild-svelte 编译 `.svelte`（`css: "injected"` 内联进 JS），svelte-check 类型检查，eslint-plugin-svelte/prettier-plugin-svelte 配套
- **ESLint 10 + eslint-plugin-obsidianmd**：Obsidian 专用规则
- **Stylelint 17 + stylelint-config-standard**：CSS 专用检查
- **Prettier 3 + stylelint**：统一代码格式（`bun run format`）

## 常用命令

| 命令                   | 作用                                                   |
| ---------------------- | ------------------------------------------------------ |
| `bun run dev`          | 监听 src 与静态资源 → 构建并同步 dist                  |
| `bun run build`        | 类型检查 + 生产构建 + 同步 dist                        |
| `bun run lint`         | ESLint 检查（提交前必须零错误）                        |
| `bun run format`       | Prettier + stylelint 格式化全部代码                    |
| `bun run format:check` | Prettier + stylelint 检查（提交前必须通过）            |
| `bun run version`      | 版本提升（package.json → manifest.json/versions.json） |
| `bun run link <路径>`  | 将 dist 链接到 vault 插件目录（默认启用热重载）        |
| `bun run unlink`       | 取消链接                                               |

## 目录结构

```
├── .github/workflows/       # GitHub Actions（lint 检查 + Release 自动构建）
├── dist/                    # 构建产物副本（gitignore，可 link 至 vault）
├── scripts/                 # 构建辅助脚本（不得被插件运行时引用）
├── src/
│   ├── cores/               # 核心能力：跨功能共享的基础设施（模块三段式见代码规范）
│   │   ├── i18n/            # 国际化模块：手动实现的多语言支持
│   │   │   └── locales/     # 语言资源目录（文件说明见核心能力）
│   │   └── settings/        # 设置模块：持久化设置 + 声明式设置页
│   ├── features/            # 业务功能：用户可感知的具体功能
│   │   ├── structure/       # 目录结构：默认目录创建与自动指向（说明见业务功能）
│   │   ├── typeset/         # 排版：正文目录排版样式（说明见业务功能）
│   │   ├── gridlines/       # 网格线：正文网格虚线（说明见业务功能）
│   │   ├── quick-menu/      # 快捷菜单：文件/编辑菜单事件（说明见业务功能）
│   │   └── word-count/      # 字数统计：文件列表字数显示（说明见业务功能）
│   ├── utils/               # 无状态纯函数工具（如 svelte 组件挂载，说明见核心能力）
│   └── main.ts              # 插件入口：仅调用 initCores()/initFeatures() 聚合初始化
├── .editorconfig            # 编辑器统一格式（与 .prettierrc 对齐）
├── .gitignore               # git 忽略（main.js/dist/data.json/*.map 等）
├── .prettierrc              # Prettier 格式配置（2 空格/双引号/128 列/LF）
├── .stylelintrc.json        # Stylelint 配置（CSS 检查）
├── bun.lock                 # bun 依赖锁文件
├── cliff.toml               # git-cliff 变更日志配置（与提交规范对齐）
├── esbuild.config.ts        # esbuild 构建配置（CJS 打包、obsidian 等外部化）
├── eslint.config.mts        # ESLint 配置（含 obsidianmd 专用规则）
├── LICENSE                  # GPL-3.0-only 许可证
├── manifest.json            # Obsidian 插件清单（id/name/version）
├── package.json             # 包定义与脚本命令（bun 执行）
├── styles.css               # 插件样式（发布产物）
├── tsconfig.json            # TypeScript 类型检查配置（strict 全开）
└── versions.json            # 版本兼容映射（minAppVersion）
```

## 核心能力

`src/cores/` 下共享基础设施模块的专项说明。

### i18n（国际化）

- 手动实现，零第三方依赖；`t(key, vars?)` 为全局翻译入口，支持 `{name}` 插值，键由 `TranslationKey` 类型自动推导
- 语言解析优先级：`settings.language`（system/en/zh/zh-TW）→ `system` 依据 Obsidian 应用语言（`getLanguage()`）判定，未知语言回退 en
- 语言资源位于 `locales/`：`en.ts` 为类型源（as const，推导 `TranslationResource`）；`zh.ts` 导出简体 `zh` 与繁体 `zhTW`，标注 `TranslationResource` 强制与英文键同构，增删键即编译报错
- 添加新语言步骤：
  1. 新建 `locales/<标识>.ts`，按 `en.ts` 结构书写并标注 `TranslationResource`（缺失键即编译报错）
  2. `types.ts`：`PluginLanguage`/`SupportedLanguage` 追加语言标识
  3. `core.ts`：`LOCALES` 注册新资源；`system` 自动判定如需覆盖新语言，补充映射规则
  4. `settings/core.ts`：下拉框 `options` 追加选项（label 用对应语言本名）
  5. 所有语言资源的 `languageOptions` 同步追加该语言的本名条目
- 初始化须在 `initSettings` 之前（其内部 `addSettingTab` 会同步触发设置页渲染，`t()` 依赖 `pluginRef` 已就绪）

### settings（设置）

- `DEFAULT_SETTINGS` 提供默认值，`loadSettings` 从 data.json 读取后与默认值浅合并（展开运算，避免共享默认对象被意外修改），旧版本缺字段时自动兜底
- 设置页使用 1.13.0+ 声明式 API（`getSettingDefinitions`），读写 `plugin.settings` 与持久化由 Obsidian 自动完成；覆写 `setControlValue` 触发 `update()` 重渲染，语言切换等联动即时生效；网格线依赖正文排版：排版未开启时开启网格线、或关闭排版时网格线处于开启——仅提示网格线不可用（CSS 叠加类门控下不渲染），不强制回写（`visible` 谓词控制开关关联条目显隐）
- 依赖 i18n 模块：界面文案经 `t()` 翻译，`PluginLanguage` 类型自 `../i18n` 导入（依赖方向 settings → i18n，无环）

### utils（工具）

- 无状态纯函数工具目录，无生命周期，不受模块三段式约束：单文件同时导出函数与类型，无 init 方法
- `svelte.ts`：`mountComponent(target, Component, props?)` 将 Svelte 组件挂载到目标容器（如视图的 `contentEl`），返回 `{ instance, destroy() }`；destroy 卸载组件并清空容器。组件样式经构建配置 `css: "injected"` 注入 `<head>`，卸载后样式标签残留，但编译期 class 哈希保证样式隔离
- `ambient.d.ts`：全局环境声明文件（无顶层 import/export，保证 declare module 为环境声明而非增强）；`*.svelte` 模块声明，tsc 层放宽 props 类型，精确类型由 svelte-check 校验（build 命令内执行）；不与 `svelte.ts` 同名——TS 对同名 .ts/.d.ts 只保留 .ts，且模块文件内 `declare module` 会被视为模块增强而非法
- `.svelte` 组件文件属于模块特有文件，置于所属模块目录下（如 `features/<模块>/components/`），不受三段式约束

## 业务功能

`src/features/` 下用户可感知的业务功能模块专项说明。

### structure（目录结构）

- 三段式组织；依赖方向：settings 值导入本模块（设置页一键创建入口），本模块值导入 i18n、仅 type-only 导入 main/settings，无运行时循环
- `DirectoryRole`（"lore" | "novel"）与设置字段（`loreDir`/`novelDir`）经 `SETTING_KEYS` 一一对应
- `getDefaultDirectories()` 按当前界面语言生成默认目录名（en: Lore/Novel，zh: 设定/正文，zh-TW: 設定/正文）；仅在创建时取值并持久化，切换语言不影响已建目录
- `createDefaultStructure(plugin)`：设置页一键创建——已有有效指向的角色不动，其余按默认名补齐（已存在跳过创建、同名文件占用归入 failed）并写入设置，返回 `CreateStructureResult` 由调用方反馈
- `initStructure(plugin)`：启动时探测默认目录，已存在且设置未指向则自动补齐并持久化，缺失时静默不打扰

### typeset（排版）

- 三段式组织；core.ts 导出 `initTypeset(plugin)` 返回清理函数，经 features 聚合层 cleanups 数组回收；`layout-change`/`active-leaf-change` 经 `plugin.registerEvent` 注册，Obsidian 卸载自动回收
- `TYPESET_CLASS`/`TYPESET_TEXT_INDENT_VAR`/`TYPESET_LINE_HEIGHT_VAR` 常量位于 types.ts；样式表以 `[data-mode="source"] .cm-content.novel-typeset` + `var(--novel-text-indent, 2rem)`/`var(--novel-line-height, 2rem)` 消费（CSS 兜底默认值）；阅读视图另有独立变量 `PREVIEW_TEXT_INDENT_VAR`/`PREVIEW_LINE_HEIGHT_VAR`，样式表以 `[data-mode="preview"] .markdown-preview-view` + `var(--novel-preview-text-indent, 2rem)`/`var(--novel-preview-line-height, 2rem)` 消费
- 依赖方向：settings 值导入 `refreshTypeset`、`rerenderPreviewLeaves` 与两个门控键数组（`TYPESET_SETTING_KEYS` 刷新排版类 / `UPDATE_SETTING_KEYS` 重渲染设置页），本模块仅 type-only 导入 main，无运行时循环
- `refreshTypeset(plugin)`：经 `iterateAllLeaves` 遍历全部窗口叶子，按 `novelDir` 前缀 + 视图开关增删类与缩进/行高变量——源码视图由 `novelTypeset` 门控（目标 `.cm-content`，参数 `novelIndent`/`novelLineHeight` 写入 `--novel-*` 变量），阅读视图由独立开关 `novelPreviewTypeset` 门控（目标 `.markdown-preview-view`，参数 `novelPreviewIndent`/`novelPreviewLineHeight` 写入 `--novel-preview-*` 变量，类名共用，选择器按 data-mode 区分）；`CSS.supports` 防御 data.json 脏值，非法回退样式表默认；已知限制：弹窗窗口内布局/叶子事件不触发主 workspace 刷新（初始化遍历与主窗口操作兜底）
- 阅读视图渲染管线：`initTypeset` 额外经 `plugin.registerMarkdownPostProcessor` 注册 `renderPreview`，每次渲染完成按 `ctx.sourcePath` 判定目录与 `novelPreviewTypeset` 开关，依序执行变换管线 `PREVIEW_TRANSFORMS`（`PreviewTransform` 接口位于 types.ts，新增阅读视图排版规则只需追加条目并补充对应 CSS）；不满足条件时移除残留的 `PREVIEW_CLASS` 类（类可安全移除且不影响拆分结构），防御增量渲染复用 DOM；段落变换选择 `.el-p p` 段落，将其替换为 `div.novel-preview` 容器（p 内嵌 p 非法，div 内嵌 div 合法），把其中 `<br>` 软换行拆分为独立行 `div.novel-preview`（每行独立缩进），末段文本同样包裹为行 div（`text-indent` 只作用于块首行，嵌套块后的直接文本行不缩进），每段经 `trimParagraphEdges` 清理首尾空白（软换行行尾空格残留），清理后为空的行删除，纯空段（仅 `<br>`）保留不动作为分段空隙；已变换的段落不再命中 `.el-p p`，重复执行天然幂等；容器类与变量仍由 `refreshTypeset` 维护
- `rerenderPreviewLeaves(plugin)`：设置页开关/目录变更时对全部已打开预览视图执行 `previewMode.rerender(true)`，重建段落结构使管线变换即时生效；滑块变更只改 CSS 变量不触发重渲染
- 设置页联动：`setControlValue` 以键数组门控即时刷新与重渲染，滑块（`novelIndent`/`novelLineHeight`/`novelPreviewIndent`/`novelPreviewLineHeight`）变更只刷新不重建页面；各视图的缩进/行高滑块 `visible` 由对应视图的排版开关决定

### gridlines（网格线）

- 三段式组织；core.ts 导出 `initGridlines(plugin)` 返回清理函数，经 features 聚合层 cleanups 数组回收；`layout-change`/`active-leaf-change` 经 `plugin.registerEvent` 注册，Obsidian 卸载自动回收
- `GRIDLINES_CLASS`/`GRIDLINES_SIZE_VAR`/`GRIDLINES_SPACE_VAR`/`GRIDLINES_THICK_VAR`/`GRIDLINES_OPACITY_VAR` 常量位于 types.ts；样式表以 `.novel-typeset.novel-gridlines` 叠加类消费（CSS 兜底默认值）：网格线仅在正文排版开启时渲染，保证 `position: relative` 定位基准与 `--novel-line-height` 对齐
- 依赖方向：settings 值导入 `refreshGridlines` 与 `GRIDLINES_SETTING_KEYS`，本模块仅 type-only 导入 main，无运行时循环
- `refreshGridlines(plugin)`：经 `iterateAllLeaves` 遍历全部窗口叶子，按 `novelDir` 前缀 + `novelGridlines` 开关增删类与 size/space/thick/opacity 变量；`CSS.supports` 防御 data.json 脏值，非法回退样式表默认；已知限制：弹窗窗口内布局/叶子事件不触发主 workspace 刷新（初始化遍历与主窗口操作兜底）
- 设置页联动：`setControlValue` 以键数组门控即时刷新；开关默认关闭，4 个滑块（px/%）变更只刷新不重建页面

### quick-menu（快捷菜单）

- 三段式组织；core.ts 导出 `initQuickMenu(plugin)` 返回清理函数，经 features 聚合层 cleanups 数组回收；`file-menu`（`(menu, file, source, leaf?)`）与 `editor-menu`（`(menu, editor, info)`）经 `plugin.registerEvent` 注册，Obsidian 卸载自动回收，清理函数清空注册条目（防插件重载后菜单项重复）
- `FileMenuItem`/`EditorMenuItem` 位于 types.ts（含 `title`/`icon`/可选 `showIf` 谓词；`action` 异步点击行为与 `submenu` 二级菜单构建器二选一）；`FILE_MENU_ITEMS`/`EDITOR_MENU_ITEMS` 两个配置数组分别驱动两事件渲染，新增菜单项只需追加条目（异步 action 的 Promise 由 `onClick` 内 `void` 消费，防未处理 Promise）；菜单项在 init 内注册而非模块级常量，保证 `t()` 在 i18n 初始化后求值；`MenuItem.setSubmenu` 经模块内 `obsidian.d.ts` 类型增强补齐（未文档化 API，npm 类型包未声明，主流插件实证为返回式签名 `setSubmenu(): Menu`）
- 文件菜单首个菜单项「新建章节」：`showIf` 检测目标位于 `novelDir` 内或为 `novelDir` 自身（`isInsideOrSelf`）；`createNextChapter` 按 `chapterFormat`（`#` 为编号占位，设置层校验必含 `#`，运行时兜底防脏值）与 `chapterNumberStyle`（数字/中文小写/中文大写，脏值回退 digit）构建正则匹配同目录章节文件取最大编号 +1，冲突时递增直至可用，创建空文件后在当前标签页打开（文件→同目录，文件夹→其内部）；中文编号的识别与转换经 `nzh` 库（零依赖随包打包，`encodeS`/`encodeB`/`decodeS`/`decodeB`），字符集与 nzh 解码能力对齐；章节格式与编号格式经设置页「快捷菜单」分组配置
- 设置页「快捷菜单」分组含「章节转换」（`render` 变体：输入框 + 转换按钮，输入框临时值不持久化）：`convertChapters` 将 novelDir 内匹配源格式（`#` 匹配三种编号样式任一）的章节文件重命名为 `chapterFormat` + `chapterNumberStyle` 组成的格式，保留匹配前缀之后的原标题后缀（如 `第 1 章 穿越` → `第 一 章 穿越`），已是目标格式/目标名冲突/重命名失败计入跳过，`rename` 由 Obsidian 自动更新内部链接
- 编辑菜单首个菜单项「添加到设定」：选中文本且 `loreDir` 已配置时出现，二级菜单列 `loreDir` 直接子文件夹（`submenu` 构建器）；`createLoreNote` 在所选目录创建以选中文本命名的空 .md 文件（仅 trim 不清洗，非法字符/超长由创建失败兜底），仓库内任何位置存在同名（basename 大小写不敏感）设定即跳过并提示，纯空白选中静默跳过，创建成功与失败均提示
- 编辑菜单另两项「同步/清空所有设定链接」：未选中文本且 `loreDir` 已配置时出现；`wrapLoreNames` 单遍正则包裹——已有 wikilink 与 Markdown 内链（含别名/路径形式）整体跳过不重复包裹、名称按长度降序匹配，`unwrapLoreNames` 仅解除精确 `[[名称]]` 包裹（别名/路径链接不动），两者返回 `{ text, count }` 供 `getValue`/`setValue` 整体替换与提示（count>0 才落盘提示）
- 依赖方向：值导入 i18n、仅 type-only 导入 main，无运行时循环

### word-count（字数统计）

- 三段式组织；core.ts 导出 `initWordCount(plugin)` 返回清理函数，经 features 聚合层 cleanups 数组回收；`vault.on("modify"/"create"/"delete"/"rename")` 与 `layout-change` 经 `plugin.registerEvent` 注册，Obsidian 卸载自动回收
- `WORD_COUNT_CLASS`/`PROCESSED_CLASS` 常量与 `FolderCountRole`（"loreGroups" | "loreNotes" | "chapters"）位于 types.ts；`PROCESSED_CLASS` 标记已装饰的 `.nav-file-title`/`.nav-folder-title`（文件仅 md），刷新扫描时跳过防重复追加；样式表以 `.nav-file-title > .novel-word-count, .nav-folder-title > .novel-word-count` 消费（`margin-left: auto` 靠右显示）
- `stripMarkdown(text)` 清洗管线（顺序有依赖）：frontmatter/围栏代码块/行内代码/HTML 标签注释/Obsidian 行内注释/数学公式整体剔除，图片与嵌入整体剔除、链接与 wikilink 仅保留文字部分，标题/引用/列表行首标记、分隔线/表格分隔行、callout 类型标记、脚注、话题标签（负向后行断言防误伤 "C#语言"）、加粗/斜体/删除线/高亮标记、转义反斜杠剔除；`countWords(text)` 计数口径：CJK（汉字/假名/谚文）与全角字母数字逐字计 1，连续半角拉丁字母/数字序列（词内撇号/连字符不拆分）计 1，标点空白不计
- 统计缓存 `Map<path, {mtime, count}>` 按 mtime 失效，经 `vault.cachedRead` 读取避免重复读盘；`refreshWordCount(plugin)` 开关开启时装饰全部未标记文件标题（span 文案异步填充），关闭时移除全部 span 与标记（幂等，重新开启后再次装饰）；modify 事件删除缓存并按路径定位元素即时更新文案
- 文件夹统计：`resolveFolderRole` 判定角色——loreDir 自身（loreGroups）、novelDir 自身（chapters）、loreDir 直接子文件夹（loreNotes，相对路径不含 `/`）；精确匹配优先于子文件夹规则，防目录嵌套/相等时角色冲突；loreGroups 显示「递归设定总数 | 直接子文件夹组数」，chapters 显示「总字数 | 递归章节数」（wordCount 关闭时仅章节数），loreNotes 显示直接 md 文件数（非递归）；同步计数（children/getFiles 均在内存）由 `folderCountCache: Map<path, {role, count, total}>` 缓存（条目含角色，目录设置变更导致同路径角色变化时自愈失效，total 仅 loreGroups 使用），目录总字数经 `sumWordCounts` 复用 per-file 缓存求和——同一文件同一 mtime 只读一次内容，modify 仅重读被改文件；create/delete/rename 清缓存并复用 debounce 扫描（折叠文件夹无子节点 DOM 变更，MutationObserver 兜不住）；modify 事件对 novelDir 前缀内文件额外触发文件夹刷新；`refreshFolderCounts(plugin)` 开关开启时按角色装饰命中文件夹、不再命中的已装饰项移除残留，setText 前比对旧值防 DOM 抖动
- 展示文案经 `formatCount(count, unit)` 拼接：单位非空时以空格分隔（如 "123 字"），为空时仅数字无空格，文件夹多段以 " | " 连接；单位值不国际化、设置层写入前 trim；`refreshWordCountTexts(plugin)` 重设已装饰标题文案（单位变更时调用，与 `refreshWordCount` 区分——后者跳过已处理项且被 MutationObserver 高频触发，全量重算浪费）
- 文件树项渲染无现成事件：MutationObserver 监听主文档 body 子树（100ms debounce）捕获新增项，`layout-change` 兜底折叠/排序等重渲染，rename 仅清缓存由重扫描兜底；已知限制：弹窗窗口 DOM 不在主文档，其文件树不显示统计
- 设置页「字数统计」分组含文件字数开关（默认开启）与单位输入框（默认「字」）、文件夹统计开关（默认开启）与三组单位输入框（默认「组」/「条」/「章」，开关关闭时隐藏，`UPDATE_SETTING_KEYS` 联动显隐），`setControlValue` 以 `WORD_COUNT_SETTING_KEYS` 门控装饰增删、`wordCount`/`wordCountUnit` 同时联动文件夹刷新（正文目录字部分消费二者）、`FOLDER_COUNT_SETTING_KEYS`（含 loreDir/novelDir）触发文件夹装饰刷新；依赖方向：settings 值导入本模块，本模块仅 type-only 导入 main，无运行时循环

## 代码规范

1. **命名**：类/接口 PascalCase，函数/变量 camelCase，常量 UPPER_SNAKE_CASE，文件 kebab-case
2. **类型**：strict 全开（含 `noUncheckedIndexedAccess`）；禁止 `any` 与隐式 any
3. **模块**：`cores/`（核心能力）与 `features/`（业务功能）下的每个模块均按三段式组织：`index.ts`（统一出口，仅 re-export）、`types.ts`（类型定义）、`core.ts`（核心逻辑，导出 `init<模块>()` 初始化方法）；模块目录使用 kebab-case，多词模块以 `-` 分隔（如 `quick-menu`），`init<模块>()` 方法名由模块名转 camelCase 派生（如 `initQuickMenu`）；各模块 init 方法由 `src/cores/index.ts`/`src/features/index.ts` 分别聚合为 `initCores()`/`initFeatures()`，main.ts 各调用一次；init 方法参数一律使用具体类 `NovelistsAssistantPlugin`，且导入一律为 `import type`（类型层循环在编译期擦除，运行时无循环）；模块特有文件（如 i18n 的 `locales/`）直接置于模块目录下，不受三段式约束
4. **注释**：中文，写"为什么"而非"是什么"；不做多余注释。导出声明（类/接口/函数/常量/属性）一律使用 JSDoc（`/** */`），内部逻辑用行注释；types.ts 中属性注释置于属性后方（行注释），需分组时以独立一行的 `/** */` 组注释标注；`@param`/`@returns` 仅在参数或返回值存在需要说明的语义时使用，不机械全量添加；纯 re-export 的 index.ts 无需注释
5. **约束**：禁止 `import node:*` 与 Electron API（`obsidianmd/no-nodejs-modules` 规则）
6. **依赖**：确认可 bundle 或需加入 esbuild `external` 列表
7. **格式**：由 `.prettierrc` 统一控制——2 空格缩进、双引号、128 列、LF 行尾（与 `.editorconfig` 一致）

## 提交规范（Conventional Commits，与 cliff.toml 对齐）

- 格式：`<type>(<scope>): <描述>`（type 用英文标准前缀，描述用英文，无需首字母大写，尽可能一句话解决）
- 类型映射：

  | type           | 分组      |
  | -------------- | --------- |
  | `feat`         | 新功能    |
  | `fix`          | 缺陷修复  |
  | `doc`          | 文档      |
  | `perf`         | 性能优化  |
  | `refactor`     | 重构      |
  | `style`        | 样式/格式 |
  | `test`         | 测试      |
  | `chore` / `ci` | 杂务/CI   |
  | `revert`       | 回滚      |

- breaking change 使用 `!` 或 `BREAKING CHANGE:` 标记
- 禁止提交：`main.js`、`dist/`、`data.json`、`*.map`、`node_modules`

## 代理行为约束（AI 助手）

1. 修改代码前先阅读相关文件与本规范
2. 每次修改后必须运行 `bun run format` 与 `bun run lint` 验证通过
3. 依赖变更统一通过 `bun install`，不手动修改 `bun.lock`
4. 版本变更使用 `bun run version`，不手动修改 manifest 版本
5. 格式统一使用 `bun run format`，提交前 `bun run format:check` 必须通过
6. 不提交用户未要求的变更（如无关格式化）
7. 提交信息遵循"提交规范"一节，只提供提交信息（英文），提交由用户手动进行

## 构建与发布

- **开发热重载**：`bun run link <vault>/.obsidian/plugins/novelists-assistant` + `bun run dev`，配合 obsidian-hot-reload 插件自动重载
- **版本流程**：`bun run version`（读 package.json 版本 → 更新 manifest.json/versions.json）
- **Release**：打 tag 触发 GitHub Action（bun 环境）自动构建，产物取自根目录
