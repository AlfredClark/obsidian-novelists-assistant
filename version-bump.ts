import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version ?? "0.0.0";

type Manifest = {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  isDesktopOnly: boolean;
  author: string;
  authorUrl: string;
  fundingUrl: string;
};

const manifest = JSON.parse(readFileSync("manifest.json", "utf8")) as Manifest;
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

const versions = JSON.parse(readFileSync("versions.json", "utf8")) as Record<string, string>;
if (!Object.keys(versions).includes(targetVersion)) {
  versions[targetVersion] = minAppVersion;
  writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
}
