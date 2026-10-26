/** 展示状态，不表示请求协议或 Agent 生命周期。 */
export type QuireKitChatMessageState = 'pending' | 'streaming' | 'complete' | 'stopped' | 'error';

/** 消息和 Part 共用的命令配置；执行归宿主。 */
export interface QuireKitChatAction {
  /** 在所属操作组内稳定且唯一的标识。 */
  readonly id: string;
  /** 可见名称或图标操作的辅助名称。 */
  readonly label: string;
  /** IconProvider 中的图标名；省略时显示文字按钮。 */
  readonly icon?: string;
  /** 明确不可执行时禁用。 */
  readonly disabled?: boolean;
  /** 宿主正在处理此操作；阻止重复触发。 */
  readonly busy?: boolean;
  /** 内联反馈/开关类操作的受控按下状态；有此状态的操作保持内联。 */
  readonly pressed?: boolean;
  /** 需要危险语义的操作。 */
  readonly danger?: boolean;
  /** inline 留在操作栏，more 放进紧凑的公共 Menu。 */
  readonly placement?: 'inline' | 'more';
  /** 消息级默认 settled，Part 级默认 always；active 用于停止，always 用于必要恢复/确认。 */
  readonly when?: 'settled' | 'active' | 'always';
}

/** 公共操作请求，不表示业务已经完成。 */
export interface QuireKitChatActionDetails {
  /** 消息身份；独立 Part 或旧式 slot 消费可省略。 */
  readonly messageId?: string;
  /** Part 级操作的稳定身份；消息级不提供。 */
  readonly partId?: string;
  /** 命令配置中的标识。 */
  readonly actionId: string;
}
