import type { UsePopoverReturn } from "@ark-ui/vue/popover";
import type { QuireKitPopoverPlacement } from "../../components/popover";

/** Vue Popover 根组件的公开属性。 */
export interface PopoverRuntimeProps {
  /** 受控打开状态；省略时由组件管理。 */
  readonly open?: boolean | undefined;
  /** 非受控模式的初始打开状态。 */
  readonly defaultOpen?: boolean;
  /** 浮层相对锚点的首选方位。 */
  readonly placement?: QuireKitPopoverPlacement;
  /** 是否把浮层内容传送到文档 body。 */
  readonly portalled?: boolean;
  /** 是否禁用外部交互并把焦点约束在浮层内。 */
  readonly modal?: boolean;
  /** 打开时是否把焦点移动到浮层首个可聚焦元素。 */
  readonly autoFocus?: boolean;
  /** 关闭时是否把焦点返回打开前的元素。 */
  readonly restoreFocus?: boolean;
  /** 是否响应 Escape 关闭请求。 */
  readonly closeOnEscape?: boolean;
  /** 是否响应浮层外部的交互关闭请求。 */
  readonly closeOnInteractOutside?: boolean;
  /** 锚点被滚动裁剪层完全遮挡时是否隐藏定位层。 */
  readonly hideWhenDetached?: boolean;
  /** 打开后首个接收焦点的元素解析器。 */
  readonly initialFocusEl?: () => HTMLElement | null;
  /** 关闭后显式接收焦点的元素解析器。 */
  readonly finalFocusEl?: () => HTMLElement | null;
}

/** Vue setup materializes absent optional properties as explicit undefined values. */
export type PopoverRuntimeInput = { readonly [Key in keyof PopoverRuntimeProps]?: PopoverRuntimeProps[Key] | undefined };

/** Private anatomy identity for a task's persistent opening element. */
export interface PopoverRuntimeIdentity {
  /** Unique scope of this resident machine. */
  readonly id: string;
  /** Real elements shared by the task's mutually exclusive surface branches. */
  readonly ids: {
    /** Persistent real trigger. */
    readonly trigger: string;
    /** The task's single mounted content element. */
    readonly content: string;
  };
}

/** Public model and dismissal notifications produced by the existing adapter. */
export interface PopoverRuntimeEvents {
  /** @param open - Requested controlled model value. */
  updateOpen(open: boolean): void;
  /** @param open - Original adapter's semantic update notification. */
  openChange(open: boolean): void;
  /** @param event - Original cancelable Escape event. */
  escapeKeyDown(event: KeyboardEvent): void;
  /** @param event - Original cancelable outside interaction. */
  interactOutside(event: Event): void;
}

/** Provider input kept private so task composition does not expose Ark APIs. */
export interface PopoverRuntime {
  /** Reactive Ark API with the adapter's existing owner and model projection. */
  readonly api: UsePopoverReturn;
}
