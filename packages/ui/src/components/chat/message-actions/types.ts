import type { QuireKitChatAction, QuireKitChatMessageState } from '../shared/types';

/** 消息或 Part 的操作组合；可独立使用。 */
export interface QuireKitChatMessageActionsProps {
  /** 所属消息身份。 */
  readonly messageId?: string | undefined;
  /** 局部 Part 身份。 */
  readonly partId?: string | undefined;
  /** 命令配置。 */
  readonly actions?: readonly QuireKitChatAction[] | undefined;
  /** settled 状态下可复制的权威文本；不从 DOM 收集。 */
  readonly copyText?: string | undefined;
  /** 当前消息展示状态，默认 complete。 */
  readonly state?: QuireKitChatMessageState;
  /** auto/hover 的渐进展示不影响触屏、键盘和必要操作。 */
  readonly visibility?: 'auto' | 'always' | 'hover';
  /** auto 模式下是否为最新消息，默认 true。 */
  readonly latest?: boolean;
}
