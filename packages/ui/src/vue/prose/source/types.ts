import type { QuireKitCodeBlockProps, QuireKitCodeBlockActionsSlotProps, QuireKitCodeBlockLineSlotProps, QuireKitCodeBlockNavigationSlotProps } from "../../code-block/types";
import type { QuireKitProsePreProps } from "../types";

/** Markdown 围栏与通用源码面板的展示合同。 */
export interface QuireKitProseSourceProps extends Omit<QuireKitCodeBlockProps, "code" | "language" | "filename" | "header" | "copy" | "lineNumbers" | "wrap" | "collapsible" | "collapsed" | "defaultCollapsed">, QuireKitProsePreProps {
  /** 标题是否显示；未提供时由 presentation 决定。 */
  readonly header?: boolean | undefined;
  /** 是否显示复制；未提供时沿用 CodeBlock 默认值。 */
  readonly copy?: boolean | undefined;
  /** 是否显示行号；未提供时沿用 CodeBlock 默认值。 */
  readonly lineNumbers?: boolean | undefined;
  /** 是否折行；未提供时沿用 CodeBlock 默认值。 */
  readonly wrap?: boolean | undefined;
  /** 是否可折叠；默认 true，正文先保留说明，按需展开代码。 */
  readonly collapsible?: boolean | undefined;
  /** 受控折叠状态；undefined 保留非受控模式。 */
  readonly collapsed?: boolean | undefined;
  /** 非受控初始折叠状态，默认 true。 */
  readonly defaultCollapsed?: boolean | undefined;
  /** document 保留正文间距；embedded 隐去独立外框并收紧留白；折叠模式始终保留操作标题。 */
  readonly presentation?: "document" | "embedded";
}

/** 高亮适配器接收原始源码和可选围栏元数据。 */
export interface QuireKitProseSourceSlotProps {
  /** 未裁剪或规范化的原始源码，始终为复制权威。 */
  readonly code: string;
  /** 语言元数据。 */
  readonly language: string | undefined;
  /** 文件名元数据。 */
  readonly filename: string | undefined;
  /** 解析器指定的行标记。 */
  readonly highlights: readonly number[] | undefined;
  /** 解析器附加元数据。 */
  readonly meta: string | undefined;
}

/** 源码视图沿用 CodeBlock 的内容与操作扩展点。 */
export interface QuireKitProseSourceSlots {
  /** 渲染器提供的完整 code 元素。 */
  default?: (props: QuireKitProseSourceSlotProps) => unknown;
  /** 显式高亮输出，优先于默认插槽。 */
  code?: (props: QuireKitProseSourceSlotProps) => unknown;
  /** 自定义标题。 */
  title?: () => unknown;
  /** 复制按钮之前的额外操作。 */
  actions?: (props: QuireKitCodeBlockActionsSlotProps) => unknown;
  /** 外部导航，例如文件页签。 */
  navigation?: (props: QuireKitCodeBlockNavigationSlotProps) => unknown;
  /** 在内置行号与行标记中提供语法片段。 */
  line?: (props: QuireKitCodeBlockLineSlotProps) => unknown;
}
