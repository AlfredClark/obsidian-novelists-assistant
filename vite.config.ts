import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { builtinModules } from "node:module";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import eslint from "vite-plugin-eslint2";

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/main.ts"),
      formats: ["cjs"],
      fileName: () => "main.js",
    },
    rolldownOptions: {
      external: ["obsidian", "electron", /^@codemirror\//, /^@lezer\//, ...builtinModules],
    },
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: mode === "production" ? false : "inline",
    minify: "esbuild",
  },
  plugins: [
    paraglideVitePlugin({
      project: "./src/i18n/project.inlang",
      outdir: "./src/i18n/paraglide",
    }),
    svelte({
      compilerOptions: {
        css: "injected",
      },
      preprocess: vitePreprocess(),
    }),
    eslint(),
    {
      name: "obsidian-plugin-assets",
      closeBundle() {
        const outDir = path.resolve(__dirname, "dist");
        if (!existsSync(outDir)) mkdirSync(outDir);
        cpSync("manifest.json", path.join(outDir, "manifest.json"));
        const stylesCSS = path.resolve("styles.css");
        if (existsSync(stylesCSS)) cpSync(stylesCSS, path.join(outDir, "styles.css"));
        const mainJs = path.join(outDir, "main.js");
        if (existsSync(mainJs)) cpSync(mainJs, "main.js");
        const mainJsMap = path.join(outDir, "main.js.map");
        if (existsSync(mainJsMap)) cpSync(mainJsMap, "main.js.map");
        const hotReload = path.join(outDir, ".hotreload");
        if (mode === "development") {
          if (!existsSync(hotReload)) writeFileSync(hotReload, "");
        } else {
          if (existsSync(hotReload)) rmSync(hotReload);
        }
      },
    } satisfies Plugin,
  ],
}));
