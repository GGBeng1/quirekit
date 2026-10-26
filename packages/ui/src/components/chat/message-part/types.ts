import type { QuireKitAlertColor } from '../../alert';
import type { QuireKitAttachmentItem, QuireKitAttachmentLayout, QuireKitAttachmentActionDetails } from '../../attachment';
import type { QuireKitChatAction } from '../shared/types';
import type { QuireKitSource, QuireKitSourceNavigateDetails } from '../../sources/types';
import type { QuireKitChatConfirmationDecision, QuireKitChatConfirmationProps } from '../confirmation/types';
import type { QuireKitChatQuestionAnswer, QuireKitChatQuestionOpenDetails, QuireKitChatQuestionProps, QuireKitChatQuestionSubmitDetails } from '../question/types';

/** 一段内容的接收/终态；不与显示动画进度混用。 */
export type QuireKitChatPartState = 'streaming' | 'complete' | 'stopped' | 'error';
/** 工具执行状态的中立展示投影。 */
export type QuireKitChatToolState = 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled';

/** Part 的身份与局部操作；不包含业务协议。 */
export interface QuireKitChatPartBase {
  /** 消息内唯一、非空的稳定 ID，跨 chunk 和终态保持。 */
  readonly id: string;
  /** 可选的局部操作。 */
  readonly actions?: readonly QuireKitChatAction[];
}

/** 原始正文；Markdown parser 由 renderer adapter 提供。 */
export interface QuireKitChatTextPart extends QuireKitChatPartBase {
  /** 正文判别项。 */
  readonly kind: 'text';
  /** 原始内容，默认安全转义并保留换行。 */
  readonly text: string;
  /** plain 为默认值；markdown 无 renderer 时显示带说明的源文本。 */
  readonly format?: 'plain' | 'markdown';
  /** 内容接收状态，默认 complete。 */
  readonly state?: QuireKitChatPartState;
}

/** 可展开的推理内容。 */
export interface QuireKitChatReasoningPart extends QuireKitChatPartBase {
  /** 推理判别项。 */
  readonly kind: 'reasoning';
  /** 标题；省略时使用语言包中的默认标题。 */
  readonly title?: string;
  /** 可选单行摘要，不由 UI 猜测或定时生成。 */
  readonly summary?: string;
  /** 宿主提供的耗时等次要文案。 */
  readonly meta?: string;
  /** 完整推理文本。 */
  readonly text: string;
  /** 推理状态，默认 complete；不会改变用户的展开选择。 */
  readonly state?: QuireKitChatPartState;
}

/** 工具的中立输入/输出视图，不执行工具。 */
export interface QuireKitChatToolPart extends QuireKitChatPartBase {
  /** 工具判别项。 */
  readonly kind: 'tool';
  /** 可读工具名称。 */
  readonly title: string;
  /** 公共 Icon 名称，默认 terminal；由宿主表达读取、编辑、图片等工具类别。 */
  readonly icon?: string;
  /** 一行任务摘要。 */
  readonly summary?: string;
  /** 耗时等由宿主提供的元信息。 */
  readonly meta?: string;
  /** 权威展示状态，不能根据 output 是否存在猜测。 */
  readonly state: QuireKitChatToolState;
  /** 自定义状态文案，例如具体等待原因。 */
  readonly stateLabel?: string;
  /** 可选原始输入文本。 */
  readonly input?: string;
  /** 可选原始输出文本。 */
  readonly output?: string;
  /** 输入代码语言标签，默认 text。 */
  readonly inputLanguage?: string;
  /** 输出代码语言标签，默认 text。 */
  readonly outputLanguage?: string;
  /** 可读错误说明；不替换已有输出。 */
  readonly error?: string;
  /** 仅提供部分输出时必须传入的截断说明；默认禁止复制不完整输出。 */
  readonly outputTruncated?: string;
}

/** 有明确归属的提示或局部错误。 */
export interface QuireKitChatNoticePart extends QuireKitChatPartBase {
  /** 提示判别项。 */
  readonly kind: 'notice';
  /** 可见标题。 */
  readonly title: string;
  /** 补充说明。 */
  readonly description?: string;
  /** 语义色，默认 neutral；不会隐式改变整条消息状态。 */
  readonly color?: QuireKitAlertColor;
}

/** 由消费端 renderer 解释的扩展内容。 */
export interface QuireKitChatCustomPart extends QuireKitChatPartBase {
  /** 扩展判别项，未知业务类型应显式投影到这里。 */
  readonly kind: 'custom';
  /** 扩展内容的可读名称。 */
  readonly name: string;
  /** 无 renderer 时显示的安全回退文本，不自动转储 data。 */
  readonly fallback: string;
  /** 不透明业务数据，仅转交自定义 slot。 */
  readonly data?: unknown;
}

