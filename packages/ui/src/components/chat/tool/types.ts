import type { QuireKitChatMessagePartProps, QuireKitChatToolPart } from '../message-part/types';

/** 独立工具呈现；不调用工具或解释业务参数。 */
export interface QuireKitChatToolProps extends Omit<QuireKitChatMessagePartProps, 'part'> {
  /** 工具展示投影，输入/输出为宿主提供的权威文本。 */
  readonly part: QuireKitChatToolPart;
}
