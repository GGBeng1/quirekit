/** Attachment and Attachments interface text. */
export interface Messages {
  /** Default accessible name of an attachment collection. */
  readonly attachments: string;
  /** Open action. */
  readonly open: string;
  /** Download action. */
  readonly download: string;
  /** Retry a failed resource or upload. */
  readonly retry: string;
  /** Remove action. */
  readonly remove: string;
  /** Upload in progress. */
  readonly uploading: string;
  /** Upload failed. */
  readonly failed: string;
  /** Resource unavailable. */
  readonly unavailable: string;
  /** Thumbnail failed to load; the file itself is unaffected. */
  readonly previewError: string;
  /** Reload the thumbnail, separate from the host's upload retry. */
  readonly previewRetry: string;
  /** Scroll the attachment strip back. */
  readonly previous: string;
  /** Scroll the attachment strip forward. */
  readonly next: string;
  /** Accessible name of an action or status applied to one file. */
  readonly forFile: (action: string, fileName: string) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  attachments: "附件", open: "打开", download: "下载", retry: "重试", remove: "移除",
  uploading: "上传中", failed: "上传失败", unavailable: "附件不可用", previewError: "缩略图加载失败", previewRetry: "重新加载缩略图",
  previous: "查看前面的附件", next: "查看后面的附件",
  forFile: (action, fileName) => `${action} ${fileName}`
};

/** English. */
export const en: Messages = {
  attachments: "Attachments", open: "Open", download: "Download", retry: "Retry", remove: "Remove",
  uploading: "Uploading", failed: "Upload failed", unavailable: "Attachment unavailable", previewError: "Thumbnail failed to load",
  previewRetry: "Reload thumbnail", previous: "Show earlier attachments", next: "Show later attachments",
  forFile: (action, fileName) => `${action} ${fileName}`
};
