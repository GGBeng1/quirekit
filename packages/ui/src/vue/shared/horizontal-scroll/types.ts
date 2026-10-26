import type { ComputedRef, ShallowRef } from "vue";

/** Reactive public options consumed by the horizontal viewport. */
export interface HorizontalScrollOptions {
  /** Existing visual owner; no keyboard role is introduced here. */
  readonly root: ShallowRef<HTMLElement | null>;
  /** Whether this owner currently requires horizontal overflow behavior. */
  readonly enabled: () => boolean;
  /** @param target - Candidate inside the viewport. @returns Whether this owner may reveal its focus. */
  readonly ownsFocus: (target: HTMLElement) => boolean;
  /** Explicit direction, falling back to the root's inherited CSS direction. */
  readonly direction: () => "ltr" | "rtl" | undefined;
}

/** DOM bindings for the horizontal strip's single horizontal viewport. */
export interface HorizontalScrollBindings {
  /** Native scroll container. */
  readonly viewport: ShallowRef<HTMLElement | null>;
  /** Intrinsic content row observed independently of the arrow buttons. */
  readonly content: ShallowRef<HTMLElement | null>;
  /** Whether horizontal scrolling is enabled. */
  readonly enabled: ComputedRef<boolean>;
  /** Whether intrinsic content exceeds the width available without arrow buttons. */
  readonly overflowing: ShallowRef<boolean>;
  /** Whether the previous logical screen is reachable. */
  readonly canPrevious: ShallowRef<boolean>;
  /** Whether the next logical screen is reachable. */
  readonly canNext: ShallowRef<boolean>;
  /** Current physical text direction for arrow presentation. */
  readonly rtl: ShallowRef<boolean>;
  /** @param step - Previous or next logical screen. */
  readonly scrollPage: (step: -1 | 1) => void;
  /** @param event - Native focus entering a real toolbar control. */
  readonly revealFocused: (event: FocusEvent) => void;
  /** @param event - Native wheel event offered to the viewport. */
  readonly handleWheel: (event: WheelEvent) => void;
  /** Reconciles edge state after native touch, trackpad, or programmatic scrolling. */
  readonly updateEdges: () => void;
}
