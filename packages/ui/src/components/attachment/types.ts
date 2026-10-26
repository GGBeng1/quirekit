/** 附件展示密度，不决定资源类型或业务用途。 */
export type QuireKitAttachmentLayout = 'inline' | 'list' | 'grid' | 'strip';
/** 宿主投影的资源状态，上传协议不属于公共 UI。 */
export type QuireKitAttachmentState = 'ready' | 'uploading' | 'failed' | 'unavailable';
/** 宿主执行的附件操作；图片预览由 UI 自己处理。 */
export type QuireKitAttachmentAction = 'open' | 'download' | 'retry' | 'remove';

/** 跨文档、消息和输入区复用的附件展示数据。 */
export interface QuireKitAttachmentItem {
  /** 集合内唯一、跨更新稳定的身份；不使用索引或资源地址。 */
  readonly id: string;
  /** 可读文件名。 */
  readonly name: string;
  /** MIME 类型；图片类型可启用缩略图和预览。 */
  readonly mediaType?: string;
  /** 字节数；省略或无效时不显示大小。 */
  readonly size?: number;
  /** 可选来源元数据，不改变 URL 所有权。 */
  readonly source?: 'local' | 'remote';
  /** 宿主持有的资源地址；公共 UI 不创建或释放它。 */
  readonly url?: string;
  /** 独立缩略图地址；省略时图片使用 url。 */
  readonly thumbnailUrl?: string;
  /** 图片说明，省略时使用 name。 */
  readonly alt?: string;
  /** 展示状态，默认 ready。 */
  readonly state?: QuireKitAttachmentState;
  /** 上传百分比；有限数钳制至 0–100，无效或省略时为未知进度。 */
  readonly progress?: number;
  /** 宿主补充的状态说明，例如失败原因。 */
  readonly statusText?: string;
  /** 明确允许的操作，默认不显示任何业务操作；UI 再按 state 过滤。 */
  readonly actions?: readonly QuireKitAttachmentAction[];
}

/** 附件操作意图；并不意味着业务已经执行成功。 */
export interface QuireKitAttachmentActionDetails {
  /** 宿主提供的稳定附件身份。 */
  readonly attachmentId: string;
  /** 请求执行的操作。 */
  readonly action: QuireKitAttachmentAction;
}

/** 单份附件的公共属性。 */
export interface QuireKitAttachmentProps {
  /** 稳定的文件/图片展示数据。 */
  readonly item: QuireKitAttachmentItem;
  /** 展示密度，默认 list。 */
  readonly layout?: QuireKitAttachmentLayout | undefined;
  /** 是否允许图片预览，默认 true；业务 open 不受此项控制。 */
  readonly preview?: boolean | undefined;
}

/** 附件集合的公共属性。 */
export interface QuireKitAttachmentsProps extends Omit<QuireKitAttachmentProps, 'item'> {
  /** 按显示顺序提供的附件；每个 id 必须唯一。 */
  readonly items: readonly QuireKitAttachmentItem[];
  /** 集合辅助名称；省略时取语言包。 */
  readonly label?: string | undefined;
}
