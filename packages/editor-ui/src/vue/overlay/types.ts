import type { Ref } from "vue";

/** A semantic target fragment or clipping boundary in CSS pixels. */
export interface EditorUIOverlayRect {
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
export interface EditorUIAnchoredOverlayAnchor {
  /** Horizontal viewport coordinate. */
  readonly x: number;
  /** Vertical viewport coordinate. */
  readonly y: number;
  /** Complete target fragments in the same coordinate space; omitted for point anchors. */
  readonly rects?: readonly EditorUIOverlayRect[] | undefined;
}

/** Pure placement inputs, all in viewport CSS pixels. */
export interface EditorUIOverlayBoundaryInput {
  /** Current semantic point and complete target fragments. */
  readonly anchor: EditorUIAnchoredOverlayAnchor;
  /** Preferred side, or an already resolved top-left position. */
  readonly placement: EditorUIAnchoredOverlayPlacement;
  /** Workspace client area intersected with the browser viewport. */
  readonly boundary: EditorUIOverlayRect;
  /** Actual visible surface dimensions. */
  readonly surface: Pick<EditorUIOverlayRect, "width" | "height">;
}

/** Reactive inputs shared by document toolbars and contextual cards. */
export interface EditorUIOverlayPositionSources {
  /** Current product root. */
  readonly root: () => HTMLElement;
  /** Current product document-space host. */
  readonly host: () => HTMLElement | null;
  /** Retained semantic anchor in host-local document coordinates. */
  readonly anchor: () => EditorUIAnchoredOverlayAnchor;
  /** Requested placement around the target. */
  readonly placement: () => EditorUIAnchoredOverlayPlacement;
  /** Effective surface visibility, independent of clipping. */
  readonly visible: () => boolean;
  /** Product scroll and clipping owner. */
  readonly viewport: () => HTMLElement;
  /** Resident surface, resolved after teleport. */
  readonly surface: () => HTMLElement | null;
  /** Updates semantic geometry after a workspace size change, never after scrolling. */
  readonly refreshAnchor: () => unknown;
}

/** Logical alignment of an anchored overlay around its semantic point. */
export type EditorUIAnchoredOverlayPlacement =
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

/** Product-owned document overlay and its scroll container. */
export interface EditorUIOverlayHost {
  /** Absolute positioning root inside document scroll content. */
  readonly host: Ref<HTMLElement | undefined>;
  /** Scroll and clipping owner. */
  readonly viewport: Ref<HTMLElement | undefined>;
}
