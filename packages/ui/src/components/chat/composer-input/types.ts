import type { QuireKitTextareaSize, QuireKitTextareaVariant } from '../../textarea';

/** 轻量 Chat 文本输入；不持有请求或草稿清空。 */
export interface QuireKitChatComposerInputProps {
  /** 受控原始文本。 */
  readonly modelValue: string;
  /** 输入框可访问名称；省略时取语言包。 */
  readonly label?: string;
  /** 宿主场景的空草稿提示；省略时取语言包。 */
  readonly placeholder?: string;
  /** 输入文字和内间距的 Textarea 尺寸，默认 md；不改变工具控件尺寸。 */
  readonly size?: QuireKitTextareaSize;
  /** 禁用输入。 */
  readonly disabled?: boolean;
  /** 保留复制但禁止修改。 */
  readonly readOnly?: boolean;
  /** enter 发送、Shift+Enter 换行；button 保留原生 Enter。 */
  readonly submitMode?: 'enter' | 'button';
  /** 自动增高的最小行数。 */
  readonly rows?: number;
  /** 自动增高的最大行数。 */
  readonly maxRows?: number;
  /** 独立使用默认 outline；复合输入的容器提供边界时使用 embedded。 */
  readonly variant?: QuireKitTextareaVariant;
}

/** 文本输入的公开实例，不暴露内部 DOM。 */
export interface QuireKitChatComposerInputInstance {
  /** 聚焦原生输入，保留当前选区。
   * @param options - 原生焦点滚动选项。
   */
  focus(options?: FocusOptions): void;
}
