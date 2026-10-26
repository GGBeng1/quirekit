/** FileUpload 公开的校验错误代码。 */
export type QuireKitFileUploadError =
  | "TOO_MANY_FILES"
  | "FILE_INVALID_TYPE"
  | "FILE_TOO_LARGE"
  | "FILE_TOO_SMALL"
  | "FILE_INVALID"
  | "FILE_EXISTS"
  | (string & {});

/** FileUpload 接受的 MIME 类型或 MIME 到扩展名映射。 */
export type QuireKitFileUploadAccept = string | string[] | Record<string, string[]>;

/** 一个被 FileUpload 拒绝的文件及其原因。 */
export interface QuireKitFileRejection {
  /** 未通过校验的原始文件。 */
  readonly file: File;
  /** 内建校验或宿主 validate 返回的错误代码。 */
  readonly errors: readonly QuireKitFileUploadError[];
}

/** FileUpload 所有文件状态发生变化后的详情。 */
export interface QuireKitFileUploadChangeDetails {
  /** 当前已接受的文件。 */
  readonly acceptedFiles: File[];
  /** 当前被拒绝的文件。 */
  readonly rejectedFiles: QuireKitFileRejection[];
}

/** FileUpload 接受文件后的详情。 */
export interface QuireKitFileUploadAcceptDetails {
  /** 本次接受的文件。 */
  readonly files: File[];
}

/** FileUpload 拒绝文件后的详情。 */
export interface QuireKitFileUploadRejectDetails {
  /** 本次被拒绝的文件及原因。 */
  readonly files: QuireKitFileRejection[];
}

/** FileUpload dropzone 插槽获得的状态。 */
export interface QuireKitFileUploadDropzoneSlotProps {
  /** 是否正有文件拖入 dropzone。 */
  readonly dragging: boolean;
  /** 是否已达到可接受文件上限。 */
  readonly maxFilesReached: boolean;
  /** 仍可加入的文件数量。 */
  readonly remainingFiles: number;
}

/** FileUpload 文件条目插槽获得的状态与操作。 */
export interface QuireKitFileUploadItemSlotProps {
  /** 当前文件。 */
  readonly file: File;
  /** 当前文件在已接受列表中的索引。 */
  readonly index: number;
  /** 已本地化格式化的文件大小。 */
  readonly sizeText: string;
  /** 从当前 FileUpload 中移除此文件。 */
  readonly remove: () => void;
}

/** FileUpload 拒绝条目插槽获得的状态与操作。 */
export interface QuireKitFileUploadRejectionSlotProps {
  /** 当前拒绝详情。 */
  readonly rejection: QuireKitFileRejection;
  /** 当前拒绝条目的索引。 */
  readonly index: number;
  /** 面向用户的本地化错误文本。 */
  readonly message: string;
  /** 从当前 FileUpload 中移除此拒绝条目。 */
  readonly remove: () => void;
}

/** 无默认表单外壳的组合入口；文件校验与原生输入仍由 FileUpload 持有。 */
export interface QuireKitFileUploadCustomSlotProps {
  /** 打开原生文件选择器；应在用户操作中调用。 */
  readonly openFilePicker: () => void;
  /** 从粘贴或拖放的 DataTransfer 增量加入文件，仍经过类型、数量、大小和重复校验；无文件或不可编辑时返回 false。 */
  readonly addTransferFiles: (transfer: DataTransfer) => boolean;
  /** 当前已接受的本地文件。 */
  readonly acceptedFiles: File[];
  /** 当前拒绝列表，用于决定是否显示文件反馈。 */
  readonly rejectedFiles: readonly QuireKitFileRejection[];
  /** 是否不可编辑；自定义入口应同步禁用。 */
  readonly disabled: boolean;
}

/** 放在 FileUpload 后代任意位置的文件列表。 */
export interface QuireKitFileUploadListProps {
  /** list 为纵向表单；compact 自然换行；strip 为单行横向滚动附件带。 */
  readonly layout?: "list" | "compact" | "strip";
  /** 默认显示表单拒绝条目；false 时由宿主监听 fileReject 并用 Toast 等反馈。 */
  readonly showRejections?: boolean;
}
