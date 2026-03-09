export interface ReportRecord {
  id: string;
  title: string; // 如 "体检报告解读"
  summary: string; // 解读结果摘要（前200字）
  fullContent: string; // 完整解读内容（markdown）
  imageUrl?: string; // 上传的图片预览URL
  pdfFileName?: string; // PDF文件名
  createdAt: number; // 时间戳
}
