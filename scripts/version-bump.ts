import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

if (!targetVersion) {
  throw new Error("缺少npm_package_version环境变量");
}

// 从 manifest.json 读取 minAppVersion，并将版本号提升到目标版本
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "  ") + "\n");

// 用目标版本和 manifest.json 中的 minAppVersion 更新 versions.json
// 但仅在 versions.json 中尚不存在目标版本时执行
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
if (!(targetVersion in versions)) {
  versions[targetVersion] = minAppVersion;
  writeFileSync("versions.json", JSON.stringify(versions, null, "  ") + "\n");
}
