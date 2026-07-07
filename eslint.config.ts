import js from "@eslint/js";
import path from "node:path";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import obsidianmd from "eslint-plugin-obsidianmd";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig, includeIgnoreFile } from "eslint/config";

const gitignorePath = path.resolve(import.meta.dirname, ".gitignore");

export default defineConfig(
  // 继承 .gitignore 中的忽略规则
  includeIgnoreFile(gitignorePath),

  // ESLint 推荐规则 + TypeScript 推荐规则 + Obsidian 插件推荐规则
  js.configs.recommended,
  tseslint.configs.recommended,
  obsidianmd.configs.recommended,

  // 全局语言选项：浏览器全局变量 + TypeScript 项目服务
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["manifest.json"],
        },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".svelte"],
      },
    },
  },

  // 全局自定义规则
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  // Svelte 推荐规则 + Prettier 兼容规则（限定 .svelte 文件，避免干扰其他文件）
  ...svelte.configs.recommended.map((c) => ({
    ...c,
    files: c.files ?? ["**/*.svelte"],
  })),
  ...svelte.configs.prettier.map((c) => ({
    ...c,
    files: c.files ?? ["**/*.svelte"],
  })),

  // .svelte 文件：使用 TypeScript 解析器解析 <script lang="ts">，禁用冲突的 no-unused-vars
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
    rules: { "no-unused-vars": "off" },
  },

  // 关闭与 Prettier 冲突的格式规则（放在 Svelte prettier 之后，确保 Svelte 格式规则优先）
  eslintConfigPrettier,

  // main.js.map 不在 .gitignore 中，额外忽略
  { ignores: ["main.js.map"] },

  // 文件级规则豁免
  {
    files: ["dist-link.ts"],
    rules: {
      "eslint-comments/require-description": "off",
      "eslint-comments/no-restricted-disable": "off",
    },
  },
  {
    files: ["package.json"],
    rules: { "depend/ban-dependencies": "off" },
  },
);
