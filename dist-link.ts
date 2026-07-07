import path from "node:path";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";

// Obsidian Plugin Test Vault Dir
const VAULT_DIR = path.resolve("/home/alfredclark/文档/Obsidian/插件测试/");
// eslint-disable-next-line obsidianmd/hardcoded-config-path
const PLUGIN_DIR = path.join(VAULT_DIR, ".obsidian", "plugins");
const distDir = path.resolve("./dist");
const manifestPath = path.resolve("./manifest.json");
const { id } = JSON.parse(readFileSync(manifestPath, "utf-8")) as { id: string };
const linkPath = path.join(PLUGIN_DIR, id);

if (!existsSync(linkPath)) mkdirSync(linkPath, { recursive: true });

if (existsSync(distDir)) rmSync(distDir);

symlinkSync(linkPath, distDir, "dir");
