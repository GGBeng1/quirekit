import type { QuireKitChatMessageBranch } from '../message/types';

/** 独立受控版本导航；不持有版本内容。 */
export interface QuireKitChatMessageBranchProps {
  /** 有序分支及宿主确认的选中项。 */
  readonly branch: QuireKitChatMessageBranch;
  /** 所属消息身份。 */
  readonly messageId?: string | undefined;
  /** 显式禁止导航。 */
  readonly disabled?: boolean;
}
