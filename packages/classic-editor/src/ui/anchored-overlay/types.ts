import type { CSSProperties, VNodeChild } from "vue";

/** A semantic target fragment or clipping boundary in CSS pixels. */
export interface ClassicEditorOverlayRect {
  /** Horizontal origin. */
  readonly x: number;
  /** Vertical origin. */
  readonly y: number;
  /** Horizontal extent. */
  readonly width: number;
  /** Vertical extent. */
  readonly height: number;
}

/** A point in viewport CSS pixels supplied by one semantic editor target. */
export interface ClassicEditorAnchoredOverlayAnchor {
  /** Horizontal viewport coordinate. */
  readonly x: number;
  /** Vertical viewport coordinate. */
  readonly y: number;
  /** Complete target fragments in the same coordinate space; omitted for point anchors. */
  readonly rects?: readonly ClassicEditorOverlayRect[] | undefined;
}

/** Pure placement inputs, all in viewport CSS pixels. */
export interface ClassicEditorOverlayBoundaryInput {
  /** Current semantic point and complete target fragments. */
  readonly anchor: ClassicEditorAnchoredOverlayAnchor;
  /** Preferred side, or an already resolved top-left position. */
  readonly placement: ClassicEditorAnchoredOverlayPlacement;
  /** Workspace client area intersected with the browser viewport. */
  readonly boundary: ClassicEditorOverlayRect;
  /** Actual visible surface dimensions. */
  readonly surface: Pick<ClassicEditorOverlayRect, "width" | "height">;
}

/** Reactive inputs shared by document toolbars and contextual cards. */
export interface ClassicEditorOverlayPositionSources {
  /** Current product root. */
  readonly root: () => HTMLElement;
  /** Current product document-space host. */
  readonly host: () => HTMLElement | null;
  /** Retained semantic anchor in host-local document coordinates. */
  readonly anchor: () => ClassicEditorAnchoredOverlayAnchor;
  /** Requested placement around the target. */
  readonly placement: () => ClassicEditorAnchoredOverlayPlacement;
  /** Effective surface visibility, independent of clipping. */
  readonly visible: () => boolean;
  /** Stable surface ownership marker. */
  readonly ownerId: string;
  /** Updates semantic geometry after a workspace size change, never after scrolling. */
  readonly refreshAnchor: () => unknown;
}

/** Logical alignment of an anchored overlay around its semantic point. */
export type ClassicEditorAnchoredOverlayPlacement =
  | "exact"
  | "top"
  | "top-start"
  | "top-end"
  | "right"
  | "right-start"
  | "right-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end";

/** Controlled inputs for a headless document-overlay anchor. */
export interface ClassicEditorAnchoredOverlayProps {
  /** Whether the consumer requests the anchored content to be visible. */
  readonly show: boolean;
  /** Current viewport anchor, or null when the semantic target is unavailable. */
  readonly anchor: ClassicEditorAnchoredOverlayAnchor | null;
  /** Resolves current geometry when the semantic target may have changed. */
  readonly resolveAnchor?:
    (() => ClassicEditorAnchoredOverlayAnchor | null) | undefined;
  /** Mounted Classic Editor root that owns the document overlay host. */
  readonly editorRoot: HTMLElement;
  /** Diagnostic identity used by the shared overlay coordinator. */
  readonly overlayFamily?: string | undefined;
  /** Logical placement around the projected document-space point. */
  readonly placement?: ClassicEditorAnchoredOverlayPlacement | undefined;
  /** Selection-driven surface whose child popups, not the surface itself, own transient dismissal. */
  readonly persistent?: boolean | undefined;
}

/** Infrastructure passed to the single visible surface rendered by the caller. */
export interface ClassicEditorAnchoredOverlayScope {
  /** Shared ownership marker for nested overlay coordination. */
  readonly ownerAttributes: Readonly<Record<"data-qk-classic-overlay", string>>;
  /** Absolute document-space positioning applied to the visible public surface. */
  readonly style: CSSProperties;
  /** Product document-overlay host for any nested menus or pickers. */
  readonly portalTarget: HTMLElement;
  /** Closes the current anchored overlay. */
  readonly close: () => void;
}

/** Slots exposed by the headless anchored overlay. */
export interface ClassicEditorAnchoredOverlaySlots {
  /** Renders exactly one public Toolbar, Card, or other semantic surface. */
  readonly default?:
    ((scope: ClassicEditorAnchoredOverlayScope) => VNodeChild) | undefined;
}
