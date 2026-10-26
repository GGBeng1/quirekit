import type { QuireKitButtonColor } from '../../button';
import type { QuireKitChatComposerInputProps } from '../composer-input/types';

/** 原始文本提交意图；持久化与清空由宿主决定。 */
export interface QuireKitChatSubmitDetails {
  /** 未裁剪的当前草稿。 */
  readonly text: string;
}

/** 多区域面板或单行指令；草稿和业务状态始终由宿主持有。 */
export interface QuireKitChatComposerProps extends Omit<QuireKitChatComposerInputProps, 'variant'> {
  /** panel 正文独占上行；inline 输入和动作并排，默认从一行增高。 */
  readonly layout?: 'panel' | 'inline';
  /** comfortable 保留常规内边距；compact 缩紧表面和发送按钮，适合编辑器侧栏。 */
  readonly density?: 'comfortable' | 'compact';
  /** 表面外观，保持同一输入和焦点边界。 */
  readonly variant?: 'outline' | 'elevated' | 'soft';
  /** 显示停止动作并禁止再次提交；输入默认仍可编辑。 */
  readonly busy?: boolean;
  /** 禁用输入、发送与停止；插槽内自定义动作使用 context.disabled 同步。 */
  readonly disabled?: boolean;
  /** 保留复制但禁止修改与发送；仍允许停止。 */
  readonly readOnly?: boolean;
  /** 存在可提交的外部内容，例如宿主持有的附件，允许空文本提交。 */
  readonly hasContent?: boolean;
  /** 仅禁止发送，例如附件等待就绪；不影响编辑或停止。 */
  readonly submitDisabled?: boolean;
  /** 可选的文件粘贴/拖入接缝；返回 true 表示已交给 FileUpload 等所有者处理，不拦截普通文字。 */
  readonly addTransferFiles?: (transfer: DataTransfer) => boolean;
  /** 默认圆形图标提交；text 显示文字按钮。 */
  readonly submitAppearance?: 'icon' | 'text';
  /** 默认 primary 主题主色，可选择其他公共 Button 语义色。 */
  readonly submitColor?: QuireKitButtonColor;
}

/** 自定义输入和操作共享的文本接缝；富输入拥有自己的键盘、选区与焦点。 */
export interface QuireKitChatComposerContext {
  /** 当前受控草稿。 */
  readonly value: string;
  /** 输入框名称。 */
  readonly label: string;
  /** 是否禁用。 */
  readonly disabled: boolean;
  /** 是否只读。 */
  readonly readOnly: boolean;
  /** 是否正在处理。 */
  readonly busy: boolean;
  /** 文本或外部内容非空，且所有提交门禁允许。 */
  readonly canSubmit: boolean;
  /** 通知宿主更新草稿。 */
  readonly updateValue: (value: string) => void;
  /** 发出原始草稿的提交意图。 */
  readonly submit: () => void;
  /** 发出停止意图。 */
  readonly stop: () => void;
}

/** Composer 默认轻量输入的实例能力；自定义 input 的焦点由宿主持有。 */
export interface QuireKitChatComposerInstance {
  /** 聚焦默认输入并保留选区；使用 input slot 时由其自身实例处理。
   * @param options - 原生焦点滚动选项。
   */
  focus(options?: FocusOptions): void;
}

/** 输入区可替换区域。 */
export interface QuireKitChatComposerSlots {
  /** 附件或引用等上部内容。 */
  readonly header?: (context: QuireKitChatComposerContext) => unknown;
  /** 与输入并排的图标或上下文入口。 */
  readonly leading?: (context: QuireKitChatComposerContext) => unknown;
  /** 替换默认 Textarea；自行处理输入法和键盘。 */
  readonly input?: (context: QuireKitChatComposerContext) => unknown;
  /** 起始侧的附件、权限等宿主操作。 */
  readonly tools?: (context: QuireKitChatComposerContext) => unknown;
  /** 结束侧、发送之前的模型、语音等宿主操作。 */
  readonly actions?: (context: QuireKitChatComposerContext) => unknown;
  /** 替换默认发送/停止按钮。 */
  readonly submit?: (context: QuireKitChatComposerContext) => unknown;
  /** 提示、错误或恢复操作。 */
  readonly footer?: (context: QuireKitChatComposerContext) => unknown;
}
