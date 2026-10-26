import type { QuireKitChatMessagePartProps, QuireKitChatReasoningPart } from '../message-part/types';

/** 独立推理呈现，与 MessagePart 使用相同的身份及展开合同。 */
export interface QuireKitChatReasoningProps extends Omit<QuireKitChatMessagePartProps, 'part'> {
  /** 推理展示投影。 */
  readonly part: QuireKitChatReasoningPart;
}
