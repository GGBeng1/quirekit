/** 复制内容的呈现形式。 */
export type QuireKitClipboardMode = "input" | "text" | "icon";

/** 系统剪贴板完成写入后的反馈事件。 */
export interface QuireKitClipboardStatusDetails {
  /** 是否处于已确认写入的复制反馈状态。 */
  readonly copied: boolean;
}

/** 一次系统剪贴板写入失败的详情。 */
export interface QuireKitClipboardErrorDetails {
  /** 本次尝试复制的文本。 */
  readonly value: string;
  /** 浏览器拒绝写入或 API 不可用的原因。 */
  readonly error: unknown;
}

/** Clipboard 内容和触发器插槽状态。 */
export interface QuireKitClipboardSlotProps {
  /** 当前待复制文本。 */
  readonly value: string;
  /** 是否处于复制反馈态。 */
  readonly copied: boolean;
  /** 是否正在等待系统剪贴板写入结果。 */
  readonly copying: boolean;
  /** 最近一次写入是否失败；重试或更新文本后清除。 */
  readonly error: boolean;
}

/** 替换完整复制控件时仍复用 Clipboard 的写入、反馈和错误所有权。 */
export interface QuireKitClipboardControlSlotProps extends QuireKitClipboardSlotProps {
  /** 已合并外部禁用与空值；复制中使用 copying 表达，避免禁用按钮导致失焦。 */
  readonly disabled: boolean;
  /** 失败时应绑定到触发器 aria-describedby 的说明身份。 */
  readonly describedBy: string | undefined;
  /** 经过可用性检查的复制入口，不需要调用方操作系统剪贴板。 */
  readonly copy: () => void;
}
