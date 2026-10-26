import type { VNodeChild } from "vue";

/** One stable action rendered by the shared command-menu recipe. */
export interface QuireKitCommandListItem {
  /** Stable feature-owned identity emitted on activation. */
  readonly key: string;
  /** Localized visible and accessible row label. */
  readonly label: string;
  /** 相邻的相同分组只显示一次标题；不加入键盘停靠点。 */
  readonly group?: string;
  /** 命令的简短辅助说明，不进入主标签或键盘查找。 */
  readonly description?: string;
  /** Whether the command is currently unavailable. */
  readonly disabled?: boolean | undefined;
  /** Optional radio state; omission renders an ordinary menu item. */
  readonly checked?: boolean | undefined;
  /** Whether a semantic divider precedes this command. */
  readonly separatorBefore?: boolean | undefined;
}

/** Public inputs for one linear command menu. */
export interface QuireKitCommandListProps {
  /** Accessible name for the complete command menu. */
  readonly label: string;
  /** Ordered feature-owned command declarations. */
  readonly items: readonly QuireKitCommandListItem[];
  /** Optional feature class applied to the public menu surface. */
  readonly surfaceClass?: string | undefined;
  /** Keep native focus on this input/editor; rows use virtual highlighting and aria-activedescendant. Forward owned keys through handleKeydown. */
  readonly focusOwner?: HTMLElement | null | undefined;
}

/** Public keyboard bridge for command lists whose input lives outside the surface. */
export interface QuireKitCommandListHandle {
  /** @param event - Native non-composing key event. @returns Whether navigation or activation was handled and default prevented. */
  handleKeydown(event: KeyboardEvent): boolean;
}

/** Slot state supplied for one shared command-menu row. */
export interface QuireKitCommandListItemSlotProps {
  /** Current stable command declaration. */
  readonly item: QuireKitCommandListItem;
  /** Zero-based position in the ordered menu. */
  readonly index: number;
}

/** Public slots for one linear command menu. */
export interface QuireKitCommandListSlots {
  /** Optional leading icon or state mark. */
  readonly leading?: (
    props: QuireKitCommandListItemSlotProps
  ) => VNodeChild;
  /** Optional trailing shortcut or disclosure mark. */
  readonly trailing?: (
    props: QuireKitCommandListItemSlotProps
  ) => VNodeChild;
}

/** Direction of roving focus through an inline command list. */
export type QuireKitCommandListMovement = "end" | "home" | "next" | "previous";
