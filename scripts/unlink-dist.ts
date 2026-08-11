import { existsSync, lstatSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve("dist");
if (!existsSync(dist)) {
  console.log("dist 不存在，无需取消链接");
  process.exit(0);
}
if (!lstatSync(dist).isSymbolicLink()) {
  console.log("dist 不是符号链接（已是普通目录），无需取消链接");
  process.exit(0);
}
// 仅移除链接本身，不影响链接目标目录
rmSync(dist, { recursive: true, force: true });
console.log("已取消链接（下次构建将重新生成真实 dist 目录）");
