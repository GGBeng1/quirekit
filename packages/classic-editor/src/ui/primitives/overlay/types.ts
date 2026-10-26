/** Semantic family that owns one command-neutral overlay. */
export type ClassicPrimitiveOverlayOwner =
  | "dialog"
  | "inspector"
  | "menu"
  | "popover"
  | "task"
  | "tooltip"
  | "legacy";

/** Reason why an overlay leaves the stack. */
export type ClassicPrimitiveOverlayCloseReason =
  | "controlled-close"
  | "destroy"
  | "escape"
  | "outside-pointer"
  | "replaced"
  | "unmount";

/** DOM-compatible target whose modal state may be isolated. */
export interface ClassicPrimitiveOverlayIsolationTarget {
  /** Current browser inert property. */
  inert: boolean;
  /** Reads an accessibility attribute. */
  getAttribute(name: string): string | null;
  /** Writes an accessibility attribute. */
  setAttribute(name: string, value: string): void;
  /** Removes an accessibility attribute. */
  removeAttribute(name: string): void;
}

/** Explicit modal policy; callers select targets instead of deriving DOM ancestry. */
export interface ClassicPrimitiveOverlayModalPolicy {
  /** Existing sibling surfaces to make inert while this modal is open. */
  readonly isolationTargets: readonly ClassicPrimitiveOverlayIsolationTarget[];
}

/** One overlay registered in a root-local stack. */
export interface ClassicPrimitiveOverlayRegistration {
  /** Stable diagnostic identity. */
  readonly id: string;
  /** Per-editor root that owns the lifecycle. */
  readonly root: object;
  /** Typed semantic owner. */
  readonly owner: ClassicPrimitiveOverlayOwner;
  /** Optional parent overlay in the same root. */
  readonly parentId?: string | undefined;
  /** Larger values appear above peers at the same nesting depth. */
  readonly layerPriority?: number | undefined;
  /** Controlled close callback; it must not mutate the editor. */
  readonly close: (reason: ClassicPrimitiveOverlayCloseReason) => void;
  /** Reports whether a document event target belongs to this trigger or teleported content. */
  readonly containsTarget?: ((target: EventTarget | null) => boolean) | undefined;
  /** Restores focus to a supplied trigger or logical-selection policy. */
  readonly restoreFocus?: (() => void) | undefined;
  /** Whether a captured outside pointer may dismiss this overlay. */
  readonly dismissOnOutsidePointer?: (() => boolean) | undefined;
  /** Whether Escape may dismiss this overlay. */
  readonly dismissOnEscape?: (() => boolean) | undefined;
  /** Explicit modal isolation targets. */
  readonly modal?: ClassicPrimitiveOverlayModalPolicy | undefined;
}
