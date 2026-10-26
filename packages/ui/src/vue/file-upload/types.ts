import type { FileUploadFileError, FileUploadFileValidateDetails } from '@ark-ui/vue/file-upload';
import type {
  QuireKitFileUploadAccept, QuireKitFileUploadAcceptDetails, QuireKitFileUploadChangeDetails,
  QuireKitFileUploadCustomSlotProps, QuireKitFileUploadDropzoneSlotProps, QuireKitFileUploadItemSlotProps,
  QuireKitFileUploadRejectDetails, QuireKitFileUploadRejectionSlotProps
} from '../../components/file-upload';

/** Vue FileUpload 的公开属性。 */
export interface FileUploadProps {
  /** 可访问的字段名称；默认布局可见，自定义整个布局时保留为隐藏标签。 */
  readonly label: string;
  /** dropzone 内的主要操作说明；省略时使用当前语言的默认说明。 */
  readonly description?: string;
  /** 约束说明；省略时根据数量和大小自动生成。 */
  readonly hint?: string | undefined;
  /** 可接受的 MIME 类型或 MIME 到扩展名映射。 */
  readonly accept?: QuireKitFileUploadAccept | undefined;
  /** 是否允许选择多个文件。 */
  readonly multiple?: boolean;
  /** 多选时可接受的最大文件数量。 */
  readonly maxFiles?: number;
  /** 单个文件允许的最大字节数。 */
  readonly maxFileSize?: number;
  /** 单个文件允许的最小字节数。 */
  readonly minFileSize?: number;
  /** 未受控使用时的初始文件。 */
  readonly defaultFiles?: File[];
  /** 是否允许拖放文件。 */
  readonly allowDrop?: boolean;
  /** 是否显示清空全部文件操作。 */
  readonly clearable?: boolean;
  /** 是否禁用选择、拖放与删除。 */
  readonly disabled?: boolean;
  /** 是否允许读取但禁止修改。 */
  readonly readOnly?: boolean;
  /** 是否以错误状态呈现。 */
  readonly invalid?: boolean;
  /** 是否要求原生表单提交文件。 */
  readonly required?: boolean;
  /** 原生 file input 的字段名称。 */
  readonly name?: string | undefined;
  /** 宿主追加的文件校验。 */
  readonly validate?: ((file: File, details: FileUploadFileValidateDetails) => FileUploadFileError[] | null) | undefined;
}

/** FileUpload 的可替换内容位置。 */
export interface FileUploadSlots {
  /** 自定义整个可见布局；保留原生文件选择和校验，在后代使用 FileUploadList。 */
  readonly default?: (props: QuireKitFileUploadCustomSlotProps) => unknown;
  /** 替换拖放区域内容，保留拖放和点击选择操作。 */
  readonly dropzone?: (props: QuireKitFileUploadDropzoneSlotProps) => unknown;
  /** 替换一个已接受文件的内容。 */
  readonly item?: (props: QuireKitFileUploadItemSlotProps) => unknown;
  /** 替换一个拒绝文件的内容。 */
  readonly rejection?: (props: QuireKitFileUploadRejectionSlotProps) => unknown;
  /** 没有已接受文件时显示的补充内容。 */
  readonly empty?: () => unknown;
}

/** FileUpload 发出的公开语义事件。 */
export interface FileUploadEmits {
  /** 当前已接受文件发生变化。 */
  fileChange: [details: QuireKitFileUploadChangeDetails];
  /** 新文件通过校验。 */
  fileAccept: [details: QuireKitFileUploadAcceptDetails];
  /** 新文件未通过校验。 */
  fileReject: [details: QuireKitFileUploadRejectDetails];
}
