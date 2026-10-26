import type { ComputedRef, HTMLAttributes, StyleValue } from "vue";
import type { QuireKitDrawerCloseReason, QuireKitDrawerCloseRequest, QuireKitDrawerRootApi, QuireKitDrawerRootProps, QuireKitDrawerSize } from "../../components/drawer";
import type { DrawerSnapPointChangeDetails, DrawerTriggerValueChangeDetails, UseDrawerReturn } from "@ark-ui/vue/drawer";

/** Vue materializes absent optional properties as undefined in its setup props object. */
export type DrawerRuntimeProps = { readonly [Key in keyof QuireKitDrawerRootProps]?: QuireKitDrawerRootProps[Key] | undefined };

/** Private identity for composites retaining a trigger outside the provider. */
export interface DrawerRuntimeIdentity {
  /** Unique machine scope, independent of other resident surfaces. */
  readonly id: string;
  /** Existing Ark anatomy ids belonging to the composite's real elements. */
  readonly ids: {
    /** Persistent real opening button. */
    readonly trigger: string;
    /** The single mounted content element. */
    readonly content: string;
  };
}

/** Guarded API consumed by Ark's provider without exposing transitive implementation types. */
export interface DrawerRuntime extends QuireKitDrawerRootApi {
  /** Existing Ark API with only close request entries adapted. */
  readonly api: UseDrawerReturn;
}

/** Host-owned values consumed by the synchronous close boundary. */
export interface DrawerCloseBoundaryOptions {
  /** @returns Whether the current task remains open. */
  isOpen(): boolean;
  /** Delivers the one cancelable request before updating any state. @param request - Close intent. */
  notify(request: QuireKitDrawerCloseRequest): void;
  /** Commits the accepted close through the adapter's public model events. */
  close(): void;
}

/** Internal interaction contract shared by the root and its parts. */
export interface DrawerInteractionContext {
  /** Effective drag policy after explicit and cancelable-task guards. */
  readonly dragEnabled: ComputedRef<boolean>;
  /** @param reason - Originating close entry. @returns Whether this request was accepted. */
  requestClose(reason?: QuireKitDrawerCloseReason): boolean;
}

/** Public events forwarded by the Drawer behavior adapter. */
export interface DrawerRuntimeEvents {
  /** @param open - Requested model value. */
  updateOpen(open: boolean): void;
  /** @param open - Accepted transition request. */
  openChange(open: boolean): void;
  /** @param request - Cancelable close intent. */
  closeRequest(request: QuireKitDrawerCloseRequest): void;
  /** @param details - New snap point from Ark. */
  snapPointChange(details: DrawerSnapPointChangeDetails): void;
  /** @param details - Active trigger from Ark. */
  triggerValueChange(details: DrawerTriggerValueChangeDetails): void;
}

/** Drawer 固定结构、面板尺寸与 Portal 的公开属性。 */
export interface DrawerContentProps {
  /** 可访问且始终可见的面板标题。 */
  readonly title: string;
  /** 标题下的可选说明。 */
  readonly description?: string;
  /** 面板宽度档位。 */
  readonly size?: QuireKitDrawerSize;
  /** 是否允许正文拖拽；侧面默认允许，底部默认只允许手柄。 */
  readonly draggable?: boolean | undefined;
  /** 是否显示拖拽手柄；底部默认显示，有关闭守卫时始终隐藏。 */
  readonly showGrabber?: boolean | undefined;
  /** 是否显示覆盖页面的背景遮罩。 */
  readonly showBackdrop?: boolean;
  /** Portal 目标元素或选择器。 */
  readonly portalTarget?: string | HTMLElement;
  /** 是否把模态层传送到 Portal 目标。 */
  readonly portalled?: boolean;
  /** 是否显示标题区关闭按钮。 */
  readonly showClose?: boolean;
}

/** Private layout hooks consumed only by task surface templates. */
export interface DrawerContentFrameProps extends DrawerContentProps {
  /** Retain exit animation without admitting stale task interactions. */
  readonly contentInert?: boolean;
  /** Classes placed directly on the existing Ark Content element. */
  readonly contentClass?: HTMLAttributes["class"];
  /** Geometry styles placed directly on the existing Ark Content element. */
  readonly contentStyle?: StyleValue;
  /** Owned composite body spacing without adding another scroll container. */
  readonly bodyStyle?: StyleValue;
}
