import type { QuireRect } from "@quirekit/renderer";
import type { QuireClientRect } from "@quirekit/view-engine";
import type { Node as PMNode } from "@quirekit/pm";
import type { QuireViewRenderResult } from "../../types";

/** Rectangle in viewport coordinates used by mounted view scrolling. */
export interface MountedViewScrollRect {
  /** Viewport-left coordinate. */
  readonly left: number;
  /** Viewport-right coordinate. */
  readonly right: number;
  /** Viewport-top coordinate. */
  readonly top: number;
  /** Viewport-bottom coordinate. */
  readonly bottom: number;
}

/** Insets accepted by ProseMirror scroll props. */
export type MountedViewScrollInset =
  | number
  | {
    /** Top inset in CSS pixels. */
    readonly top: number;
    /** Right inset in CSS pixels. */
    readonly right: number;
    /** Bottom inset in CSS pixels. */
    readonly bottom: number;
    /** Left inset in CSS pixels. */
    readonly left: number;
  };

/** Options for resolving a scroll rectangle from retained selection geometry. */
export interface MountedViewRetainedSelectionScrollRectOptions {
  /** Render result that owns retained selection geometry for the current state. */
  readonly renderResult: QuireViewRenderResult;
  /** Client-space rectangle for the backend coordinate surface. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds mapped onto the coordinate surface, when known. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/** Callback that resolves the current selection rectangle for default scrolling. */
export type MountedViewSelectionScrollRectResolver =
  () => MountedViewScrollRect | null;

/** Callback that resolves a document-position anchor rectangle for default scrolling. */
export type MountedViewPositionScrollRectResolver =
  (position: number) => MountedViewScrollRect | null;

/** Reading position kept on screen while content above the viewport changes. */
export interface MountedViewScrollAnchor {
  /** Frame document the position belongs to; the presented document while an overlay shows. */
  readonly doc: PMNode;
  /** Position at the start of the line at the top of the visible region. */
  readonly pos: number;
  /** Document-space top of that line. */
  readonly top: number;
}
