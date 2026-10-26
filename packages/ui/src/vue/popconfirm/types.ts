import type { QuireKitPopoverPlacement } from '../../components/popover';
import type { QuireKitTaskRequestContext } from '../../components/task/types';

/** 就近确认的展示与业务执行合同。 */
export interface QuireKitPopconfirmProps {
  /** 确认问题，同时作为浮层的可访问名称。 */
  readonly title: string;
  /** 操作影响或补充说明。 */
  readonly description?: string;
  /** 受控打开状态。 */
  readonly open?: boolean | undefined;
  /** 非受控初始打开状态。 */
  readonly defaultOpen?: boolean;
  /** 禁止打开并取消当前会话。 */
  readonly disabled?: boolean;
  /** 确认按钮上的具体操作名，例如“删除表格”；省略时使用语言包的通用确认。 */
  readonly confirmLabel?: string;
  /** 使用危险操作的语义颜色。 */
  readonly danger?: boolean;
  /** 首选方向，空间不足时自动避让。 */
  readonly placement?: QuireKitPopoverPlacement;
  /** 是否显示定位箭头。 */
  readonly showArrow?: boolean;
  /** 失败时展示的可重试说明，不直接展示内部异常；省略时使用语言包的通用说明。 */
  readonly errorText?: string;
  /** 执行业务；false 保留面板，拒绝时允许重试，成功后发出 confirm。 */
  readonly confirmAction?: (context: QuireKitTaskRequestContext) => void | boolean | Promise<void | boolean>;
  /** 关闭后恢复焦点的目标；删除触发元素时可指向列表的后续操作。 */
  readonly finalFocusEl?: () => HTMLElement | null;
}

/** 内部生命周期事件，不承担异步业务执行。 */
export interface PopconfirmEvents {
  /** 请求更新打开状态。 */
  updateOpen: (open: boolean) => void;
  /** 用户取消，包括 Escape、外部点击和触发器关闭。 */
  cancel: () => void;
  /** 当前会话的业务已成功。 */
  confirm: () => void;
  /** 当前会话的业务失败。 */
  confirmError: (error: unknown) => void;
}

/** Vue resolved props retain explicit undefined for optional inputs. */
export type PopconfirmInput = { readonly [Key in keyof QuireKitPopconfirmProps]?: QuireKitPopconfirmProps[Key] | undefined };
