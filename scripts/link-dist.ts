import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// 用法：bun scripts/link-dist.ts <目标目录> [--hotreload]
const args = process.argv.slice(2);
const hotreload = args.includes("--hotreload");
const target = resolve(args.find((arg) => arg !== "--hotreload") ?? "");

if (!target) {
  throw new Error("用法: bun scripts/link-dist.ts <目标目录>");
}
// 防呆：目标不能是项目根或 dist 自身
if (target === resolve(".") || target === resolve("dist")) {
  throw new Error("目标目录不能是项目根或 dist 本身");
}
// 目标不存在则自动创建（vault 插件目录可能尚未建立）
mkdirSync(target, { recursive: true });

const dist = resolve("dist");
if (existsSync(dist)) {
  const stat = lstatSync(dist);
  if (!stat.isSymbolicLink() && !stat.isDirectory()) {
    throw new Error("dist 既不是目录也不是符号链接");
  }
  // 移除现有 dist（真实目录为构建产物可重建；符号链接仅移除链接本身）
  rmSync(dist, { recursive: true, force: true });
}
// Windows 用 junction（免管理员权限），其余平台用目录符号链接
symlinkSync(target, dist, process.platform === "win32" ? "junction" : "dir");
console.log(`已将 dist 链接到 ${target}`);

// 创建 .hotreload 标记文件，启用 obsidian-hot-reload 插件的自动重载
if (hotreload) {
  writeFileSync(resolve(target, ".hotreload"), "");
  console.log("已在目标目录创建 .hotreload（热重载已启用）");
}
