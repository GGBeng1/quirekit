import type { ClassicEditorLocale } from "../../../types";

/** Product copy owned by the task feedback leaf. */
export type ClassicEditorTaskMessageKey =
  | "close"
  | "retry"
  | "ready"
  | "choosing"
  | "placing"
  | "uploading"
  | "processing"
  | "inserted"
  | "completed"
  | "cancelled"
  | "error"
  | "image"
  | "text-box"
  | "attachment"
  | "table"
  | "content-control"
  | "link"
  | "creation"
  | "upload"
  | "export"
  | "conversion"
  | "import"
  | "host";

const messages: Readonly<Record<ClassicEditorTaskMessageKey, readonly [string, string]>> = {
  close: ["关闭", "Close"],
  retry: ["重试", "Retry"],
  ready: ["已准备，等待继续", "Ready to continue"],
  choosing: ["正在选择", "Choosing"],
  placing: ["请选择放置位置", "Choose a placement"],
  uploading: ["正在上传", "Uploading"],
  processing: ["正在处理", "Processing"],
  inserted: ["已插入，可继续编辑", "Inserted and ready to edit"],
  completed: ["已完成", "Completed"],
  cancelled: ["已取消", "Cancelled"],
  error: ["未完成", "Not completed"],
  image: ["图片", "Image"],
  "text-box": ["文本框", "Text box"],
  attachment: ["附件", "Attachment"],
  table: ["表格", "Table"],
  "content-control": ["内容控件", "Content control"],
  link: ["链接", "Link"],
  creation: ["创建", "Creation"],
  upload: ["上传", "Upload"],
  export: ["导出", "Export"],
  conversion: ["转换", "Conversion"],
  import: ["导入", "Import"],
  host: ["资源任务", "Resource task"]
};

/**
 * Resolves one bilingual task-surface message.
 *
 * @param locale - Current product locale.
 * @param key - Stable task copy key.
 * @returns Localized text.
 */
export function taskMessage(
  locale: ClassicEditorLocale,
  key: ClassicEditorTaskMessageKey
): string {
  return messages[key][locale === "zh-CN" ? 0 : 1];
}
