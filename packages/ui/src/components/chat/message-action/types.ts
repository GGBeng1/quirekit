import type { QuireKitChatAction } from '../shared/types';

/** 可独立使用的消息命令，复用公共按钮和 Tooltip。 */
export interface QuireKitChatMessageActionProps {
  /** 命令描述；业务执行由 action 事件接收者负责。 */
  readonly action: QuireKitChatAction;
  /** 图标操作默认提供 Tooltip；作为已有菜单 trigger 时可关闭。 */
  readonly tooltip?: boolean;
}
