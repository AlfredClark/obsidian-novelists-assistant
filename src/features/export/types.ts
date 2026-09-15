/** 导出文本的 MIME 类型：显式声明 UTF-8，防下载文件被按系统本地编码解析 */
export const EXPORT_MIME_TYPE = "text/plain;charset=utf-8";

/** 导出文件扩展名 */
export const EXPORT_EXTENSION = ".txt";

/** 导出载荷：下载或复制所需的文件名与纯文本 */
export interface ExportPayload {
  name: string; // 下载文件名（含扩展名）
  text: string; // 清洗后的纯文本
}
