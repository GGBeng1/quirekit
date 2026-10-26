import type { QuireKitChatMessagePart, QuireKitChatPartSlots } from '../message-part/types';
import type { QuireKitChatAction, QuireKitChatMessageState } from '../shared/types';

/** 受控的消息分支导航，不持有分支内容和持久化。 */
export interface QuireKitChatMessageBranch {
  /** 有序、唯一、非空的分支身份。 */
  readonly ids: readonly string[];
  /** 由宿主确认的当前分支。 */
  readonly selectedId: string;
}

/** 请求切换展示分支，不代表 fork 或重新生成。 */
export interface QuireKitChatBranchChangeDetails {
  /** 所属消息身份。 */
  readonly messageId?: string;
  /** 请求展示的分支身份。 */
  readonly branchId: string;
}

/** 协议无关的消息组合，内置 Part 与操作呈现。 */
export interface QuireKitChatMessageProps {
  /** 可见发送者名称，也是 article 的辅助名称。 */
  readonly author: string;
  /** 稳定消息身份；数据消费建议提供，改变时清理内部 Part/复制状态。 */
  readonly messageId?: string;
  /** 逻辑起始/结束位置，随 RTL 方向变化。 */
  readonly align?: 'start' | 'end';
  /** plain 用于正文；soft 为短消息提供轻背景。 */
  readonly variant?: 'plain' | 'soft';
  /** 是否显示作者行，默认 false；隐藏时仍保留 article 的辅助名称。 */
  readonly showHeader?: boolean;
  /** 宿主格式化的尾部时间或次要说明。 */
  readonly meta?: string;
  /** 有序稳定 Part；default slot 存在时由该 slot 接管内容。 */
  readonly parts?: readonly QuireKitChatMessagePart[];
  /** 整条消息的展示状态，不从 Part 状态推断。 */
  readonly state?: QuireKitChatMessageState;
  /** 覆盖当前状态的可读说明，error 时可解释恢复方式。 */
  readonly statusText?: string;
  /** 权威复制原文；省略时不显示内置复制，不从 DOM 提取。 */
  readonly copyText?: string;
  /** 消息级操作；组件只发 intent，执行由宿主负责。 */
  readonly actions?: readonly QuireKitChatAction[];
  /** 受控分支；数量不足二时不渲染导航。 */
  readonly branch?: QuireKitChatMessageBranch;
  /** auto 默认：最新消息的操作与时间常驻，历史 footer 在桌面 hover/focus 时显示；触屏常驻。 */
  readonly actionsVisibility?: 'auto' | 'always' | 'hover';
  /** 是否为最新消息，默认 true；由消费者投影，不扫描会话。 */
  readonly latest?: boolean;
}

/** 消息内容由宿主投影，不要求固定 parts 协议。 */
export interface QuireKitChatMessageSlots extends QuireKitChatPartSlots {
  /** 发送者头像或标记。 */
  readonly avatar?: () => unknown;
  /** 替换发送者标题，例如加入时间。 */
  readonly header?: () => unknown;
  /** 正文、Prose、代码或业务 part；宿主提供稳定 key。 */
  readonly default?: () => unknown;
  /** 可读的生成、失败或停止状态。 */
  readonly status?: () => unknown;
  /** 复制、重试、反馈等宿主操作；替换内置组时可沿用解析后的展示策略。 */
  readonly actions?: (context: QuireKitChatMessageActionsSlotContext) => unknown;
}

/** 完全替换消息操作时的展示策略。 */
export interface QuireKitChatMessageActionsSlotContext {
  /** 是否为最新消息。 */
  readonly latest: boolean;
  /** 操作组的展示模式。 */
  readonly visibility: NonNullable<QuireKitChatMessageProps['actionsVisibility']>;
}