/** 复用通用附件合同的消息内容，不复制资源或上传模型。 */
export interface QuireKitChatAttachmentPart extends QuireKitChatPartBase {
  /** 附件判别项；一个 Part 可展示一组相关附件。 */
  readonly kind: 'attachment';
  /** 公共附件投影，保留每个附件的稳定身份。 */
  readonly items: readonly QuireKitAttachmentItem[];
  /** 默认 list；图片集合可使用 grid，紧凑上下文可用 inline。 */
  readonly layout?: QuireKitAttachmentLayout;
  /** 集合辅助名称。 */
  readonly label?: string;
  /** 是否允许图片预览，默认 true。 */
  readonly preview?: boolean;
}

/** Ordered sources associated with one stable message content unit. */
export interface QuireKitChatSourcesPart extends QuireKitChatPartBase {
  /** Source list discriminator. */
  readonly kind: 'sources';
  /** Ordered source projections; retrieval and access control stay with the host. */
  readonly sources: readonly QuireKitSource[];
  /** Optional disclosure title. */
  readonly title?: string;
}

/** An approval request presented inline in a message; permission remains with the host. */
export interface QuireKitChatConfirmationPart extends QuireKitChatPartBase, QuireKitChatConfirmationProps {
  /** Approval Part discriminator. */
  readonly kind: 'confirmation';
}

/** A multi-question request presented inline in a message. */
export interface QuireKitChatQuestionPart extends QuireKitChatPartBase, QuireKitChatQuestionProps {
  /** Question Part discriminator. */
  readonly kind: 'question';
}

/** Approval intent with optional message and required Part ownership. */
export interface QuireKitChatConfirmationDecisionDetails extends QuireKitChatConfirmationDecision {
  /** Message owner when rendered in a Message. */
  readonly messageId?: string;
  /** Stable approval Part identity. */
  readonly partId: string;
}

/** Controlled question draft update with message and Part ownership. */
export interface QuireKitChatQuestionDraftDetails {
  /** Message owner when rendered in a Message. */
  readonly messageId?: string;
  /** Stable question Part identity. */
  readonly partId: string;
  /** Current answers, suitable for host-side persistence. */
  readonly answers: readonly QuireKitChatQuestionAnswer[];
}

/** Question submit intent with optional message and required Part ownership. */
export interface QuireKitChatQuestionSubmitPartDetails extends QuireKitChatQuestionSubmitDetails {
  /** Message owner when rendered in a Message. */
  readonly messageId?: string;
  /** Stable question Part identity. */
  readonly partId: string;
}

/** Answer-surface open intent with message and Part ownership. */
export interface QuireKitChatQuestionOpenPartDetails extends QuireKitChatQuestionOpenDetails {
  /** Message owner when rendered in a Message. */
  readonly messageId?: string;
  /** Stable question Part identity. */
  readonly partId: string;
}

/** 附件意图附带消息归属，不与任意 actionId 命令混用。 */
export interface QuireKitChatAttachmentActionDetails extends QuireKitAttachmentActionDetails {
  /** 所属消息；独立 Part 消费时可省略。 */
  readonly messageId?: string | undefined;
  /** 所属附件 Part 的稳定身份。 */
  readonly partId: string;
}

/** Source navigation intent scoped to a chat message part. */
export interface QuireKitChatSourceNavigateDetails extends QuireKitSourceNavigateDetails {
  /** Message owner when rendered as a MessagePart. */
  readonly messageId?: string;
  /** Part owner when rendered as a MessagePart. */
  readonly partId?: string;
}

/** 当前有默认呈现的 Part；Markdown 引擎由消费端接入。 */
export type QuireKitChatMessagePart = QuireKitChatTextPart | QuireKitChatReasoningPart | QuireKitChatToolPart | QuireKitChatNoticePart | QuireKitChatCustomPart | QuireKitChatAttachmentPart | QuireKitChatSourcesPart | QuireKitChatConfirmationPart | QuireKitChatQuestionPart;

/** 独立 Part 组件的公开属性。 */
export interface QuireKitChatMessagePartProps {
  /** 有稳定身份的展示单元。 */
  readonly part: QuireKitChatMessagePart;
  /** 所属消息的身份，独立使用时可省略。 */
  readonly messageId?: string | undefined;
  /** 受控展开状态；省略时组件按 Part 身份持有。 */
  readonly open?: boolean | undefined;
  /** 未受控时的初始状态；流式结束不会强行收起。 */
  readonly defaultOpen?: boolean;
}

/** 只替换内容，保留所属 Part 的默认 chrome 与行为。 */
export interface QuireKitChatPartSlots {
  /** 正文/Markdown renderer。 */
  readonly text?: (context: { part: QuireKitChatTextPart }) => unknown;
  /** 推理详情 renderer；展开行为仍由 Part 持有。 */
  readonly reasoning?: (context: { part: QuireKitChatReasoningPart }) => unknown;
  /** 工具参数 renderer。 */
  readonly 'tool-input'?: (context: { part: QuireKitChatToolPart }) => unknown;
  /** 工具输出 renderer，包括业务预览或审批组合。 */
  readonly 'tool-output'?: (context: { part: QuireKitChatToolPart }) => unknown;
  /** 扩展内容 renderer，不存在时保留可读回退。 */
  readonly custom?: (context: { part: QuireKitChatCustomPart }) => unknown;
}
