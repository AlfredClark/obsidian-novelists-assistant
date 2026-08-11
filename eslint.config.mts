import obsidianmd from "eslint-plugin-obsidianmd";
import svelte from "eslint-plugin-svelte";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import { parser } from "typescript-eslint";
import { globalIgnores, defineConfig } from "eslint/config";

export default defineConfig(
  globalIgnores(["node_modules", "dist", "esbuild.config.ts", "scripts/*.ts", "versions.json", "main.js", "tsconfig.json"]),
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["manifest.json"],
        },
        // 基于配置文件自身位置解析，不依赖进程 cwd，IDE 与 CLI 行为一致；
        // import.meta.dirname（Node 20.11+）无 Windows 路径编码问题
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".json", ".svelte"],
      },
    },
  },
  ...obsidianmd.configs.recommendedWithLocalesEn,
  ...svelte.configs["flat/recommended"],
  {
    files: ["package.json"],
    // package.json 以 json 语言解析（obsidianmd 官方块），无 svelte 解析上下文，
    // svelte flat/recommended 中未限定 files 的规则会因 parserServices 缺失而崩溃
    rules: Object.fromEntries(Object.keys(svelte.rules).map((name) => [`svelte/${name}`, "off"])),
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        // <script lang="ts"> 的解析器；.svelte 整体由 svelte-eslint-parser 处理
        parser,
        // .svelte 不经 tsc 项目，类型检查由 svelte-check 承担，避免 projectService 报错
        projectService: false,
      },
    },
  },
  // 关闭与 prettier 冲突的格式规则（须为最后一个 config 块）
  eslintConfigPrettier,
);
