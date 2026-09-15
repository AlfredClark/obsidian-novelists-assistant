/**
 * 判断路径是否位于目录内（含目录自身）；归一化尾斜杠防手输 "目录/" 失效，空目录前缀 "/" 恒不匹配。
 * 自 quick-menu 迁出：新建章节与导出共用同一正文目录归属判定。
 * @param filePath 待判定文件路径
 * @param dirPath 目标目录路径
 * @returns 位于目录内或为目录自身时返回 true
 */
export function isInsideOrSelf(filePath: string, dirPath: string): boolean {
  const dir = dirPath.replace(/\/+$/, "");
  return filePath === dir || filePath.startsWith(dir + "/");
}
