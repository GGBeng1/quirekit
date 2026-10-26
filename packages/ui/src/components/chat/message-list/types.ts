import type { QuireKitChatMessageProps } from '../message/types';
import type { QuireKitChatPartSlots } from '../message-part/types';
import type { QuireKitClipboardErrorDetails } from '../../clipboard';

/** 单个会话内的消息展示数据；业务 role 与协议由宿主投影。 */
export interface QuireKitChatMessageListItem extends QuireKitChatMessageProps {
  /** 会话内唯一、非空且稳定的身份；不要使用数组下标。 */
  readonly messageId: string;
}

/** 一个会话的消息序列，默认复用 Message 渲染，并管理阅读位置。 */
export interface QuireKitChatMessageListProps {
  /** 已排序的消息展示数据，不包含分页、模型或存储协议。 */
  readonly messages: readonly QuireKitChatMessageListItem[];
  /** 改变时重置消息子树和滚动位置；不缓存跨会话位置。 */
  readonly conversationId?: string;
  /** CSS 高度；100% 要求父容器具有确定高度。 */
  readonly height?: string;
  /** 可滚动区域名称；省略时取语言包。 */
  readonly label?: string;
  /** 是否显示加载更早内容的显式入口。 */
  readonly hasOlder?: boolean;
  /** 历史加载中；宿主应在 loadOlder 后同步设置。 */
  readonly loadingOlder?: boolean;
  /** 默认 Message 的操作展示策略；单条 message.actionsVisibility 优先。 */
  readonly actionsVisibility?: QuireKitChatMessageProps['actionsVisibility'];
}

/** 完整消息 renderer 的数据与顺序。 */
export interface QuireKitChatMessageListItemContext {
  /** 当前消息的中立展示数据。 */
  readonly message: QuireKitChatMessageListItem;
  /** 当前显示顺序；不可作为持久身份。 */
  readonly index: number;
  /** 当前项是否为消息序列最后一条，显式 message.latest 优先。 */
  readonly latest: boolean;
  /** 列表策略与单条消息覆盖后的操作展示模式。 */
  readonly actionsVisibility: NonNullable<QuireKitChatMessageProps['actionsVisibility']>;
}

/** 默认 Message 的 Part renderer 或完整消息替换。 */
export interface QuireKitChatMessageListSlots extends QuireKitChatPartSlots {
  /** 替换默认 Message；自定义组件事件由消费端连接。 */
  readonly message?: (context: QuireKitChatMessageListItemContext) => unknown;
  /** 无消息时的内容。 */
  readonly empty?: () => unknown;
}

/** 消息列表的显式定位命令。 */
export interface QuireKitChatMessageListHandle {
  /** 跳到底部并恢复跟随，不移动焦点。 */
  readonly scrollToLatest: () => void;
  /** 按 key 定位并暂停跟随；不存在时返回 false。 */
  readonly scrollToMessage: (messageId: string) => boolean;
}

/** 默认 Message 复制成功时的所属消息。 */
export interface QuireKitChatMessageListCopyDetails {
  /** 已写入剪贴板的消息身份。 */
  readonly messageId: string;
}

/** 默认 Message 复制失败时保留原因与消息归属。 */
export interface QuireKitChatMessageListCopyErrorDetails extends QuireKitClipboardErrorDetails {
  /** 尝试复制的消息身份。 */
  readonly messageId: string;
}
