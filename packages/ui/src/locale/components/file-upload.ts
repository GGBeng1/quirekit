/** FileUpload 与 FileUploadList 的界面文案，由当前语言包提供。 */
export interface Messages {
  /** dropzone 内未提供 description 时的操作说明。 */
  readonly dropzone: string;
  /** 打开系统文件选择的按钮。 */
  readonly choose: string;
  /** 清空全部已选文件。 */
  readonly clearAll: string;
  /** 已选择数量提示。 */
  readonly selected: (count: number, maxFiles: number) => string;
  /** 未提供 hint 时的约束说明；maxFileSize 为已格式化的大小，无上限时省略。 */
  readonly hint: (limits: { readonly multiple: boolean; readonly maxFiles: number; readonly maxFileSize?: string }) => string;
  /** 图片预览的可访问名称。 */
  readonly preview: (fileName: string) => string;
  /** 移除单个文件的可访问名称。 */
  readonly remove: (fileName: string) => string;
  /** 按校验错误代码给出的说明；未列出的代码原样显示。 */
  readonly errors: Readonly<Partial<Record<string, string>>>;
  /** 同一文件多条错误之间的分隔符。 */
  readonly errorSeparator: string;
}

/** @param count - Item count. @param noun - Singular noun. @returns Count with an English plural. */
function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  dropzone: "拖拽文件到此处，或点击区域选择",
  choose: "选择文件",
  clearAll: "清空全部",
  selected: (count, maxFiles) => `已选择 ${count} / ${maxFiles}`,
  hint: ({ multiple, maxFiles, maxFileSize }) => {
    const count = multiple ? `最多 ${maxFiles} 个文件` : "仅限 1 个文件";
    return maxFileSize === undefined ? count : `${count}，单个不超过 ${maxFileSize}`;
  },
  preview: fileName => `预览 ${fileName}`,
  remove: fileName => `移除 ${fileName}`,
  errors: {
    TOO_MANY_FILES: "文件数量超过上限", FILE_INVALID_TYPE: "不支持此文件类型", FILE_TOO_LARGE: "文件超过大小上限",
    FILE_TOO_SMALL: "文件小于大小下限", FILE_INVALID: "文件未通过校验", FILE_EXISTS: "文件已经存在"
  },
  errorSeparator: "、"
};

/** English. */
export const en: Messages = {
  dropzone: "Drop files here, or click to choose",
  choose: "Choose files",
  clearAll: "Clear all",
  selected: (count, maxFiles) => `${count} of ${maxFiles} selected`,
  hint: ({ multiple, maxFiles, maxFileSize }) => {
    const count = multiple ? `Up to ${plural(maxFiles, "file")}` : "One file only";
    return maxFileSize === undefined ? count : `${count}, ${maxFileSize} each at most`;
  },
  preview: fileName => `Preview ${fileName}`,
  remove: fileName => `Remove ${fileName}`,
  errors: {
    TOO_MANY_FILES: "Too many files", FILE_INVALID_TYPE: "Unsupported file type", FILE_TOO_LARGE: "File is too large",
    FILE_TOO_SMALL: "File is too small", FILE_INVALID: "File failed validation", FILE_EXISTS: "File already added"
  },
  errorSeparator: ", "
};
