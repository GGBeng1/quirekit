import type { QuireKitDialogRole } from "../dialog";
import type { QuireKitTaskApi, QuireKitTaskCloseReason, QuireKitTaskCloseRequest } from "../task";

/** Drawer 进入视口的逻辑边缘。 */
export type QuireKitDrawerSide = "start" | "end" | "bottom";

/** Drawer 的公开宽度档位。 */
export type QuireKitDrawerSize = "small" | "medium" | "large";

/** 关闭请求的来源。 */
export type QuireKitDrawerCloseReason = QuireKitTaskCloseReason;

/** 可同步取消的关闭请求。 */
export type QuireKitDrawerCloseRequest = QuireKitTaskCloseRequest;

/** 可通过模板引用调用的面板方法。 */
export type QuireKitDrawerRootApi = QuireKitTaskApi;

/** Drawer 打开状态、方向与拖动设置。 */
export interface QuireKitDrawerRootProps {
  /** 可取消关闭回调；提供时禁用拖拽，支持 Vue 的 close-request 事件绑定。 */
  readonly onCloseRequest?: (request: QuireKitDrawerCloseRequest) => void;
  /** 受控打开状态；省略时由组件管理。 */
  readonly open?: boolean | undefined;
  /** 非受控模式的初始打开状态。 */
  readonly defaultOpen?: boolean;
  /** 面板进入和拖拽关闭的逻辑边缘。 */
  readonly side?: QuireKitDrawerSide;
  /** Drawer 或 AlertDialog 角色。 */
  readonly role?: QuireKitDialogRole;
  /** 是否启用模态隔离。 */
  readonly modal?: boolean;
  /** 是否约束键盘焦点。 */
  readonly trapFocus?: boolean;
  /** 是否锁定背景滚动。 */
  readonly preventScroll?: boolean;
  /** 是否在关闭后归还焦点。 */
  readonly restoreFocus?: boolean;
  /** 是否响应 Escape 关闭请求。 */
  readonly closeOnEscape?: boolean;
  /** 是否响应外部交互关闭请求。 */
  readonly closeOnInteractOutside?: boolean;
  /** 打开时首个接收焦点的元素解析器。 */
  readonly initialFocusEl?: () => HTMLElement | null;
  /** 关闭时显式接收焦点的元素解析器。 */
  readonly finalFocusEl?: () => HTMLElement | null;
  /** Drawer 可停靠的比例或尺寸位置。 */
  readonly snapPoints?: Array<number | string>;
  /** 受控的当前停靠位置。 */
  readonly snapPoint?: number | string | null | undefined;
  /** 非受控模式的初始停靠位置。 */
  readonly defaultSnapPoint?: number | string | null;
  /** 受控的当前 Trigger 标识。 */
  readonly triggerValue?: string | null | undefined;
  /** 非受控模式的初始 Trigger 标识。 */
  readonly defaultTriggerValue?: string | null;
  /** 是否依次经过中间停靠位置。 */
  readonly snapToSequentialPoints?: boolean;
  /** 是否阻止从可滚动正文开始拖拽。 */
  readonly preventDragOnScroll?: boolean;
  /** 是否允许拖拽；关闭守卫存在时仍保持禁用。 */
  readonly dragEnabled?: boolean;
  /** 是否延迟挂载内容。 */
  readonly lazyMount?: boolean;
  /** 退出动画完成后是否卸载内容。 */
  readonly unmountOnExit?: boolean;
}
