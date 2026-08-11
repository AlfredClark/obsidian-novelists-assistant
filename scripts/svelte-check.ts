import { readdirSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";

// 递归查找目录下是否存在 .svelte 文件
function hasSvelteFiles(dir: string): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasSvelteFiles(full)) return true;
    } else if (entry.name.endsWith(".svelte")) {
      return true;
    }
  }
  return false;
}

// svelte-check 在项目无 svelte 输入文件时会输出 NO_SVELTE_INPUT 警告，
// 配合 --fail-on-warnings 会使构建失败；因此仅在存在组件时执行检查
if (hasSvelteFiles("src")) {
  const result = spawnSync("svelte-check", ["--tsconfig", "tsconfig.json", "--fail-on-warnings"], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
